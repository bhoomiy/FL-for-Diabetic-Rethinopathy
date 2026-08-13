import torch
import torch.nn as nn
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.utils.class_weight import compute_class_weight
import numpy as np

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report
)

from fl.server import FLServer
from datasets.preprocess import get_dataloaders


# ==========================================
# Federated Learning Configuration
# ==========================================

NUM_CLIENTS = 4

NUM_ROUNDS = 5

LOCAL_EPOCHS = 1

BATCH_SIZE = 32

# None = use the ENTIRE client dataset
MAX_BATCHES = None

MU = 0.01

# ==========================================
# Global Validation
# ==========================================

def evaluate_global_model(
    model,
    val_loader,
    device
):

    model.eval()

    criterion = nn.CrossEntropyLoss()

    total_loss = 0.0
    total_samples = 0

    all_labels = []
    all_predictions = []

    with torch.no_grad():

        for images, labels in val_loader:

            images = images.to(device)
            labels = labels.to(device)

            outputs = model(images)

            loss = criterion(
                outputs,
                labels
            )

            predictions = outputs.argmax(
                dim=1
            )

            batch_size = labels.size(0)

            total_loss += (
                loss.item() * batch_size
            )

            total_samples += batch_size

            all_predictions.extend(
                predictions.cpu().tolist()
            )

            all_labels.extend(
                labels.cpu().tolist()
            )

    # ==========================================
    # Validation Loss
    # ==========================================

    validation_loss = (
        total_loss / total_samples
    )

    # ==========================================
    # Metrics
    # ==========================================

    accuracy = accuracy_score(
        all_labels,
        all_predictions
    )

    precision = precision_score(
        all_labels,
        all_predictions,
        average="macro",
        zero_division=0
    )

    recall = recall_score(
        all_labels,
        all_predictions,
        average="macro",
        zero_division=0
    )

    macro_f1 = f1_score(
        all_labels,
        all_predictions,
        average="macro",
        zero_division=0
    )

    weighted_f1 = f1_score(
        all_labels,
        all_predictions,
        average="weighted",
        zero_division=0
    )

    print(
        f"\nValidation Loss: "
        f"{validation_loss:.4f}"
    )

    print(
        f"Validation Accuracy: "
        f"{accuracy * 100:.2f}%"
    )

    print(
        f"Macro Precision: "
        f"{precision:.4f}"
    )

    print(
        f"Macro Recall: "
        f"{recall:.4f}"
    )

    print(
        f"Macro F1: "
        f"{macro_f1:.4f}"
    )

    print(
        f"Weighted F1: "
        f"{weighted_f1:.4f}"
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

    return {
        "val_loss": validation_loss,
        "val_accuracy": accuracy * 100,
        "precision": precision,
        "recall": recall,
        "macro_f1": macro_f1,
        "weighted_f1": weighted_f1
    }

def calculate_class_weights():

    train_df = pd.read_csv(
        "datasets/train_1.csv"
    )

    classes = np.sort(
        train_df["diagnosis"].unique()
    )

    weights = compute_class_weight(
        class_weight="balanced",
        classes=classes,
        y=train_df["diagnosis"]
    )

    return torch.tensor(
        weights,
        dtype=torch.float32
    )

# ==========================================
# Main
# ==========================================

def main():

    print("=" * 60)
    print("FEDERATED LEARNING - IID FEDPROX")
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

    class_weights = calculate_class_weights()

    print("\nClass weights:")
    print(class_weights)

    # ==========================================
    # Create Server
    # ==========================================

    server = FLServer(
        num_clients=NUM_CLIENTS,
        local_epochs=LOCAL_EPOCHS,
        max_batches=MAX_BATCHES,
        class_weights=class_weights,
        mu=MU
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
    # Store Results
    # ==========================================

    results = []

    # ==========================================
    # Federated Rounds
    # ==========================================

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

        # ==========================================
        # Train Clients + FedAvg
        # ==========================================

        (
            global_model,
            train_loss,
            train_accuracy
        ) = server.train_round()

        # ==========================================
        # Validate Global Model
        # ==========================================

        metrics = evaluate_global_model(
            global_model,
            val_loader,
            server.device
        )

        # ==========================================
        # Store Round Results
        # ==========================================

        round_result = {
            "round": round_number,
            "train_loss": train_loss,
            "train_accuracy": train_accuracy,
            "val_loss": metrics["val_loss"],
            "val_accuracy": metrics["val_accuracy"],
            "precision": metrics["precision"],
            "recall": metrics["recall"],
            "macro_f1": metrics["macro_f1"],
            "weighted_f1": metrics["weighted_f1"]
        }

        results.append(
            round_result
        )

        # ==========================================
        # Save Global Model
        # ==========================================

        model_path = (
            f"fedprox_global_model_round_"
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

    # ==========================================
    # Create Results DataFrame
    # ==========================================

    results_df = pd.DataFrame(
        results
    )

    print("\n")
    print("=" * 60)
    print("FEDERATED LEARNING RESULTS")
    print("=" * 60)

    print(
        results_df.to_string(
            index=False
        )
    )

    # ==========================================
    # Save Results
    # ==========================================

    results_df.to_csv(
        "fedprox_iid_results.csv",
        index=False
    )

    print(
        "\nResults saved as "
        "fedprox_iid_results.csv"
    )

    # ==========================================
    # Plot 1 - Accuracy
    # ==========================================

    plt.figure(
        figsize=(8, 5)
    )

    plt.plot(
        results_df["round"],
        results_df["val_accuracy"],
        marker="o"
    )

    plt.xlabel(
        "Communication Round"
    )

    plt.ylabel(
        "Validation Accuracy (%)"
    )

    plt.title(
        "FedProx IID - Accuracy vs Communication Round"
    )

    plt.grid(True)

    plt.tight_layout()

    plt.savefig(
        "fedprox_iid_accuracy.png",
        dpi=300
    )

    plt.close()

    # ==========================================
    # Plot 2 - Loss
    # ==========================================

    plt.figure(
        figsize=(8, 5)
    )

    plt.plot(
        results_df["round"],
        results_df["val_loss"],
        marker="o"
    )

    plt.xlabel(
        "Communication Round"
    )

    plt.ylabel(
        "Validation Loss"
    )

    plt.title(
        "FedProx IID - Loss vs Communication Round"
    )

    plt.grid(True)

    plt.tight_layout()

    plt.savefig(
        "fedprox_iid_loss.png",
        dpi=300
    )

    plt.close()

    # ==========================================
    # Plot 3 - Macro F1
    # ==========================================

    plt.figure(
        figsize=(8, 5)
    )

    plt.plot(
        results_df["round"],
        results_df["macro_f1"],
        marker="o"
    )

    plt.xlabel(
        "Communication Round"
    )

    plt.ylabel(
        "Macro F1"
    )

    plt.title(
        "FedProx IID - Macro F1 vs Communication Round"
    )

    plt.grid(True)

    plt.tight_layout()

    plt.savefig(
        "fedprox_iid_f1.png",
        dpi=300
    )

    plt.close()

    print(
        "\nGraphs generated:"
    )

    print(
        "fedprox_iid_accuracy.png"
    )

    print(
        "fedprox_iid_loss.png"
    )

    print(
        "fedprox_iid_f1.png"
    )

    print(
        "\nFederated Learning completed."
    )


# ==========================================
# Run
# ==========================================

if __name__ == "__main__":
    main()