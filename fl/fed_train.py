import torch

from sklearn.metrics import (
    accuracy_score,
    classification_report
)

from fl.server import FLServer
from datasets.preprocess import get_dataloaders


# ==========================================
# Federated Learning Configuration
# ==========================================

NUM_CLIENTS = 4

NUM_ROUNDS = 3

LOCAL_EPOCHS = 1

BATCH_SIZE = 32

# None = use the ENTIRE client dataset
MAX_BATCHES = None


# ==========================================
# Global Validation
# ==========================================

def evaluate_global_model(
    model,
    val_loader,
    device
):

    model.eval()

    all_labels = []
    all_predictions = []

    with torch.no_grad():

        for images, labels in val_loader:

            images = images.to(device)

            outputs = model(images)

            predictions = (
                outputs.argmax(
                    dim=1
                )
                .cpu()
            )

            all_predictions.extend(
                predictions.tolist()
            )

            all_labels.extend(
                labels.tolist()
            )

    accuracy = accuracy_score(
        all_labels,
        all_predictions
    )

    print(
        f"\nGlobal Validation Accuracy: "
        f"{accuracy * 100:.2f}%"
    )

    print(
        "\nClassification Report:"
    )

    print(
        classification_report(
            all_labels,
            all_predictions,
            digits=4,
            zero_division=0
        )
    )

    return accuracy


# ==========================================
# Main
# ==========================================

def main():

    print("=" * 60)
    print("FEDERATED LEARNING")
    print("=" * 60)

    print(
        f"Number of clients : {NUM_CLIENTS}"
    )

    print(
        f"Number of rounds  : {NUM_ROUNDS}"
    )

    print(
        f"Local epochs      : {LOCAL_EPOCHS}"
    )

    print(
        f"Batch size        : {BATCH_SIZE}"
    )

    print(
        f"Max batches       : {MAX_BATCHES}"
    )

    # ==========================================
    # Validation Data
    # ==========================================

    _, val_loader = get_dataloaders(
        batch_size=BATCH_SIZE
    )

    # ==========================================
    # Create Server
    # ==========================================

    server = FLServer(
        num_clients=NUM_CLIENTS,
        local_epochs=LOCAL_EPOCHS,
        max_batches=MAX_BATCHES
    )

    # ==========================================
    # Show Client Sizes
    # ==========================================

    print(
        "\nClient dataset sizes:"
    )

    for client in server.clients:

        print(
            f"Client {client.client_id}: "
            f"{len(client.dataset)} images"
        )

    # ==========================================
    # Federated Rounds
    # ==========================================

    validation_results = []

    for round_number in range(
        1,
        NUM_ROUNDS + 1
    ):

        print("\n")

        print("=" * 60)

        print(
            f"FEDERATED ROUND "
            f"{round_number}/{NUM_ROUNDS}"
        )

        print("=" * 60)

        # Train clients + FedAvg
        server.train_round()

        # ==========================================
        # Validate Global Model
        # ==========================================

        accuracy = evaluate_global_model(
            server.global_model,
            val_loader,
            server.device
        )

        validation_results.append(
            accuracy
        )

        # ==========================================
        # Save Global Model
        # ==========================================

        model_path = (
            f"global_model_round_"
            f"{round_number}.pth"
        )

        torch.save(
            server.global_model.state_dict(),
            model_path
        )

        print(
            f"\nGlobal model saved: "
            f"{model_path}"
        )

    # ==========================================
    # Final Results
    # ==========================================

    print("\n")
    print("=" * 60)
    print("FEDERATED LEARNING RESULTS")
    print("=" * 60)

    for i, accuracy in enumerate(
        validation_results,
        start=1
    ):

        print(
            f"Round {i}: "
            f"{accuracy * 100:.2f}%"
        )

    print(
        "\nFederated Learning completed."
    )


# ==========================================
# Run
# ==========================================

if __name__ == "__main__":
    main()