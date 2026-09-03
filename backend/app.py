from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
from pathlib import Path

from fl.fed_train import run_experiment

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

@app.route("/api/model-performance", methods=["GET"])
def model_performance():
    distribution = request.args.get("distribution", "iid").lower()

    if distribution == "non_iid":
        return jsonify({
            "distribution": "non_iid",
            "algorithm": "fedprox",
            "validation_accuracy": 76.23,
            "macro_precision": 0.5828,
            "macro_recall": 0.6105,
            "macro_f1": 0.5813,
            "weighted_f1": 0.7539
        })

    return jsonify({
        "distribution": "iid",
        "algorithm": "fedavg",
        "validation_accuracy": 78.14,
        "train_accuracy": 78.50,
        "macro_precision": 0.6570,
        "macro_recall": 0.6915,
        "macro_f1": 0.6525,
        "weighted_f1": 0.7854
    })

@app.route("/api/class-metrics", methods=["GET"])
def class_metrics():
    distribution = request.args.get("distribution", "iid").lower()

    if distribution == "non_iid":
        return jsonify([
            {
                "key": "no_dr",
                "label": "No DR",
                "precision": 0.9657,
                "recall": 0.9826,
                "f1": 0.9741,
                "support": 172
            },
            {
                "key": "mild",
                "label": "Mild",
                "precision": 0.4789,
                "recall": 0.8500,
                "f1": 0.6126,
                "support": 40
            },
            {
                "key": "moderate",
                "label": "Moderate",
                "precision": 0.7160,
                "recall": 0.5577,
                "f1": 0.6270,
                "support": 104
            },
            {
                "key": "severe",
                "label": "Severe",
                "precision": 0.1818,
                "recall": 0.0909,
                "f1": 0.1212,
                "support": 22
            },
            {
                "key": "proliferative",
                "label": "Proliferative DR",
                "precision": 0.5714,
                "recall": 0.5714,
                "f1": 0.5714,
                "support": 28
            }
        ])

    return jsonify([
        {
            "key": "no_dr",
            "label": "No DR",
            "precision": 0.9714,
            "recall": 0.9884,
            "f1": 0.9798,
            "support": 172
        },
        {
            "key": "mild",
            "label": "Mild",
            "precision": 0.5741,
            "recall": 0.7750,
            "f1": 0.6596,
            "support": 40
        },
        {
            "key": "moderate",
            "label": "Moderate",
            "precision": 0.8143,
            "recall": 0.5481,
            "f1": 0.6552,
            "support": 104
        },
        {
            "key": "severe",
            "label": "Severe",
            "precision": 0.3333,
            "recall": 0.6818,
            "f1": 0.4478,
            "support": 22
        },
        {
            "key": "proliferative",
            "label": "Proliferative DR",
            "precision": 0.5909,
            "recall": 0.4643,
            "f1": 0.5200,
            "support": 28
        }
    ])
@app.route("/api/confusion-matrix", methods=["GET"])
def confusion_matrix_data():
    distribution = request.args.get("distribution", "iid").lower()

    labels = [
        "No DR",
        "Mild",
        "Moderate",
        "Severe",
        "Proliferative DR"
    ]

    if distribution == "non_iid":
        return jsonify({
            "distribution": "non_iid",
            "labels": labels,
            "matrix": [
                [169, 3, 0, 0, 0],
                [1, 34, 3, 1, 1],
                [5, 29, 58, 7, 5],
                [0, 2, 12, 2, 6],
                [0, 3, 8, 1, 16]
            ]
        })

    return jsonify({
        "distribution": "iid",
        "labels": labels,
        "matrix": [
            [170, 2, 0, 0, 0],
            [1, 31, 5, 1, 2],
            [4, 17, 57, 22, 4],
            [0, 2, 2, 15, 3],
            [0, 2, 6, 7, 13]
        ]
    })

@app.route("/api/class-imbalance", methods=["GET"])
def class_imbalance():
    return jsonify({
        "class_weights": [
            {
                "key": "no_dr",
                "label": "No DR",
                "weight": 0.4086
            },
            {
                "key": "mild",
                "label": "Mild",
                "weight": 1.9533
            },
            {
                "key": "moderate",
                "label": "Moderate",
                "weight": 0.7252
            },
            {
                "key": "severe",
                "label": "Severe",
                "weight": 3.8052
            },
            {
                "key": "proliferative",
                "label": "Proliferative DR",
                "weight": 2.5043
            }
        ],
        "method": "Balanced class weighting",
        "source": "datasets/train_1.csv"
    })

@app.route("/api/model-improvement", methods=["GET"])
def model_improvement():
    return jsonify({
        "weakest_class": {
            "label": "Severe",
            "precision": 0.3333333333333333,
            "recall": 0.6818181818181818,
            "f1": 0.44776119402985076,
            "support": 22
        },

        "secondary_weak_class": {
            "label": "Proliferative DR",
            "precision": 0.5909090909090909,
            "recall": 0.4642857142857143,
            "f1": 0.52,
            "support": 28
        },

        "recommendations": [
            {
                "title": "Increase Severe-class training data",
                "text": "The Severe class has the lowest F1 score and only 22 samples in the validation set. More representative Severe-stage data may improve generalisation."
            },
            {
                "title": "Target minority-class augmentation",
                "text": "Apply clinically appropriate augmentation to Severe and Proliferative DR samples to increase minority-class variation during local training."
            },
            {
                "title": "Investigate Severe false positives",
                "text": "Severe recall is relatively strong but precision is low, which means the model frequently predicts Severe for images belonging to other classes."
            },
            {
                "title": "Evaluate focal loss",
                "text": "Weighted cross-entropy is already being used. Focal loss can be evaluated in a future experiment to place more emphasis on difficult and minority examples."
            }
        ]
    })

@app.route("/api/experiments/start", methods=["POST"])
def start_experiment():
    data = request.get_json()

    result = run_experiment(
        distribution=data.get("distribution", "iid"),
        algorithm=data.get("algorithm", "fedavg"),
        rounds=data.get("rounds", 1),
        local_epochs=data.get("local_epochs", 1),
        batch_size=data.get("batch_size", 32),
        learning_rate=data.get("learning_rate", 0.0005),
        mu=data.get("mu", 0.01),
        use_class_weights=data.get("use_class_weights", True),
        max_batches=data.get("max_batches", None),
        test_run=data.get("test_run", False)
    )

    return jsonify(result)

@app.route("/api/experiments", methods=["GET"])
def get_experiments():
    experiments_dir = BASE_DIR / "results" / "experiments"

    if not experiments_dir.exists():
        return jsonify([])

    experiments = []

    for experiment_dir in experiments_dir.iterdir():
        if not experiment_dir.is_dir():
            continue

        summary_path = experiment_dir / "summary.json"
        config_path = experiment_dir / "config.json"

        if not summary_path.exists() or not config_path.exists():
            continue

        try:
            import json

            with open(summary_path, "r", encoding="utf-8") as f:
                summary = json.load(f)

            with open(config_path, "r", encoding="utf-8") as f:
                config = json.load(f)

            experiment = {
                "id": summary.get(
                    "experiment_id",
                    experiment_dir.name
                ),

                "date": summary.get(
                    "created_at",
                    config.get("created_at", "")
                ),

                "algorithm": config.get(
                    "algorithm",
                    "unknown"
                ),

                "distribution": config.get(
                    "distribution",
                    "unknown"
                ),

                "aggregation": config.get(
                    "aggregation",
                    "weighted"
                ),

                "learningRate": config.get(
                    "learning_rate"
                ),

                "mu": config.get("mu"),

                "classWeighting": config.get(
                    "use_class_weights",
                    True
                ),

                "rounds": config.get(
                    "rounds"
                ),

                "accuracy": summary.get(
                    "best_val_accuracy"
                ),

                "macroF1": summary.get(
                    "final_macro_f1"
                ),

                "weightedF1": summary.get(
                    "final_weighted_f1"
                ),

                "bestRound": summary.get(
                    "best_round"
                ),

                "status": summary.get(
                    "status",
                    "completed"
                ),
            }

            experiments.append(experiment)

        except Exception as error:
            print(
                f"Failed to load experiment "
                f"{experiment_dir.name}: {error}"
            )

    experiments.sort(
        key=lambda e: e.get("date", ""),
        reverse=True
    )

    return jsonify(experiments)

if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)