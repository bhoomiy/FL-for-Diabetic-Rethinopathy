import torch
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.metrics import (
    accuracy_score,precision_score,recall_score,f1_score,confusion_matrix,classification_report
)

from models.mobilenet import DRMobileNetV2
from datasets.preprocess import get_dataloaders

# Device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Load Validation Data
_, val_loader = get_dataloaders(batch_size=32)


# Load Model
model = DRMobileNetV2(
    num_classes=5,
    freeze_features=False
)

model.load_state_dict(
    torch.load(
        "best_model.pth",
        map_location=device
    )
)

model.to(device)
model.eval()


# Prediction
true_labels = []
pred_labels = []

with torch.no_grad():
    for images, labels in val_loader:
        images = images.to(device)
        outputs = model(images)
        _, predicted = torch.max(outputs, 1)
        true_labels.extend(labels.numpy())
        pred_labels.extend(predicted.cpu().numpy())


# Metrics
accuracy = accuracy_score(true_labels, pred_labels)
precision = precision_score(true_labels,pred_labels,average="weighted")
recall = recall_score(true_labels,pred_labels,average="weighted")
f1 = f1_score(true_labels,pred_labels,average="weighted")

print("=" * 50)

print(f"Accuracy  : {accuracy:.4f}")
print(f"Precision : {precision:.4f}")
print(f"Recall    : {recall:.4f}")
print(f"F1 Score  : {f1:.4f}")
print("=" * 50)

# Classification Report
class_names = [
    "No DR",
    "Mild",
    "Moderate",
    "Severe",
    "Proliferative"
]

print("\nClassification Report\n")

print(
    classification_report(
        true_labels,
        pred_labels,
        target_names=class_names
    )
)


# Confusion Matrix
cm = confusion_matrix(
    true_labels,
    pred_labels
)

plt.figure(figsize=(8,6))

sns.heatmap(
    cm,
    annot=True,
    fmt="d",
    cmap="Blues",
    xticklabels=class_names,
    yticklabels=class_names
)

plt.xlabel("Predicted")
plt.ylabel("Actual")
plt.title("Confusion Matrix")

plt.tight_layout()

plt.savefig("confusion_matrix.png")

plt.show()