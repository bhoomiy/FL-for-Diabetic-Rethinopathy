import torch
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

from models.mobilenet import DRMobileNetV2
from datasets.preprocess import get_dataloaders


from sklearn.metrics import f1_score


def evaluate_model_metrics(model_path, batch_size=32):
    """
    Evaluate a saved MobileNetV2 checkpoint on the
    central validation dataset.

    Returns accuracy and macro F1 as values between 0 and 1.
    """
    device = torch.device(
        "cuda" if torch.cuda.is_available() else "cpu"
    )

    _, val_loader = get_dataloaders(batch_size=batch_size)

    model = DRMobileNetV2(
        num_classes=5,
        freeze_features=True,
        pretrained=False,
    ).to(device)

    state_dict = torch.load(
        model_path,
        map_location=device,
        weights_only=True,
    )

    model.load_state_dict(state_dict, strict=True)
    model.eval()

    all_labels = []
    all_predictions = []

    with torch.inference_mode():
        for images, labels in val_loader:
            images = images.to(device)

            outputs = model(images)
            predictions = outputs.argmax(dim=1).cpu()

            all_predictions.extend(predictions.tolist())
            all_labels.extend(labels.tolist())

    if not all_labels:
        raise RuntimeError("Validation dataset is empty.")

    accuracy = accuracy_score(
        all_labels,
        all_predictions,
    )

    macro_f1 = f1_score(
        all_labels,
        all_predictions,
        labels=[0, 1, 2, 3, 4],
        average="macro",
        zero_division=0,
    )

    return {
        "accuracy": float(accuracy),
        "macro_f1": float(macro_f1),
        "validation_samples": len(all_labels),
    }



def evaluate_model(model_path):

    # Device
    device = torch.device(
        "cuda" if torch.cuda.is_available() else "cpu"
    )

    print("Device:", device)

    # Load validation data
    _, val_loader = get_dataloaders(batch_size=32)

    # Create model
    model = DRMobileNetV2(
        num_classes=5,
        freeze_features=True
    ).to(device)

    # Load global model
    model.load_state_dict(
        torch.load(
            model_path,
            map_location=device
        )
    )

    model.eval()

    all_labels = []
    all_predictions = []

    with torch.no_grad():

        for images, labels in val_loader:

            images = images.to(device)

            outputs = model(images)

            predictions = outputs.argmax(
                dim=1
            ).cpu()

            all_predictions.extend(
                predictions.tolist()
            )

            all_labels.extend(
                labels.tolist()
            )

    # Accuracy
    accuracy = accuracy_score(
        all_labels,
        all_predictions
    )

    print("\nValidation Accuracy:")
    print(f"{accuracy * 100:.2f}%")

    # Classification report
    print("\nClassification Report:")
    print(
        classification_report(
            all_labels,
            all_predictions,
            digits=4
        )
    )

    # Confusion matrix
    print("\nConfusion Matrix:")

    cm = confusion_matrix(
        all_labels,
        all_predictions
    )

    print(cm)


if __name__ == "__main__":

    evaluate_model(
        "global_model_round_3.pth"
    )