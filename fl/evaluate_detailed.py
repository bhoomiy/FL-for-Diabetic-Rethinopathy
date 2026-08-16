import torch
import matplotlib.pyplot as plt
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)

from models.mobilenet import DRMobileNetV2
from datasets.preprocess import get_dataloaders


# ==========================================
# Settings
# ==========================================

MODEL_PATH = "global_model_non_iid_fedprox_weighted_round_5.pth"

CLASS_NAMES = [
    "No DR",
    "Mild",
    "Moderate",
    "Severe",
    "Proliferative DR"
]


# ==========================================
# Evaluation
# ==========================================

def main():

    device = torch.device(
        "cuda" if torch.cuda.is_available()
        else "cpu"
    )

    print("Device:", device)

    # ------------------------------------------
    # Validation data
    # ------------------------------------------

    _, val_loader = get_dataloaders(
        batch_size=32
    )

    # ------------------------------------------
    # Model
    # ------------------------------------------

    model = DRMobileNetV2(
        num_classes=5,
        freeze_features=True
    ).to(device)

    model.load_state_dict(
        torch.load(
            MODEL_PATH,
            map_location=device
        )
    )

    model.eval()

    # ------------------------------------------
    # Predictions
    # ------------------------------------------

    all_labels = []
    all_predictions = []

    with torch.no_grad():

        for images, labels in val_loader:

            images = images.to(device)

            outputs = model(images)

            predictions = (
                outputs.argmax(dim=1)
                .cpu()
            )

            all_predictions.extend(
                predictions.tolist()
            )

            all_labels.extend(
                labels.tolist()
            )

    # ------------------------------------------
    # Accuracy
    # ------------------------------------------

    accuracy = accuracy_score(
        all_labels,
        all_predictions
    )

    print("\n==========================================")
    print("FINAL GLOBAL MODEL EVALUATION")
    print("==========================================")

    print(
        f"\nAccuracy: {accuracy * 100:.2f}%"
    )

    # ------------------------------------------
    # Classification report
    # ------------------------------------------

    print("\nClassification Report:")

    print(
        classification_report(
            all_labels,
            all_predictions,
            target_names=CLASS_NAMES,
            digits=4,
            zero_division=0
        )
    )

    # ------------------------------------------
    # Confusion matrix
    # ------------------------------------------

    cm = confusion_matrix(
        all_labels,
        all_predictions
    )

    print("\nConfusion Matrix:")
    print(cm)

    # ------------------------------------------
    # Plot confusion matrix
    # ------------------------------------------

    plt.figure(
        figsize=(8, 6)
    )

    plt.imshow(cm)

    plt.title(
        "Confusion Matrix - Federated Global Model"
    )

    plt.colorbar()

    plt.xticks(
        range(5),
        CLASS_NAMES,
        rotation=45,
        ha="right"
    )

    plt.yticks(
        range(5),
        CLASS_NAMES
    )

    plt.xlabel(
        "Predicted Label"
    )

    plt.ylabel(
        "True Label"
    )

    # Write values inside cells
    for i in range(5):

        for j in range(5):

            plt.text(
                j,
                i,
                cm[i, j],
                ha="center",
                va="center"
            )

    plt.tight_layout()

    plt.savefig(
        "confusion_matrix_fl.png",
        dpi=300
    )

    plt.close()

    print(
        "\nConfusion matrix saved as:"
    )

    print(
        "confusion_matrix_fl.png"
    )


if __name__ == "__main__":
    main()