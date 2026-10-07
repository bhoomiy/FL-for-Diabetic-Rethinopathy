import copy
import io

import requests
import torch

from models.mobilenet import DRMobileNetV2


class FLServer:

    def __init__(
        self,
        num_clients=4,
        local_epochs=1,
        batch_size=32,
        learning_rate=0.0005,
        max_batches=None,
        class_weights=None,
        mu=0.0,
        client_folder="clients"
    ):

        # ======================================================
        # BASIC CONFIGURATION
        # ======================================================

        if num_clients != 4:
            raise ValueError(
                "FedRetina Docker setup requires exactly 4 hospitals."
            )

        self.num_clients = num_clients
        self.local_epochs = local_epochs
        self.batch_size = batch_size
        self.learning_rate = learning_rate
        self.max_batches = max_batches
        self.class_weights = class_weights
        self.mu = mu
        self.client_folder = client_folder

        # ======================================================
        # DETERMINE DISTRIBUTION
        # ======================================================

        if client_folder == "clients":
            self.distribution = "iid"

        elif client_folder == "clients_non_iid":
            self.distribution = "non_iid"

        else:
            raise ValueError(
                "client_folder must be "
                "'clients' or 'clients_non_iid'."
            )

        # ======================================================
        # DETERMINE ALGORITHM
        # ======================================================

        if mu > 0:
            self.algorithm = "fedprox"
        else:
            self.algorithm = "fedavg"

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
        # DOCKER HOSPITAL ENDPOINTS
        # ======================================================

        self.client_urls = [
            f"http://localhost:{5000 + i}"
            for i in range(1, 5)
        ]

        print("Docker hospital clients:")

        for i, url in enumerate(
            self.client_urls,
            start=1
        ):
            print(
                f"Hospital {i}: {url}"
            )

        print()
        print("Federated configuration:")
        print(
            f"Distribution   : {self.distribution.upper()}"
        )
        print(
            f"Algorithm      : {self.algorithm.upper()}"
        )
        print(
            f"Local epochs   : {self.local_epochs}"
        )
        print(
            f"Batch size     : {self.batch_size}"
        )
        print(
            f"Learning rate  : {self.learning_rate}"
        )
        print(
            f"Mu             : {self.mu}"
        )
        print(
            f"Max batches    : {self.max_batches}"
        )
        print(
            f"Class weighting: "
            f"{self.class_weights is not None}"
        )

    # ==========================================================
    # FEDAVG WEIGHTED AGGREGATION
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

            else:

                global_weights[key] = (
                    client_weights[0][key]
                )

        return global_weights

    # ==========================================================
    # PREPARE EXPERIMENT CONFIGURATION
    # ==========================================================

    def get_request_config(self):

        if self.max_batches is None:
            max_batches_value = "None"
        else:
            max_batches_value = str(
                self.max_batches
            )

        use_class_weights = (
            self.class_weights is not None
        )

        config = {
            "distribution": self.distribution,
            "algorithm": self.algorithm,
            "local_epochs": str(
                self.local_epochs
            ),
            "batch_size": str(
                self.batch_size
            ),
            "learning_rate": str(
                self.learning_rate
            ),
            "mu": str(
                self.mu
            ),
            "max_batches": max_batches_value,
            "use_class_weights": (
                "true"
                if use_class_weights
                else "false"
            ),
        }

        if use_class_weights:

            weights = (
                self.class_weights
                .detach()
                .cpu()
                .tolist()
            )

            config["class_weights"] = ",".join(
                str(float(value))
                for value in weights
            )

        return config

    # ==========================================================
    # SEND GLOBAL MODEL TO ONE DOCKER HOSPITAL
    # ==========================================================

    def train_docker_client(
        self,
        client_id,
        client_url
    ):

        print(
            f"\nSending global model to "
            f"Hospital {client_id}..."
        )

        # ------------------------------------------------------
        # Serialize current global model
        # ------------------------------------------------------

        model_buffer = io.BytesIO()

        global_state = {
            key: value.detach().cpu()
            for key, value
            in self.global_model.state_dict().items()
        }

        torch.save(
            global_state,
            model_buffer
        )

        model_buffer.seek(0)

        # ------------------------------------------------------
        # Experiment configuration
        # ------------------------------------------------------

        request_config = (
            self.get_request_config()
        )

        # ------------------------------------------------------
        # Send model + configuration
        # ------------------------------------------------------

        try:

            response = requests.post(
                f"{client_url}/train",
                files={
                    "model": (
                        "global_model.pth",
                        model_buffer,
                        "application/octet-stream",
                    )
                },
                data=request_config,
                timeout=600,
            )

        except requests.RequestException as error:

            raise RuntimeError(
                f"Unable to communicate with "
                f"Hospital {client_id}: {error}"
            ) from error

        if response.status_code != 200:

            raise RuntimeError(
                f"Hospital {client_id} training failed.\n"
                f"Status: {response.status_code}\n"
                f"Response: {response.text}"
            )

        # ------------------------------------------------------
        # Verify returned configuration
        # ------------------------------------------------------

        returned_distribution = (
            response.headers.get(
                "X-Distribution"
            )
        )

        returned_algorithm = (
            response.headers.get(
                "X-Algorithm"
            )
        )

        if (
            returned_distribution
            != self.distribution
        ):
            raise RuntimeError(
                f"Hospital {client_id} used "
                f"distribution "
                f"'{returned_distribution}' "
                f"instead of "
                f"'{self.distribution}'."
            )

        if (
            returned_algorithm
            != self.algorithm
        ):
            raise RuntimeError(
                f"Hospital {client_id} used "
                f"algorithm "
                f"'{returned_algorithm}' "
                f"instead of "
                f"'{self.algorithm}'."
            )

        # ------------------------------------------------------
        # Read returned metrics
        # ------------------------------------------------------

        size = int(
            response.headers[
                "X-Num-Samples"
            ]
        )

        train_loss = float(
            response.headers[
                "X-Train-Loss"
            ]
        )

        train_accuracy = float(
            response.headers[
                "X-Train-Accuracy"
            ]
        )

        # ------------------------------------------------------
        # Load returned weights
        # ------------------------------------------------------

        weights_buffer = io.BytesIO(
            response.content
        )

        weights = torch.load(
            weights_buffer,
            map_location="cpu",
            weights_only=True,
        )

        print(
            f"Hospital {client_id} complete | "
            f"{self.distribution.upper()} | "
            f"{self.algorithm.upper()} | "
            f"Samples: {size} | "
            f"Loss: {train_loss:.4f} | "
            f"Accuracy: {train_accuracy:.2f}%"
        )

        return (
            weights,
            size,
            train_loss,
            train_accuracy,
        )

    # ==========================================================
    # ONE FEDERATED ROUND
    # ==========================================================

    def train_round(self):

        client_weights = []
        client_sizes = []

        client_train_losses = []
        client_train_accuracies = []

        print(
            "\nStarting Docker Federated Learning Round"
        )

        # ======================================================
        # FOUR DOCKER HOSPITALS
        # ======================================================

        for client_id, client_url in enumerate(
            self.client_urls,
            start=1
        ):

            (
                weights,
                size,
                train_loss,
                train_accuracy
            ) = self.train_docker_client(
                client_id,
                client_url
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
        # WEIGHTED AGGREGATION
        # ======================================================

        print(
            "\nAll hospital updates received."
        )

        print(
            f"Client sample sizes: "
            f"{client_sizes}"
        )

        new_global_weights = self.fedavg(
            client_weights,
            client_sizes
        )

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

        print(
            "\nWeighted aggregation complete."
        )

        print(
            f"Algorithm: "
            f"{self.algorithm.upper()}"
        )

        print(
            f"Distribution: "
            f"{self.distribution.upper()}"
        )

        print(
            f"Total federated samples: "
            f"{total_samples}"
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