import os
import pandas as pd

from sklearn.model_selection import train_test_split


# ======================================================
# SETTINGS
# ======================================================

NUM_CLIENTS = 4
RANDOM_STATE = 42


# ======================================================
# PROJECT PATHS
# ======================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

INPUT_FILE = os.path.join(
    BASE_DIR,
    "datasets",
    "train_1.csv"
)

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
# IID STRATIFIED SPLIT
# ======================================================

print("\nCreating IID client splits...")

clients = []

remaining_data = df.copy()

# Split off the first 3 clients
for i in range(NUM_CLIENTS - 1):

    client_size = int(
        len(df) / NUM_CLIENTS
    )

    # Calculate proportion of remaining data
    test_size = (
        len(remaining_data) - client_size
    ) / len(remaining_data)

    client_data, remaining_data = train_test_split(
        remaining_data,
        test_size=test_size,
        random_state=RANDOM_STATE + i,
        stratify=remaining_data["diagnosis"]
    )

    clients.append(
        client_data
    )


# Final client gets remaining samples
clients.append(
    remaining_data
)


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

    print(
        f"\nClient {i + 1}"
    )

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
# VERIFY TOTAL
# ======================================================

total_client_samples = sum(
    len(client)
    for client in clients
)

print("\n========================================")
print("SPLIT VERIFICATION")
print("========================================")

print(
    "Original samples:",
    len(df)
)

print(
    "Client samples:",
    total_client_samples
)

print(
    "Difference:",
    len(df) - total_client_samples
)


# ======================================================
# FINISHED
# ======================================================

print("\n========================================")
print("IID CLIENT SPLITTING COMPLETE")
print("========================================")