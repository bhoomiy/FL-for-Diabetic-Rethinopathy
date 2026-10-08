
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path

import torch

from models.mobilenet import DRMobileNetV2


PROJECT_ROOT = Path(__file__).resolve().parents[1]
REGISTRY_DIR = PROJECT_ROOT / "results" / "async_fl"
METADATA_PATH = REGISTRY_DIR / "metadata.json"


def initialize_registry(checkpoint_path):
    checkpoint_path = Path(checkpoint_path).resolve()

    if not checkpoint_path.is_file():
        raise FileNotFoundError(
            f"Checkpoint not found: {checkpoint_path}"
        )

    REGISTRY_DIR.mkdir(parents=True, exist_ok=True)

    if METADATA_PATH.exists():
        raise RuntimeError(
            "Asynchronous registry already initialized. "
            "Existing model will not be overwritten."
        )

    state_dict = torch.load(
        checkpoint_path,
        map_location="cpu",
        weights_only=True,
    )

    model = DRMobileNetV2(
        num_classes=5,
        freeze_features=True,
        pretrained=False,
    )

    model.load_state_dict(state_dict, strict=True)

    for name, tensor in state_dict.items():
        if (
            torch.is_floating_point(tensor)
            and not torch.isfinite(tensor).all()
        ):
            raise ValueError(
                f"Non-finite parameters found: {name}"
            )

    destination = REGISTRY_DIR / "global_v0.pth"

    if destination.exists():
        raise RuntimeError(
            "global_v0.pth already exists; refusing to overwrite."
        )

    shutil.copy2(checkpoint_path, destination)

    metadata = {
        "version": 0,
        "checkpoint": destination.name,
        "source_checkpoint": str(checkpoint_path),
        "created_at": datetime.now(
            timezone.utc
        ).isoformat(),
        "status": "initialized",
    }

    temporary_path = METADATA_PATH.with_suffix(".tmp")

    try:
        with open(temporary_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        os.replace(temporary_path, METADATA_PATH)
    except Exception:
        temporary_path.unlink(missing_ok=True)
        raise

    return metadata


def get_model_info():
    if not METADATA_PATH.exists():
        raise RuntimeError(
            "Asynchronous model registry is not initialized."
        )

    with open(METADATA_PATH, "r", encoding="utf-8") as f:
        metadata = json.load(f)

    checkpoint_path = (
        REGISTRY_DIR / metadata["checkpoint"]
    )

    if not checkpoint_path.is_file():
        raise FileNotFoundError(
            f"Registered checkpoint missing: {checkpoint_path}"
        )

    return metadata, checkpoint_path
