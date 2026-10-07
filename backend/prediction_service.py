from pathlib import Path

import torch
from PIL import Image
from torchvision import transforms

from models.mobilenet import DRMobileNetV2
from backend.gradcam import (
    GradCAM,
    create_gradcam_overlay,
    image_to_base64
)


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

    checkpoint_path = (
        BASE_DIR
        / "global_model_non_iid_fedprox_weighted_round_5.pth"
    )

    if not checkpoint_path.exists():
        raise FileNotFoundError(
            f"Trained global model not found at: {checkpoint_path}"
        )

    return "non_iid_fedprox_weighted_round_5", checkpoint_path

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
        freeze_features=False
    ).to(device)

    state_dict = torch.load(
        checkpoint_path,
        map_location=device
    )

    model.load_state_dict(state_dict)

    model.eval()

    image = image.convert("RGB")

    # Keep the original image for Grad-CAM overlay
    original_image = image.copy()

    image_tensor = (
        prediction_transform(image)
        .unsqueeze(0)
        .to(device)
    )

    # ---------------------------------------------------------
    # Prediction
    # ---------------------------------------------------------

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

    # ---------------------------------------------------------
    # Grad-CAM
    # ---------------------------------------------------------

    # MobileNetV2's final convolutional feature layer
    target_layer = model.model.features[-1]

    gradcam = GradCAM(
        model=model,
        target_layer=target_layer
    )

    try:

        cam = gradcam.generate(
            input_tensor=image_tensor,
            target_class=predicted_index
        )

        overlay = create_gradcam_overlay(
            original_image=original_image,
            cam=cam
        )

        gradcam_image = image_to_base64(
            overlay
        )

    finally:

        gradcam.close()

    # ---------------------------------------------------------
    # Class probabilities
    # ---------------------------------------------------------

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
            probability_results,

        "gradcam":
            gradcam_image
    }