from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd
from pathlib import Path

app = Flask(__name__)
CORS(app)

BASE_DIR = Path(__file__).resolve().parent.parent
RESULTS_FILE = BASE_DIR / "results" / "fedprox_iid_results.csv"


@app.route("/api/dashboard", methods=["GET"])
def dashboard():
    df = pd.read_csv(RESULTS_FILE)

    latest = df.iloc[-1]

    return jsonify({
        "active_clients": 4,
        "algorithm": "FedAvg",
        "distribution": "IID",
        "validation_accuracy": float(latest["val_accuracy"]),
        "macro_f1": float(latest["macro_f1"]),
        "weighted_f1": float(latest["weighted_f1"]),
        "train_accuracy": float(latest["train_accuracy"]),
        "rounds": int(latest["round"])
    })

@app.route("/api/training-history", methods=["GET"])
def training_history():
    df = pd.read_csv(RESULTS_FILE)

    history = []

    for _, row in df.iterrows():
        history.append({
            "round": int(row["round"]),
            "trainAcc": float(row["train_accuracy"]),
            "valAcc": float(row["val_accuracy"]),
            "trainLoss": float(row["train_loss"]),
            "valLoss": float(row["val_loss"]),
            "macroF1": float(row["macro_f1"])
        })

    return jsonify(history)

@app.route("/api/clients", methods=["GET"])
def clients():
    client_dir = BASE_DIR / "datasets" / "clients"

    raw_clients = []

    for client_id in range(1, 5):
        client_file = client_dir / f"client_{client_id}.csv"
        df = pd.read_csv(client_file)

        raw_clients.append({
            "id": client_id,
            "samples": len(df)
        })

    total_samples = sum(client["samples"] for client in raw_clients)

    clients_data = []

    for client in raw_clients:
        weight = client["samples"] / total_samples

        clients_data.append({
            "id": client["id"],
            "name": f"Hospital {client['id']}",
            "samples": client["samples"],
            "status": "online",
            "contributionWeight": float(weight)
        })

    return jsonify(clients_data)

@app.route("/api/data-distribution", methods=["GET"])
def data_distribution():

    class_names = {
        0: "No DR",
        1: "Mild",
        2: "Moderate",
        3: "Severe",
        4: "Proliferative DR"
    }

    def read_distribution(client_dir):

        result = []

        for client_id in range(1, 5):

            client_file = client_dir / f"client_{client_id}.csv"

            df = pd.read_csv(client_file)

            counts = df["diagnosis"].value_counts().to_dict()

            class_distribution = []

            for class_id in range(5):
                class_distribution.append({
                    "classId": class_id,
                    "className": class_names[class_id],
                    "count": int(counts.get(class_id, 0))
                })

            result.append({
                "id": client_id,
                "name": f"Hospital {client_id}",
                "samples": int(len(df)),
                "classes": class_distribution
            })

        return result

    iid_dir = BASE_DIR / "datasets" / "clients"

    non_iid_dir = BASE_DIR / "datasets" / "clients_non_iid"

    return jsonify({
        "iid": read_distribution(iid_dir),
        "non_iid": read_distribution(non_iid_dir)
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)