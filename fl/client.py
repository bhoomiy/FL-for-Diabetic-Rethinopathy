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
        max_batches=None
    ):

        self.client_id = client_id
        self.batch_size = batch_size
        self.local_epochs = local_epochs
        self.max_batches = max_batches

        # Project directories
        self.base_dir = Path(__file__).resolve().parent.parent

        self.client_csv = (
            self.base_dir
            / "datasets"
            / "clients"
            / f"client_{client_id}.csv"
        )

        self.image_dir = (
            self.base_dir.parent
            / "DR-Dataset"
            / "images"
            / "train_images"
            / "train_images"
        )

        # Device
        self.device = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

        # Load client's CSV
        self.df = pd.read_csv(self.client_csv)

        # Transform
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

        # Dataset
        self.dataset = DRDataset(
            self.df,
            str(self.image_dir),
            self.transform
        )

        # DataLoader
        self.loader = DataLoader(
            self.dataset,
            batch_size=self.batch_size,
            shuffle=True,
            num_workers=0
        )

    def train(self, global_model):

        # Create local model
        model = DRMobileNetV2(
            num_classes=5,
            freeze_features=True
        ).to(self.device)

        # Load global model
        model.load_state_dict(
            global_model.state_dict()
        )

        model.train()

        criterion = nn.CrossEntropyLoss()

        optimizer = torch.optim.Adam(
            model.parameters(),
            lr=0.0001
        )

        for epoch in range(self.local_epochs):

            running_loss = 0.0
            correct = 0
            total = 0

            for batch_index, (images, labels) in enumerate(
                self.loader
            ):

                # Stop early if max_batches is set
                if (
                    self.max_batches is not None
                    and batch_index >= self.max_batches
                ):
                    break

                images = images.to(self.device)
                labels = labels.to(self.device)

                optimizer.zero_grad()

                outputs = model(images)

                loss = criterion(
                    outputs,
                    labels
                )

                loss.backward()

                optimizer.step()

                running_loss += loss.item()

                _, predicted = torch.max(
                    outputs,
                    1
                )

                total += labels.size(0)

                correct += (
                    predicted == labels
                ).sum().item()

            batches_used = min(
                len(self.loader),
                self.max_batches
                if self.max_batches is not None
                else len(self.loader)
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

        return model.state_dict(), len(self.dataset)