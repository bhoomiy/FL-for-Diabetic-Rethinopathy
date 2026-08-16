import os
import numpy as np
import pandas as pd

# ======================================================
# SETTINGS
# ======================================================

NUM_CLIENTS = 4
ALPHA = 0.5
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
    "clients_non_iid"
)

# ======================================================
# RANDOM GENERATOR
# ======================================================

rng = np.random.default_rng(RANDOM_STATE)

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
# TARGET CLIENT SIZES
# ======================================================

total_samples = len(df)

base_size = total_samples // NUM_CLIENTS
remainder = total_samples % NUM_CLIENTS

target_sizes = [
    base_size + (1 if i < remainder else 0)
    for i in range(NUM_CLIENTS)
]

print("\nTarget client sizes:")

for i, size in enumerate(target_sizes):
    print(f"Client {i + 1}: {size}")

# ======================================================
# CREATE OUTPUT FOLDER
# ======================================================

os.makedirs(
    OUTPUT_FOLDER,
    exist_ok=True
)

# ======================================================
# INITIALIZE CLIENT DATA
# ======================================================

client_indices = [
    [] for _ in range(NUM_CLIENTS)
]

# Track how many samples each client currently has
client_counts = np.zeros(
    NUM_CLIENTS,
    dtype=int
)

# ======================================================
# NON-IID DIRICHLET ALLOCATION
# ======================================================

print("\nCreating Non-IID client split...")
print("Dirichlet alpha:", ALPHA)

classes = sorted(
    df["diagnosis"].unique()
)

for class_label in classes:

    class_indices = np.where(
        df["diagnosis"].values == class_label
    )[0]

    # Shuffle samples belonging to this class
    class_indices = rng.permutation(
        class_indices
    )

    num_class_samples = len(
        class_indices
    )

    # --------------------------------------------------
    # Generate heterogeneous proportions
    # --------------------------------------------------

    proportions = rng.dirichlet(
        np.repeat(
            ALPHA,
            NUM_CLIENTS
        )
    )

    # --------------------------------------------------
    # Convert proportions into initial counts
    # --------------------------------------------------

    raw_counts = (
        proportions * num_class_samples
    )

    counts = np.floor(
        raw_counts
    ).astype(int)

    # Distribute remaining samples according
    # to the largest fractional parts
    remaining = (
        num_class_samples - counts.sum()
    )

    fractional_parts = (
        raw_counts - counts
    )

    order = np.argsort(
        -fractional_parts
    )

    for i in range(remaining):
        counts[order[i % NUM_CLIENTS]] += 1

    # --------------------------------------------------
    # Make sure client capacity is respected
    # --------------------------------------------------

    # If a client would exceed its target size,
    # move excess samples to clients with capacity.
    excess = counts - (
        np.array(target_sizes) - client_counts
    )

    while np.any(excess > 0):

        source = np.where(
            excess > 0
        )[0][0]

        # Find clients that still have capacity
        available = np.where(
            client_counts
            + counts
            <= np.array(target_sizes)
        )[0]

        available = available[
            available != source
        ]

        if len(available) == 0:
            break

        # Choose the client with the most remaining capacity
        destination = available[
            np.argmax(
                np.array(target_sizes)[available]
                - client_counts[available]
                - counts[available]
            )
        ]

        counts[source] -= 1
        counts[destination] += 1

        excess = counts - (
            np.array(target_sizes) - client_counts
        )

    # --------------------------------------------------
    # Assign actual samples
    # --------------------------------------------------

    start = 0

    for client_id in range(NUM_CLIENTS):

        count = counts[client_id]

        selected = class_indices[
            start:start + count
        ]

        client_indices[
            client_id
        ].extend(selected.tolist())

        client_counts[
            client_id
        ] += count

        start += count

# ======================================================
# FINAL SIZE CORRECTION
# ======================================================

print("\nCorrecting final client sizes...")

# Sometimes the independent class allocations can leave
# a few samples in the wrong client due to capacity
# constraints. Move samples between clients while
# preserving their class labels.

while True:

    differences = (
        client_counts
        - np.array(target_sizes)
    )

    surplus_clients = np.where(
        differences > 0
    )[0]

    deficit_clients = np.where(
        differences < 0
    )[0]

    if (
        len(surplus_clients) == 0
        and len(deficit_clients) == 0
    ):
        break

    source = surplus_clients[0]
    destination = deficit_clients[0]

    # Move one sample
    moved_index = client_indices[
        source
    ].pop()

    client_indices[
        destination
    ].append(moved_index)

    client_counts[
        source
    ] -= 1

    client_counts[
        destination
    ] += 1

# ======================================================
# CREATE CLIENT DATAFRAMES
# ======================================================

client_dfs = []

for client_id in range(NUM_CLIENTS):

    indices = client_indices[
        client_id
    ]

    client_df = df.iloc[
        indices
    ].copy()

    # Shuffle client data
    client_df = client_df.sample(
        frac=1,
        random_state=(
            RANDOM_STATE + client_id
        )
    ).reset_index(
        drop=True
    )

    client_dfs.append(
        client_df
    )

# ======================================================
# SAVE CLIENT DATASETS
# ======================================================

print("\n========================================")
print("NON-IID CLIENT DATASETS")
print("========================================")

for i, client_df in enumerate(
    client_dfs
):

    filename = (
        f"client_{i + 1}.csv"
    )

    filepath = os.path.join(
        OUTPUT_FOLDER,
        filename
    )

    client_df.to_csv(
        filepath,
        index=False
    )

    print(
        f"\nClient {i + 1}"
    )

    print(
        "--------------------"
    )

    print(
        "Number of samples:",
        len(client_df)
    )

    print(
        "Class distribution:"
    )

    print(
        client_df["diagnosis"]
        .value_counts()
        .sort_index()
    )

# ======================================================
# VERIFY TOTAL
# ======================================================

total_client_samples = sum(
    len(client_df)
    for client_df in client_dfs
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

print(
    "\nFinal client sizes:"
)

for i, client_df in enumerate(
    client_dfs
):
    print(
        f"Client {i + 1}: {len(client_df)}"
    )

# ======================================================
# FINISHED
# ======================================================

print("\n========================================")
print("NON-IID CLIENT SPLITTING COMPLETE")
print("========================================")