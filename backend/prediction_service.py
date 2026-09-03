from pathlib import Path

import torch
from PIL import Image
from torchvision import transforms

from models.mobilenet import DRMobileNetV2


BASE_DIR = Path(__file__).resolve().parent.parent

EXPERIMENTS_DIR = (
    BASE_DIR
    / "results"
    / "experiments"
)


CLASS_NAMES = [
    "No DR",
    "Mild",
    "Moderate",
    "Severe",
    "Proliferative DR"
]


CLASS_KEYS = [
    "no_dr",
    "mild",
    "moderate",
    "severe",
    "proliferative"
]


prediction_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


def get_latest_model():

    experiment_folders = [
        folder
        for folder in EXPERIMENTS_DIR.iterdir()
        if folder.is_dir()
        and (folder / "best_global_model.pth").exists()
    ]

    if not experiment_folders:
        raise FileNotFoundError(
            "No trained global model was found."
        )

    latest_experiment = max(
        experiment_folders,
        key=lambda folder: folder.name
    )

    checkpoint_path = (
        latest_experiment
        / "best_global_model.pth"
    )

    return latest_experiment.name, checkpoint_path


def predict_retinal_image(image):

    device = torch.device(
        "cuda"
        if torch.cuda.is_available()
        else "cpu"
    )

    experiment_id, checkpoint_path = (
        get_latest_model()
    )

    model = DRMobileNetV2(
        num_classes=5,
        freeze_features=True
    ).to(device)

    state_dict = torch.load(
        checkpoint_path,
        map_location=device
    )

    model.load_state_dict(state_dict)

    model.eval()

    image = image.convert("RGB")

    image_tensor = (
        prediction_transform(image)
        .unsqueeze(0)
        .to(device)
    )

    with torch.no_grad():

        outputs = model(image_tensor)

        probabilities = torch.softmax(
            outputs,
            dim=1
        )[0]

    predicted_index = int(
        torch.argmax(probabilities).item()
    )

    confidence = float(
        probabilities[predicted_index].item()
    )

    probability_results = []

    for index in range(len(CLASS_NAMES)):

        probability_results.append({
            "key": CLASS_KEYS[index],
            "label": CLASS_NAMES[index],
            "probability": float(
                probabilities[index].item()
            )
        })

    return {
        "predictedClass":
            CLASS_NAMES[predicted_index],

        "confidence":
            confidence,

        "modelVersion":
            experiment_id,

        "probabilities":
            probability_results
    }