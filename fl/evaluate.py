import torch
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

from models.mobilenet import DRMobileNetV2
from datasets.preprocess import get_dataloaders


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