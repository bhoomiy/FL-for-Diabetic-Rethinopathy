import copy

import torch

from models.mobilenet import DRMobileNetV2
from fl.client import FLClient


class FLServer:

    def __init__(
        self,
        num_clients=4,
        local_epochs=1,
        max_batches=None,
        class_weights=None,
        mu=0.0,
        client_folder="clients"
    ):

        self.num_clients = num_clients
        self.local_epochs = local_epochs
        self.max_batches = max_batches
        self.class_weights = class_weights
        self.mu = mu
        self.client_folder = client_folder

        # ======================================================
        # DEVICE
        # ======================================================

        self.device = torch.device(
            "cuda"
            if torch.cuda.is_available()
            else "cpu"
        )

        print("Device:", self.device)

        # ======================================================
        # GLOBAL MODEL
        # ======================================================

        self.global_model = DRMobileNetV2(
            num_classes=5,
            freeze_features=True
        ).to(self.device)

        # ======================================================
        # CREATE CLIENTS
        # ======================================================

        self.clients = [
            FLClient(
                client_id=i,
                batch_size=32,
                local_epochs=local_epochs,
                max_batches=max_batches,
                class_weights=class_weights,
                mu=mu,
                client_folder=client_folder
            )
            for i in range(
                1,
                num_clients + 1
            )
        ]

        # ======================================================
        # DISPLAY CLIENT INFORMATION
        # ======================================================

        print(
            f"Client dataset folder: "
            f"{client_folder}"
        )

        print(
            "Client dataset sizes:"
        )

        for client in self.clients:

            print(
                f"Client {client.client_id}: "
                f"{len(client.dataset)} images"
            )

    # ==========================================================
    # FEDAVG AGGREGATION
    # ==========================================================

    def fedavg(
        self,
        client_weights,
        client_sizes
    ):

        total_samples = sum(
            client_sizes
        )

        global_weights = copy.deepcopy(
            client_weights[0]
        )

        for key in global_weights.keys():

            # --------------------------------------------------
            # Floating point tensors
            # --------------------------------------------------

            if torch.is_floating_point(
                global_weights[key]
            ):

                global_weights[key] = (
                    torch.zeros_like(
                        global_weights[key]
                    )
                )

                for weights, size in zip(
                    client_weights,
                    client_sizes
                ):

                    weight = (
                        size / total_samples
                    )

                    global_weights[key] += (
                        weights[key] * weight
                    )

            # --------------------------------------------------
            # Integer tensors / buffers
            # --------------------------------------------------

            else:

                global_weights[key] = (
                    client_weights[0][key]
                )

        return global_weights

    # ==========================================================
    # ONE FEDERATED ROUND
    # ==========================================================

    def train_round(self):

        client_weights = []
        client_sizes = []

        client_train_losses = []
        client_train_accuracies = []

        print(
            "\nStarting Federated Learning Round"
        )

        # ======================================================
        # LOCAL CLIENT TRAINING
        # ======================================================

        for client in self.clients:

            print(
                f"\nTraining Client "
                f"{client.client_id} "
                f"({len(client.dataset)} images)"
            )

            (
                weights,
                size,
                train_loss,
                train_accuracy
            ) = client.train(
                self.global_model
            )

            client_weights.append(
                weights
            )

            client_sizes.append(
                size
            )

            client_train_losses.append(
                train_loss
            )

            client_train_accuracies.append(
                train_accuracy
            )

        # ======================================================
        # FEDAVG AGGREGATION
        # ======================================================

        new_global_weights = self.fedavg(
            client_weights,
            client_sizes
        )

        # Update global model
        self.global_model.load_state_dict(
            new_global_weights
        )

        # ======================================================
        # FEDERATED TRAINING METRICS
        # ======================================================

        total_samples = sum(
            client_sizes
        )

        train_loss = sum(
            loss * size
            for loss, size in zip(
                client_train_losses,
                client_sizes
            )
        ) / total_samples

        train_accuracy = sum(
            accuracy * size
            for accuracy, size in zip(
                client_train_accuracies,
                client_sizes
            )
        ) / total_samples

        # ======================================================
        # DISPLAY
        # ======================================================

        if self.mu > 0:

            print(
                "\nFedProx local training "
                "with FedAvg aggregation complete."
            )

        else:

            print(
                "\nFedAvg aggregation complete."
            )

        print(
            f"Federated Training Loss: "
            f"{train_loss:.4f}"
        )

        print(
            f"Federated Training Accuracy: "
            f"{train_accuracy:.2f}%"
        )

        return (
            self.global_model,
            train_loss,
            train_accuracy
        )