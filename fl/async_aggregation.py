
import hashlib
import json
import math
import os
import threading
import uuid
from datetime import datetime, timezone

import torch

from fl.async_registry import (
    REGISTRY_DIR,
    METADATA_PATH,
    get_model_info,
)
from fl.evaluate import evaluate_model_metrics
from models.mobilenet import DRMobileNetV2


AGGREGATION_LOCK = threading.Lock()
AUDIT_PATH = REGISTRY_DIR / "audit_log.jsonl"
RECEIPTS_DIR = REGISTRY_DIR / "receipts"

# Existing dataset has approximately 2930 training samples.
# This is a prototype weighting reference, not a trust guarantee.
REFERENCE_SAMPLES = 2930
MAX_ALPHA = 0.5


def atomic_json(path, data):
    temporary = path.with_name(
        f"{path.name}.{uuid.uuid4().hex}.tmp"
    )
    try:
        with open(temporary, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def checkpoint_hash(path):
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def append_audit(record):
    with open(AUDIT_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")
        f.flush()
        os.fsync(f.fileno())


def validate_state(state, reference):
    if not isinstance(state, dict):
        raise ValueError("Checkpoint must contain a state dictionary.")

    if state.keys() != reference.keys():
        raise ValueError("Model parameter keys do not match.")

    for name, tensor in state.items():
        expected = reference[name]

        if not isinstance(tensor, torch.Tensor):
            raise ValueError(f"Invalid tensor: {name}")

        if tensor.shape != expected.shape or tensor.dtype != expected.dtype:
            raise ValueError(f"Incompatible model parameter: {name}")

        if torch.is_floating_point(tensor):
            if not torch.isfinite(tensor).all():
                raise ValueError(f"Non-finite parameter: {name}")


def process_async_update(
    checkpoint_path,
    hospital_id,
    base_version,
    num_samples,
):
    hospital_id = int(hospital_id)
    base_version = int(base_version)
    num_samples = int(num_samples)

    if hospital_id not in range(1, 5):
        raise ValueError("Hospital ID must be between 1 and 4.")

    if base_version < 0:
        raise ValueError("Invalid base version.")

    if not 0 < num_samples <= REFERENCE_SAMPLES:
        raise ValueError("Invalid sample count.")

    if not AGGREGATION_LOCK.acquire(blocking=False):
        raise RuntimeError("Another submission is being processed.")

    try:
        REGISTRY_DIR.mkdir(parents=True, exist_ok=True)
        RECEIPTS_DIR.mkdir(parents=True, exist_ok=True)

        digest = checkpoint_hash(checkpoint_path)
        receipt_path = RECEIPTS_DIR / f"{digest}.json"

        # Repeated submission of exactly the same checkpoint.
        if receipt_path.exists():
            with open(receipt_path, "r", encoding="utf-8") as f:
                return json.load(f)

        metadata, current_path = get_model_info()
        current_version = int(metadata["version"])

        record = {
            "submission_id": uuid.uuid4().hex,
            "checkpoint_sha256": digest,
            "hospital_id": hospital_id,
            "base_version": base_version,
            "current_version": current_version,
            "num_samples": num_samples,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        def finalize(decision, new_version):
            record["decision"] = decision
            record["new_version"] = new_version
            atomic_json(receipt_path, record)
            append_audit(record)
            return record

        if base_version != current_version:
            return finalize("rejected_stale", current_version)

        local_state = torch.load(
            checkpoint_path,
            map_location="cpu",
            weights_only=True,
        )

        global_state = torch.load(
            current_path,
            map_location="cpu",
            weights_only=True,
        )

        reference_model = DRMobileNetV2(
            num_classes=5,
            freeze_features=True,
            pretrained=False,
        )

        reference = reference_model.state_dict()

        validate_state(local_state, reference)
        validate_state(global_state, reference)

        # Sample-based contribution with a capped influence.
        alpha = min(
            MAX_ALPHA,
            num_samples / REFERENCE_SAMPLES,
        )

        candidate_state = {}

        with torch.no_grad():
            for name, global_tensor in global_state.items():
                local_tensor = local_state[name]

                if torch.is_floating_point(global_tensor):
                    candidate_tensor = global_tensor + alpha * (
                        local_tensor - global_tensor
                    )

                    if not torch.isfinite(candidate_tensor).all():
                        raise ValueError(
                            f"Non-finite aggregated parameter: {name}"
                        )

                    candidate_state[name] = candidate_tensor
                else:
                    candidate_state[name] = global_tensor.clone()

        candidate_path = (
            REGISTRY_DIR / f"candidate_{record['submission_id']}.pth"
        )

        try:
            torch.save(candidate_state, candidate_path)

            baseline = evaluate_model_metrics(current_path)
            candidate = evaluate_model_metrics(candidate_path)

            if not all(
                math.isfinite(metrics[key])
                for metrics in (baseline, candidate)
                for key in ("accuracy", "macro_f1")
            ):
                raise ValueError("Non-finite validation metrics.")

            record["alpha"] = alpha
            record["baseline_metrics"] = baseline
            record["candidate_metrics"] = candidate

            if candidate["macro_f1"] <= baseline["macro_f1"]:
                return finalize(
                    "rejected_no_improvement",
                    current_version,
                )

            new_version = current_version + 1
            destination = REGISTRY_DIR / f"global_v{new_version}.pth"

            if destination.exists():
                raise RuntimeError(
                    "Next global checkpoint already exists. "
                    "Check registry consistency before retrying."
                )

            os.replace(candidate_path, destination)

            updated_metadata = dict(metadata)
            updated_metadata.update({
                "version": new_version,
                "checkpoint": destination.name,
                "created_at": datetime.now(
                    timezone.utc
                ).isoformat(),
                "status": "updated",
                "last_hospital_id": hospital_id,
            })

            atomic_json(METADATA_PATH, updated_metadata)

            return finalize("accepted", new_version)

        finally:
            candidate_path.unlink(missing_ok=True)

    finally:
        AGGREGATION_LOCK.release()
