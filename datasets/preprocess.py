import os
from pathlib import Path

import pandas as pd
from PIL import Image

import torch
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms

# ======================================================
# Paths
# ======================================================

BASE_DIR = Path(__file__).resolve().parent

TRAIN_CSV = BASE_DIR / "train_1.csv"
VAL_CSV = BASE_DIR / "valid.csv"
TEST_CSV = BASE_DIR / "test.csv"

TRAIN_IMAGE_DIR = BASE_DIR.parent.parent / "DR-Dataset" / "images" / "train_images" / "train_images"
VAL_IMAGE_DIR = BASE_DIR.parent.parent / "DR-Dataset" / "images" / "val_images" / "val_images"
TEST_IMAGE_DIR = BASE_DIR.parent.parent / "DR-Dataset" / "images" / "test_images" / "test_images"

# ======================================================
# Image Transforms
# ======================================================

train_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(10),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

val_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


# ======================================================
# Dataset Class
# ======================================================

class DRDataset(Dataset):

    def __init__(self, dataframe, image_dir, transform=None):

        self.df = dataframe.reset_index(drop=True)
        self.image_dir = image_dir
        self.transform = transform

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):

        image_name = self.df.iloc[idx]["id_code"] + ".png"
        image_path = os.path.join(self.image_dir, image_name)

        image = Image.open(image_path).convert("RGB")

        label = int(self.df.iloc[idx]["diagnosis"])

        if self.transform:
            image = self.transform(image)

        return image, label


# ======================================================
# DataLoader Function
# ======================================================

def get_dataloaders(batch_size=32):

    train_df = pd.read_csv(TRAIN_CSV)
    val_df = pd.read_csv(VAL_CSV)

    train_dataset = DRDataset(
        train_df,
        str(TRAIN_IMAGE_DIR),
        train_transform
    )

    val_dataset = DRDataset(
        val_df,
        str(VAL_IMAGE_DIR),
        val_transform
    )

    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=0
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=0
    )

    return train_loader, val_loader