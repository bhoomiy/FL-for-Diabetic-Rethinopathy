import requests
import torch

from models.mobilenet import DRMobileNetV2


print("=" * 60)
print("FedRetina Docker FL Round-Trip Test")
print("=" * 60)

# 1. Central server creates the global model
print("\n[Central] Creating global model...")

global_model = DRMobileNetV2(
    num_classes=5,
    freeze_features=True
)

global_model_path = "test_global_model.pth"

torch.save(
    global_model.state_dict(),
    global_model_path
)

print(f"[Central] Global model saved: {global_model_path}")


# 2. Send global model to Hospital 1
print("\n[Central] Sending global model to Hospital 1...")

with open(global_model_path, "rb") as model_file:
    response = requests.post(
        "http://localhost:5001/train",
        files={
            "model": (
                "global_model.pth",
                model_file,
                "application/octet-stream",
            )
        },
        timeout=300,
    )


# 3. Check response
if response.status_code != 200:
    print("\nERROR")
    print(f"Status code: {response.status_code}")
    print(response.text)
    raise SystemExit(1)


print("[Central] Hospital 1 completed local training.")


# 4. Read metrics returned by Hospital 1
hospital_id = response.headers.get("X-Hospital-ID")
num_samples = response.headers.get("X-Num-Samples")
train_loss = response.headers.get("X-Train-Loss")
train_accuracy = response.headers.get("X-Train-Accuracy")

print("\nTraining metrics:")
print(f"Hospital ID: {hospital_id}")
print(f"Samples: {num_samples}")
print(f"Loss: {train_loss}")
print(f"Accuracy: {train_accuracy}%")


# 5. Save the updated model returned by Hospital 1
updated_model_path = "hospital_1_update.pth"

with open(updated_model_path, "wb") as f:
    f.write(response.content)

print(f"\n[Central] Updated model saved: {updated_model_path}")


# 6. Verify returned weights are a valid PyTorch state_dict
updated_weights = torch.load(
    updated_model_path,
    map_location="cpu",
    weights_only=True,
)

verification_model = DRMobileNetV2(
    num_classes=5,
    freeze_features=True
)

verification_model.load_state_dict(updated_weights)

print("[Central] Returned model weights loaded successfully.")

print("\n" + "=" * 60)
print("DOCKER FEDERATED MODEL ROUND TRIP SUCCESSFUL")
print("=" * 60)