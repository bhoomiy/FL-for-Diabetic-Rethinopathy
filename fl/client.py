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
        client_folder="clients"
    ):

        self.client_id = client_id
        self.batch_size = batch_size
        self.local_epochs = local_epochs
        self.max_batches = max_batches
        self.class_weights = class_weights
        self.mu = mu

        # ======================================================
        # PROJECT DIRECTORIES
        # ======================================================

        self.base_dir = Path(__file__).resolve().parent.parent

        # Allows:
        # clients          -> IID
        # clients_non_iid  -> Non-IID
        self.client_folder = client_folder

        self.client_csv = (
            self.base_dir
            / "datasets"
            / client_folder
            / f"client_{client_id}.csv"
        )

        self.image_dir = (
            Path(
            r"C:\Users\Administrator\Documents\GitHub\DR-Dataset")
            / "images"
            / "train_images"
            / "train_images"
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
    # LOCAL TRAINING
    # ==========================================================

    def train(self, global_model):

        # ------------------------------------------------------
        # Create local model
        # ------------------------------------------------------

        model = DRMobileNetV2(
            num_classes=5,
            freeze_features=False
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
            lr=0.0005
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

                optimizer.zero_grad()

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

        return (
            model.state_dict(),
            len(self.dataset),
            train_loss,
            train_accuracy
        )