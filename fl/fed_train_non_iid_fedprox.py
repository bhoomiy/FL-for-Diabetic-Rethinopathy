import torch
import pandas as pd
import numpy as np

from sklearn.utils.class_weight import compute_class_weight

from fl.server import FLServer


# ==========================================================
# SETTINGS
# ==========================================================

NUM_CLIENTS = 4
ROUNDS = 5
LOCAL_EPOCHS = 1

# Use the complete client datasets
MAX_BATCHES = None

# FedProx strength
MU = 0.01

# Non-IID clients
CLIENT_FOLDER = "clients_non_iid"

# Number of DR classes
NUM_CLASSES = 5


# ==========================================================
# DEVICE
# ==========================================================

device = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)


# ==========================================================
# CLASS WEIGHTS
# ==========================================================

# Use the complete training CSV to calculate
# one common set of class weights for all clients.

TRAIN_CSV = "datasets/train_1.csv"

train_df = pd.read_csv(TRAIN_CSV)

class_weights = compute_class_weight(
    class_weight="balanced",
    classes=np.arange(NUM_CLASSES),
    y=train_df["diagnosis"]
)

class_weights = torch.tensor(
    class_weights,
    dtype=torch.float32
)


# ==========================================================
# DISPLAY SETTINGS
# ==========================================================

print("=" * 60)
print("FEDERATED LEARNING - NON-IID FEDPROX")
print("=" * 60)

print(
    f"Number of clients : {NUM_CLIENTS}"
)

print(
    f"Number of rounds  : {ROUNDS}"
)

print(
    f"Local epochs      : {LOCAL_EPOCHS}"
)

print(
    f"Max batches       : {MAX_BATCHES}"
)

print(
    f"Client folder     : {CLIENT_FOLDER}"
)

print(
    "Algorithm         : FedProx"
)

print(
    f"Mu (μ)            : {MU}"
)

print(
    f"Device            : {device}"
)

print(
    "\nClass weights:"
)

for class_id, weight in enumerate(class_weights):

    print(
        f"Class {class_id}: "
        f"{weight.item():.4f}"
    )


# ==========================================================
# SERVER
# ==========================================================

server = FLServer(
    num_clients=NUM_CLIENTS,
    local_epochs=LOCAL_EPOCHS,
    max_batches=MAX_BATCHES,
    class_weights=class_weights,
    mu=MU,
    client_folder=CLIENT_FOLDER
)


# ==========================================================
# FEDERATED TRAINING
# ==========================================================

round_results = []


for round_number in range(
    1,
    ROUNDS + 1
):

    print("\n")
    print("=" * 60)
    print(
        f"FEDERATED ROUND "
        f"{round_number}/{ROUNDS}"
    )
    print("=" * 60)

    (
        global_model,
        train_loss,
        train_accuracy
    ) = server.train_round()

    # ------------------------------------------------------
    # Save global model
    # ------------------------------------------------------

    model_path = (
        f"global_model_non_iid_fedprox_weighted_round_"
        f"{round_number}.pth"
    )

    torch.save(
        global_model.state_dict(),
        model_path
    )

    print(
        f"\nGlobal model saved: "
        f"{model_path}"
    )

    # ------------------------------------------------------
    # Store results
    # ------------------------------------------------------

    round_results.append(
        (
            round_number,
            train_loss,
            train_accuracy
        )
    )


# ==========================================================
# FINAL SUMMARY
# ==========================================================

print("\n")
print("=" * 60)
print(
    "NON-IID WEIGHTED FEDPROX "
    "TRAINING COMPLETE"
)
print("=" * 60)

print("\nRound Results:")

for (
    round_number,
    train_loss,
    train_accuracy
) in round_results:

    print(
        f"Round {round_number}: "
        f"Loss = {train_loss:.4f}, "
        f"Accuracy = {train_accuracy:.2f}%"
    )