import torch

from fl.server import FLServer


# ==========================================================
# SETTINGS
# ==========================================================

NUM_CLIENTS = 4
ROUNDS = 5
LOCAL_EPOCHS = 1

# Full client datasets
MAX_BATCHES = None

# FedProx
MU = 0.01

# Non-IID clients
CLIENT_FOLDER = "clients_non_iid"


# ==========================================================
# START
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
    f"Algorithm         : FedProx"
)

print(
    f"Mu (μ)            : {MU}"
)


# ==========================================================
# SERVER
# ==========================================================

server = FLServer(
    num_clients=NUM_CLIENTS,
    local_epochs=LOCAL_EPOCHS,
    max_batches=MAX_BATCHES,
    class_weights=None,
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
        f"FEDERATED ROUND {round_number}/{ROUNDS}"
    )
    print("=" * 60)

    (
        global_model,
        train_loss,
        train_accuracy
    ) = server.train_round()

    # ------------------------------------------------------
    # Save FedProx global model
    # ------------------------------------------------------

    model_path = (
        f"global_model_non_iid_fedprox_round_"
        f"{round_number}.pth"
    )

    torch.save(
        global_model.state_dict(),
        model_path
    )

    print(
        f"\nGlobal model saved: {model_path}"
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
print("NON-IID FEDPROX TRAINING COMPLETE")
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