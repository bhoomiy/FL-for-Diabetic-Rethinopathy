import os
import pandas as pd

from sklearn.model_selection import train_test_split


# ======================================================
# SETTINGS
# ======================================================

NUM_CLIENTS = 4


# ======================================================
# PROJECT PATHS
# ======================================================

# Find the main project folder
BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

# Original training CSV
INPUT_FILE = os.path.join(
    BASE_DIR,
    "datasets",
    "train_1.csv"
)

# Folder where client CSV files will be stored
OUTPUT_FOLDER = os.path.join(
    BASE_DIR,
    "datasets",
    "clients"
)


# ======================================================
# LOAD DATA
# ======================================================

print("Loading training data...")

df = pd.read_csv(INPUT_FILE)

print("\nOriginal dataset:")
print("Number of samples:", len(df))

print("\nOriginal class distribution:")
print(
    df["diagnosis"]
    .value_counts()
    .sort_index()
)


# ======================================================
# CREATE CLIENT FOLDER
# ======================================================

os.makedirs(
    OUTPUT_FOLDER,
    exist_ok=True
)


# ======================================================
# SPLIT DATA INTO CLIENTS
# ======================================================

remaining_data = df.copy()

clients = []


for i in range(NUM_CLIENTS - 1):

    client_data, remaining_data = train_test_split(
        remaining_data,
        test_size=1 / (NUM_CLIENTS - i),
        random_state=42,
        stratify=remaining_data["diagnosis"]
    )

    clients.append(client_data)


# The final client receives
# whatever data remains

clients.append(remaining_data)


# ======================================================
# SAVE CLIENT DATASETS
# ======================================================

print("\n========================================")
print("CLIENT DATASETS")
print("========================================")


for i, client_data in enumerate(clients):

    filename = f"client_{i + 1}.csv"

    filepath = os.path.join(
        OUTPUT_FOLDER,
        filename
    )

    client_data.to_csv(
        filepath,
        index=False
    )

    print(f"\nClient {i + 1}")
    print("--------------------")

    print(
        "Number of samples:",
        len(client_data)
    )

    print("Class distribution:")

    print(
        client_data["diagnosis"]
        .value_counts()
        .sort_index()
    )


# ======================================================
# FINISHED
# ======================================================

print("\n========================================")
print("CLIENT SPLITTING COMPLETE")
print("========================================")