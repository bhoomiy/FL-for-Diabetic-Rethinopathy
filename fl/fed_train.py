import torch
import torch.nn as nn
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.utils.class_weight import compute_class_weight
import numpy as np
import json
from pathlib import Path
from datetime import datetime

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

MU = 0.00

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
# Experiment Runner
# ==========================================

def run_experiment(
    distribution="iid",
    algorithm="fedavg",
    rounds=1,
    local_epochs=1,
    batch_size=32,
    learning_rate=0.0005,
    mu=0.01,
    use_class_weights=True,
    max_batches=2,
    test_run=True
):

    num_clients = 4
    distribution = distribution.lower()
    algorithm = algorithm.lower()

    if distribution == "iid":
        client_folder = "clients"
    elif distribution == "non_iid":
        client_folder = "clients_non_iid"
    else:
        raise ValueError("distribution must be 'iid' or 'non_iid'")

    if algorithm == "fedavg":
        experiment_mu = 0.0
    elif algorithm == "fedprox":
        if mu <= 0:
            raise ValueError("FedProx requires mu > 0")
        experiment_mu = mu
    else:
        raise ValueError("algorithm must be 'fedavg' or 'fedprox'")

    experiment_name = f"{algorithm}_{distribution}"
    base_dir = Path(__file__).resolve().parent.parent

    if test_run:
        run_folder = "test_runs"
    else:
        run_folder = "experiments"

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    experiment_id = f"{timestamp}_{experiment_name}"

    experiment_dir = (
        base_dir
        / "results"
        / run_folder
        / experiment_id
    )

    experiment_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    config = {
    "experiment_id": experiment_id,
    "distribution": distribution,
    "algorithm": algorithm,
    "num_clients": num_clients,
    "rounds": rounds,
    "local_epochs": local_epochs,
    "batch_size": batch_size,
    "learning_rate": learning_rate,
    "mu": experiment_mu,
    "use_class_weights": use_class_weights,
    "max_batches": max_batches,
    "test_run": test_run
    }

    config_file = experiment_dir / "config.json"

    with open(config_file, "w") as f:
        json.dump(config, f, indent=4)

    print(f"\nExperiment ID: {experiment_id}")
    print(f"Experiment folder: {experiment_dir}")


    print("=" * 60)
    print("FEDERATED LEARNING EXPERIMENT")
    print("=" * 60)

    print(f"Distribution      : {distribution.upper()}")
    print(f"Algorithm         : {algorithm.upper()}")
    print(f"Number of clients : {num_clients}")
    print(f"Number of rounds  : {rounds}")
    print(f"Local epochs      : {local_epochs}")
    print(f"Batch size        : {batch_size}")
    print(f"Learning rate     : {learning_rate}")
    print(f"Max batches       : {max_batches}")
    print(f"Mu                : {experiment_mu}")
    print(f"Class weighting   : {use_class_weights}")

    # ==========================================
    # Validation Data
    # ==========================================

    _, val_loader = get_dataloaders(
        batch_size=batch_size
    )

    if use_class_weights:
        class_weights = calculate_class_weights()

        print("\nClass weights:")
        print(class_weights)

    else:
        class_weights = None

        print("\nClass weighting disabled.")



    # ==========================================
    # Create Server
    # ==========================================

    server = FLServer(
    num_clients=num_clients,
    local_epochs=local_epochs,
    batch_size=batch_size,
    learning_rate=learning_rate,
    max_batches=max_batches,
    class_weights=class_weights,
    mu=experiment_mu,
    client_folder=client_folder
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

    best_val_accuracy = -1.0
    best_round = 0

    for round_number in range(
        1,
        rounds + 1
    ):

        print("\n")
        print("=" * 60)

        print(
            f"FEDERATED ROUND "
            f"{round_number}/{rounds}"
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

        current_val_accuracy = metrics["val_accuracy"]

        if current_val_accuracy > best_val_accuracy:
            best_val_accuracy = current_val_accuracy
            best_round = round_number

            best_model_path = (
                experiment_dir / "best_global_model.pth"
            )

            torch.save(
                global_model.state_dict(),
                best_model_path
            )

            print(
                f"\nNew best global model saved "
                f"(Round {round_number}, "
                f"Val Accuracy: {current_val_accuracy:.2f}%)"
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
            experiment_dir
            / f"global_model_round_{round_number}.pth"
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

    results_file = experiment_dir / "training_history.csv"

    results_df.to_csv(
        results_file,
        index=False
    )
    latest_result = results[-1]

    summary = {
        "experiment_id": experiment_id,
        "distribution": distribution,
        "algorithm": algorithm,
        "num_clients": num_clients,
        "rounds": rounds,
        "local_epochs": local_epochs,
        "batch_size": batch_size,
        "learning_rate": learning_rate,
        "mu": experiment_mu,
        "use_class_weights": use_class_weights,
        "final_train_accuracy": latest_result["train_accuracy"],
        "final_val_accuracy": latest_result["val_accuracy"],
        "final_macro_f1": latest_result["macro_f1"],
        "final_weighted_f1": latest_result["weighted_f1"],
        "best_val_accuracy": best_val_accuracy,
        "best_round": best_round,
        "status": "completed",
        "test_run": test_run
    }

    summary_file = experiment_dir / "summary.json"

    with open(summary_file, "w") as f:
        json.dump(summary, f, indent=4)

    print(f"Summary saved as {summary_file}")

    print(
        f"\nResults saved as {results_file}"
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
        experiment_dir / "accuracy.png"
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
        experiment_dir / "loss.png"
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
        experiment_dir / "f1.png"
    )

    plt.close()

    print("\nGraphs generated:")
    print(experiment_dir / "accuracy.png")
    print(experiment_dir / "loss.png")
    print(experiment_dir / "f1.png")

    print(
        "\nFederated Learning completed."
    )

    return {
    "experiment_id": experiment_id,
    "status": "completed",
    "experiment_dir": str(experiment_dir),
    "best_round": best_round,
    "best_val_accuracy": best_val_accuracy,
    "final_val_accuracy": latest_result["val_accuracy"],
    "final_macro_f1": latest_result["macro_f1"],
    "final_weighted_f1": latest_result["weighted_f1"]
}


# ==========================================
# Run
# ==========================================

if __name__ == "__main__":
    run_experiment()