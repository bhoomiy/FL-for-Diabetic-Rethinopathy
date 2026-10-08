import os
from pathlib import Path

import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import transforms

from datasets.preprocess import DRDataset
from models.mobilenet import DRMobileNetV2


class FLClient:

    def __init__(
    self,
    client_id,
    batch_size=32,
    local_epochs=1,
    max_batches=None,
    class_weights=None,
    mu=0.0,
    client_folder="clients",
    learning_rate=0.0005,
    use_dp=False,
    dp_clip_norm=1.0,
    dp_noise_multiplier=0.1,
    custom_csv=None,
    custom_image_dir=None
    ):

        self.client_id = client_id
        self.batch_size = batch_size
        self.local_epochs = local_epochs
        self.max_batches = max_batches
        self.class_weights = class_weights
        self.mu = mu
        self.learning_rate = learning_rate
        self.use_dp = use_dp
        self.dp_clip_norm = dp_clip_norm
        self.dp_noise_multiplier = dp_noise_multiplier

        # ======================================================
        # PROJECT DIRECTORIES
        # ======================================================

        self.base_dir = Path(__file__).resolve().parent.parent

        # Allows:
        # clients          -> IID
        # clients_non_iid  -> Non-IID
        self.client_folder = client_folder

        
        self.client_csv = (
            Path(custom_csv)
            if custom_csv is not None
            else (
                self.base_dir
                / "datasets"
                / client_folder
                / f"client_{client_id}.csv"
            )
        )

        self.image_dir = (
            Path(custom_image_dir)
            if custom_image_dir is not None
            else Path(
                os.getenv(
                    "DR_IMAGE_DIR",
                    str(
                        self.base_dir
                        / "datasets"
                        / "train_images"
                        / "train_images"
                    )
                )
            )
        )


        # ======================================================
        # DEVICE
        # ======================================================

        self.device = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

        # ======================================================
        # CHECK CLIENT FILE
        # ======================================================

        if not self.client_csv.exists():
            raise FileNotFoundError(
                f"Client CSV not found:\n{self.client_csv}"
            )

        if not self.image_dir.exists():
            raise FileNotFoundError(
                f"Training image directory not found:\n{self.image_dir}"
            )

        # ======================================================
        # LOAD CLIENT CSV
        # ======================================================

        self.df = pd.read_csv(self.client_csv)

        # ======================================================
        # TRANSFORMS
        # ======================================================

        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(10),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])

        # ======================================================
        # DATASET
        # ======================================================

        self.dataset = DRDataset(
            self.df,
            str(self.image_dir),
            self.transform
        )

        # ======================================================
        # DATALOADER
        # ======================================================

        self.loader = DataLoader(
            self.dataset,
            batch_size=self.batch_size,
            shuffle=True,
            num_workers=0
        )

    # ==========================================================
    # DIFFERENTIAL PRIVACY
    # ==========================================================

    def apply_differential_privacy(
        self,
        local_state,
        global_state
    ):
        """
        Protect the client's model update before it is sent
        to the federated server.

        Steps:
        1. Compute the L2 norm of the complete client update.
        2. Clip the complete update to dp_clip_norm.
        3. Add Gaussian noise.
        4. Return the protected model state.

        This implementation processes tensors one at a time
        to reduce peak memory usage.
        """

        # ------------------------------------------------------
        # PASS 1: Compute total L2 norm without storing updates
        # ------------------------------------------------------

        total_norm_squared = 0.0

        with torch.no_grad():

            for key, local_tensor in local_state.items():

                if not torch.is_floating_point(local_tensor):
                    continue

                global_tensor = global_state[key]

                # Compute one layer's update only
                update = local_tensor.detach().cpu() - global_tensor.detach().cpu()

                total_norm_squared += (
                    update.double().pow(2).sum().item()
                )

                del update

        total_norm = total_norm_squared ** 0.5

        # ------------------------------------------------------
        # Compute clipping coefficient
        # ------------------------------------------------------

        clip_coefficient = min(
            1.0,
            self.dp_clip_norm / (total_norm + 1e-12)
        )

        noise_std = (
            self.dp_noise_multiplier
            * self.dp_clip_norm
        )

        protected_state = {}

        # ------------------------------------------------------
        # PASS 2: Clip + noise one tensor at a time
        # ------------------------------------------------------

        with torch.no_grad():

            for key, local_tensor in local_state.items():

                # Non-floating buffers are copied unchanged
                if not torch.is_floating_point(local_tensor):

                    protected_state[key] = (
                        local_tensor.detach().cpu().clone()
                    )

                    continue

                local_cpu = local_tensor.detach().cpu()
                global_cpu = global_state[key].detach().cpu()

                # Reuse one tensor for the update
                protected_tensor = local_cpu.clone()

                # local - global
                protected_tensor.sub_(global_cpu)

                # clip
                protected_tensor.mul_(clip_coefficient)

                # Gaussian noise — generated directly into one
                # temporary tensor instead of retaining multiple
                # full-sized intermediates
                if noise_std > 0:

                    noise = torch.randn_like(protected_tensor)
                    noise.mul_(noise_std)
                    protected_tensor.add_(noise)

                    del noise

                # global + protected update
                protected_tensor.add_(global_cpu)

                protected_state[key] = protected_tensor

        print(
            f"Client {self.client_id} | DP applied | "
            f"Update norm: {total_norm:.6f} | "
            f"Clip coefficient: {clip_coefficient:.6f} | "
            f"Clip norm: {self.dp_clip_norm} | "
            f"Noise multiplier: {self.dp_noise_multiplier} | "
            f"Noise std: {noise_std:.6f}",
            flush=True
        )

        return protected_state

    # ==========================================================
    # LOCAL TRAINING
    # ==========================================================

    def train(self, global_model):

        # ------------------------------------------------------
        # Create local model
        # ------------------------------------------------------

        model = DRMobileNetV2(
            num_classes=5,
            freeze_features=False,
            pretrained=False
        ).to(self.device)

        # ------------------------------------------------------
        # Start from global model
        # ------------------------------------------------------

        model.load_state_dict(
            global_model.state_dict()
        )

        model.train()

        # ------------------------------------------------------
        # Classification loss
        # ------------------------------------------------------

        if self.class_weights is not None:

            criterion = nn.CrossEntropyLoss(
                weight=self.class_weights.to(self.device)
            )

        else:

            criterion = nn.CrossEntropyLoss()

        # ------------------------------------------------------
        # Optimizer
        # ------------------------------------------------------

        optimizer = torch.optim.Adam(
            model.parameters(),
            lr=self.learning_rate
        )

        # ------------------------------------------------------
        # Training metrics
        # ------------------------------------------------------

        total_loss = 0.0
        total_correct = 0
        total_samples = 0

        # ======================================================
        # LOCAL EPOCHS
        # ======================================================

        for epoch in range(self.local_epochs):

            running_loss = 0.0
            correct = 0
            total = 0
            batches_used = 0

            # --------------------------------------------------
            # BATCH TRAINING
            # --------------------------------------------------

            for batch_index, (images, labels) in enumerate(
                self.loader
            ):

                if (
                    self.max_batches is not None
                    and batch_index >= self.max_batches
                ):
                    break

                images = images.to(self.device)
                labels = labels.to(self.device)

                optimizer.zero_grad(set_to_none=True)

                # Forward pass
                outputs = model(images)

                # Classification loss
                classification_loss = criterion(
                    outputs,
                    labels
                )

                # --------------------------------------------------
                # FedProx proximal term
                # --------------------------------------------------

                if self.mu > 0:

                    proximal_loss = torch.tensor(
                        0.0,
                        device=self.device
                    )

                    for local_param, global_param in zip(
                        model.parameters(),
                        global_model.parameters()
                    ):

                        proximal_loss += torch.sum(
                            (
                                local_param
                                - global_param.detach()
                            ) ** 2
                        )

                    proximal_loss = (
                        self.mu / 2
                    ) * proximal_loss

                else:

                    proximal_loss = torch.tensor(
                        0.0,
                        device=self.device
                    )

                # --------------------------------------------------
                # Total loss
                # --------------------------------------------------

                loss = (
                    classification_loss
                    + proximal_loss
                )

                # Backpropagation
                loss.backward()

                optimizer.step()

                # --------------------------------------------------
                # Metrics
                # --------------------------------------------------

                running_loss += loss.item()

                _, predicted = torch.max(
                    outputs,
                    1
                )

                total += labels.size(0)

                correct += (
                    predicted == labels
                ).sum().item()

                batches_used += 1

            # --------------------------------------------------
            # Epoch metrics
            # --------------------------------------------------

            if batches_used == 0:
                raise RuntimeError(
                    f"No batches were processed for "
                    f"Client {self.client_id}."
                )

            epoch_loss = (
                running_loss / batches_used
            )

            epoch_accuracy = (
                100 * correct / total
            )

            print(
                f"Client {self.client_id} | "
                f"Epoch {epoch + 1}/{self.local_epochs} | "
                f"Loss: {epoch_loss:.4f} | "
                f"Accuracy: {epoch_accuracy:.2f}%"
            )

            total_loss += epoch_loss
            total_correct += correct
            total_samples += total

        # ======================================================
        # FINAL TRAINING METRICS
        # ======================================================

        train_loss = (
            total_loss / self.local_epochs
        )

        train_accuracy = (
            100 * total_correct / total_samples
        )

        local_state = model.state_dict()

        if self.use_dp:

            local_state = self.apply_differential_privacy(
                local_state=local_state,
                global_state=global_model.state_dict()
            )

        return (
            local_state,
            len(self.dataset),
            train_loss,
            train_accuracy
        )