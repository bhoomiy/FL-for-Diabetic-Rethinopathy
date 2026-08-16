import torch
import pandas as pd

from fl.server import FLServer


# ==========================================================
# SETTINGS
# ==========================================================

NUM_CLIENTS = 4
ROUNDS = 5
LOCAL_EPOCHS = 1

# Use the complete client datasets
MAX_BATCHES = None

# FedAvg
MU = 0.0

# Non-IID clients
CLIENT_FOLDER = "clients_non_iid"

# Number of DR classes
NUM_CLASSES = 5

# Training CSV used to calculate global class weights
TRAIN_CSV = "datasets/train_1.csv"


# ==========================================================
# CALCULATE GLOBAL CLASS WEIGHTS
# ==========================================================

def calculate_class_weights():

    df = pd.read_csv(TRAIN_CSV)

    class_counts = (
        df["diagnosis"]
        .value_counts()
        .sort_index()
    )

    total_samples = len(df)

    weights = []

    for class_id in range(NUM_CLASSES):

        count = class_counts.get(
            class_id,
            0
        )

        if count == 0:
            raise ValueError(
                f"Class {class_id} has no samples "
                f"in the training dataset."
            )

        weight = (
            total_samples
            / (NUM_CLASSES * count)
        )

        weights.append(weight)

    return torch.tensor(
        weights,
        dtype=torch.float32
    )


# ==========================================================
# CALCULATE WEIGHTS
# ==========================================================

class_weights = calculate_class_weights()


# ==========================================================
# START
# ==========================================================

print("=" * 60)
print(
    "FEDERATED LEARNING - NON-IID FEDAVG "
    "WITH CLASS-WEIGHTED CROSSENTROPY"
)
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
    "Algorithm         : FedAvg"
)

print(
    "Loss              : "
    "Class-Weighted CrossEntropy"
)

print(
    f"Mu (μ)            : {MU}"
)


# ==========================================================
# DISPLAY CLASS DISTRIBUTION
# ==========================================================

train_df = pd.read_csv(TRAIN_CSV)

class_counts = (
    train_df["diagnosis"]
    .value_counts()
    .sort_index()
)

print("\nGlobal Training Class Distribution:")

for class_id in range(NUM_CLASSES):

    print(
        f"Class {class_id}: "
        f"{class_counts.get(class_id, 0)} samples"
    )


# ==========================================================
# DISPLAY CLASS WEIGHTS
# ==========================================================

print("\nClass Weights:")

for class_id, weight in enumerate(
    class_weights
):

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
# TRAINING
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
    # Save weighted FedAvg model
    # ------------------------------------------------------

    model_path = (
        f"global_model_non_iid_weighted_fedavg_round_"
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
# SUMMARY
# ==========================================================

print("\n")
print("=" * 60)
print(
    "NON-IID WEIGHTED FEDAVG TRAINING COMPLETE"
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