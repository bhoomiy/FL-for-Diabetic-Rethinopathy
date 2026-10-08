from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
from pathlib import Path
import json
from PIL import Image
from backend.prediction_service import predict_retinal_image
import requests

from fl.fed_train import run_experiment

app = Flask(__name__)
CORS(app)

BASE_DIR = Path(__file__).resolve().parent.parent
RESULTS_FILE = BASE_DIR / "results" / "fedprox_iid_results.csv"

def get_best_experiment(
    distribution=None,
    algorithm=None,
    required_file=None
):
    experiments_dir = BASE_DIR / "results" / "experiments"

    if not experiments_dir.exists():
        return None

    best_experiment = None
    best_accuracy = -1.0

    for experiment_dir in experiments_dir.iterdir():
        if not experiment_dir.is_dir():
            continue

        config_path = experiment_dir / "config.json"
        summary_path = experiment_dir / "summary.json"

        if not config_path.exists() or not summary_path.exists():
            continue

        if required_file is not None:
            required_path = experiment_dir / required_file

            if not required_path.exists():
                continue

        try:
            with open(config_path, "r", encoding="utf-8") as f:
                config = json.load(f)

            with open(summary_path, "r", encoding="utf-8") as f:
                summary = json.load(f)

            if summary.get("status") != "completed":
                continue

            if distribution is not None:
                if config.get("distribution") != distribution:
                    continue

            if algorithm is not None:
                if config.get("algorithm") != algorithm:
                    continue

            accuracy = summary.get("best_val_accuracy")

            if accuracy is None:
                continue

            accuracy = float(accuracy)

            if accuracy > best_accuracy:
                best_accuracy = accuracy
                best_experiment = {
                    "directory": experiment_dir,
                    "config": config,
                    "summary": summary
                }

        except Exception as error:
            print(
                f"Failed to inspect experiment "
                f"{experiment_dir.name}: {error}"
            )

    return best_experiment

def get_experiment_by_id(experiment_id):
    if not experiment_id:
        return None

    experiments_dir = (
        BASE_DIR / "results" / "experiments"
    )

    experiment_dir = (
        experiments_dir / experiment_id
    ).resolve()

    experiments_dir = experiments_dir.resolve()

    # Prevent accessing anything outside
    # results/experiments.
    if experiment_dir.parent != experiments_dir:
        return None

    if not experiment_dir.is_dir():
        return None

    config_path = experiment_dir / "config.json"
    summary_path = experiment_dir / "summary.json"

    if not config_path.exists() or not summary_path.exists():
        return None

    try:
        with open(
            config_path,
            "r",
            encoding="utf-8"
        ) as f:
            config = json.load(f)

        with open(
            summary_path,
            "r",
            encoding="utf-8"
        ) as f:
            summary = json.load(f)

        return {
            "directory": experiment_dir,
            "config": config,
            "summary": summary
        }

    except Exception as error:
        print(
            f"Failed to load experiment "
            f"{experiment_id}: {error}"
        )

        return None

# ============================================================
# DOCKER HOSPITAL RUNTIME STATUS
# ============================================================

@app.route("/api/hospitals/<int:hospital_id>/status", methods=["GET"])
def hospital_runtime_status(hospital_id):

    if hospital_id not in range(1, 5):
        return jsonify({
            "error": "Hospital ID must be between 1 and 4."
        }), 400

    hospital_url = (
        f"http://localhost:{5000 + hospital_id}/status"
    )

    try:
        response = requests.get(
            hospital_url,
            timeout=5
        )

        response.raise_for_status()

        return jsonify(response.json())

    except requests.RequestException as error:
        print(
            f"Failed to reach Hospital {hospital_id}:",
            error
        )

        return jsonify({
            "error": f"Hospital {hospital_id} is unavailable.",
            "hospital_id": hospital_id,
            "status": "offline"
        }), 503
    
@app.route("/api/dashboard", methods=["GET"])
def dashboard():

    experiments_dir = (
        BASE_DIR
        / "results"
        / "experiments"
    )

    if not experiments_dir.exists():
        return jsonify({
            "error": "No experiments found."
        }), 404

    completed_experiments = []

    for experiment_dir in experiments_dir.iterdir():

        if not experiment_dir.is_dir():
            continue

        summary_path = (
            experiment_dir / "summary.json"
        )

        config_path = (
            experiment_dir / "config.json"
        )

        if (
            not summary_path.exists()
            or not config_path.exists()
        ):
            continue

        try:
            with open(
                summary_path,
                "r",
                encoding="utf-8"
            ) as f:
                summary = json.load(f)

            with open(
                config_path,
                "r",
                encoding="utf-8"
            ) as f:
                config = json.load(f)

            if summary.get("status") != "completed":
                continue

            completed_experiments.append({
                "directory": experiment_dir,
                "summary": summary,
                "config": config
            })

        except Exception as error:
            print(
                f"Failed to read {experiment_dir.name}:",
                error
            )

    if not completed_experiments:
        return jsonify({
            "error": "No completed experiments found."
        }), 404

    # Experiment IDs begin with YYYYMMDD_HHMMSS,
    # so folder-name ordering gives us the latest run.
    latest_experiment = max(
        completed_experiments,
        key=lambda experiment:
            experiment["directory"].name
    )

    summary = latest_experiment["summary"]
    config = latest_experiment["config"]

    return jsonify({
        "experiment_id":
            summary["experiment_id"],

        "active_clients":
            config.get("num_clients", 4),

        "algorithm":
            config["algorithm"],

        "distribution":
            config["distribution"],

        "validation_accuracy":
            summary["best_val_accuracy"],

        "macro_f1":
            summary["final_macro_f1"],

        "weighted_f1":
            summary["final_weighted_f1"],

        "train_accuracy":
            summary["final_train_accuracy"],

        "rounds":
            config["rounds"],

        "local_epochs":
            config["local_epochs"],

        "batch_size":
            config["batch_size"],

        "learning_rate":
            config["learning_rate"],

        "mu":
            config["mu"],

        "class_weighting":
            config["use_class_weights"],

        "status":
            summary["status"]
    })

@app.route("/api/training-history", methods=["GET"])
def training_history():
    distribution = request.args.get(
        "distribution",
        "iid"
    ).lower()
    experiment_id = request.args.get("experiment_id")

    if experiment_id:
        experiment = get_experiment_by_id(experiment_id)

        if (
            experiment is not None
            and not (
                experiment["directory"]
                / "training_history.csv"
            ).exists()
        ):
            experiment = None

    else:
        experiment = get_best_experiment(
            distribution=distribution,
            required_file="training_history.csv"
    )

    if experiment is None:
        return jsonify({
            "error": (
                f"No completed experiment with training history "
                f"found for distribution '{distribution}'"
            )
        }), 404

    experiment_dir = experiment["directory"]
    summary = experiment["summary"]
    config = experiment["config"]

    history_path = (
        experiment_dir / "training_history.csv"
    )

    df = pd.read_csv(history_path)

    
    history = []

    def safe_number(value):
        if pd.isna(value):
            return None

        number = float(value)

        if not pd.notna(number) or not -float("inf") < number < float("inf"):
            return None

        return number

    for _, row in df.iterrows():
        history.append({
            "round": int(row["round"]),
            "trainAcc": safe_number(row["train_accuracy"]),
            "valAcc": safe_number(row["val_accuracy"]),
            "trainLoss": safe_number(row["train_loss"]),
            "valLoss": safe_number(row["val_loss"]),
            "macroF1": safe_number(row["macro_f1"])
        })


    return jsonify({
        "experiment_id": summary.get("experiment_id"),
        "distribution": config.get("distribution"),
        "algorithm": config.get("algorithm"),
        "best_round": summary.get("best_round"),
        "history": history
    })

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
    distribution = request.args.get(
        "distribution",
        "iid"
    ).lower()

    experiment_id = request.args.get("experiment_id")

    if experiment_id:
        experiment = get_experiment_by_id(experiment_id)
    else:
        experiment = get_best_experiment(
            distribution=distribution,
            required_file="training_history.csv"
        )

    if experiment is None:
        return jsonify({
            "error": (
                f"No completed experiment found "
                f"for distribution '{distribution}'"
            )
        }), 404

    experiment_dir = experiment["directory"]
    config = experiment["config"]
    summary = experiment["summary"]

    history_path = (
        experiment_dir / "training_history.csv"
    )

    if not history_path.exists():
        return jsonify({
            "error": "Training history not found."
        }), 404

    history_df = pd.read_csv(history_path)

    best_round = summary.get("best_round")

    best_row = history_df[
        history_df["round"] == best_round
    ]

    if best_row.empty:
        return jsonify({
            "error": "Best round not found in training history."
        }), 404

    best_row = best_row.iloc[0]

    return jsonify({
        "experiment_id": summary.get(
            "experiment_id"
        ),
        "distribution": config.get(
            "distribution"
        ),
        "algorithm": config.get(
            "algorithm"
        ),
        "best_round": int(best_round),
        "validation_accuracy": float(
            best_row["val_accuracy"]
        ),
        "train_accuracy": float(
            best_row["train_accuracy"]
        ),
        "macro_precision": float(
            best_row["precision"]
        ),
        "macro_recall": float(
            best_row["recall"]
        ),
        "macro_f1": float(
            best_row["macro_f1"]
        ),
        "weighted_f1": float(
            best_row["weighted_f1"]
        )
    })

@app.route("/api/class-metrics", methods=["GET"])
def class_metrics():
    distribution = request.args.get(
        "distribution",
        "iid"
    ).lower()

    experiment_id = request.args.get("experiment_id")

    if experiment_id:
        experiment = get_experiment_by_id(experiment_id)

        if (
            experiment is not None
            and not (
                experiment["directory"]
                / "class_metrics.json"
            ).exists()
        ):
            experiment = None

    else:
        experiment = get_best_experiment(
            distribution=distribution,
            required_file="class_metrics.json"
        )

    if experiment is None:
        return jsonify({
            "error": (
                f"No completed experiment with class metrics "
                f"found for distribution '{distribution}'"
            )
        }), 404

    experiment_dir = experiment["directory"]
    summary = experiment["summary"]

    class_metrics_path = (
        experiment_dir / "class_metrics.json"
    )

    with open(
        class_metrics_path,
        "r",
        encoding="utf-8"
    ) as f:
        raw_metrics = json.load(f)

    key_map = {
        0: "no_dr",
        1: "mild",
        2: "moderate",
        3: "severe",
        4: "proliferative"
    }

    formatted_metrics = []

    for metric in raw_metrics:
        class_id = int(metric["class_id"])

        formatted_metrics.append({
            "key": key_map[class_id],
            "label": metric["class_name"],
            "precision": float(metric["precision"]),
            "recall": float(metric["recall"]),
            "f1": float(metric["f1"]),
            "support": int(metric["support"])
        })

    return jsonify(formatted_metrics)


@app.route("/api/confusion-matrix", methods=["GET"])
def confusion_matrix_data():
    distribution = request.args.get(
        "distribution",
        "iid"
    ).lower()

    experiment_id = request.args.get("experiment_id")

    if experiment_id:
        experiment = get_experiment_by_id(experiment_id)

        if (
            experiment is not None
            and not (
                experiment["directory"]
                / "confusion_matrix.json"
            ).exists()
        ):
            experiment = None

    else:
        experiment = get_best_experiment(
            distribution=distribution,
            required_file="confusion_matrix.json"
        )

    if experiment is None:
        return jsonify({
            "error": (
                f"No completed experiment found "
                f"for distribution '{distribution}'"
            )
        }), 404

    experiment_dir = experiment["directory"]
    summary = experiment["summary"]
    config = experiment["config"]

    confusion_matrix_path = (
        experiment_dir / "confusion_matrix.json"
    )

    if not confusion_matrix_path.exists():
        return jsonify({
            "error": (
                "Confusion matrix is not available for this "
                "experiment because it was trained before "
                "per-experiment evaluation artifacts were added."
            ),
            "experiment_id": summary.get("experiment_id")
        }), 404

    with open(
        confusion_matrix_path,
        "r",
        encoding="utf-8"
    ) as f:
        confusion_data = json.load(f)

    return jsonify({
        "experiment_id": summary.get("experiment_id"),
        "distribution": config.get("distribution"),
        "algorithm": config.get("algorithm"),
        "best_round": summary.get("best_round"),
        "labels": [
            "No DR",
            "Mild",
            "Moderate",
            "Severe",
            "Proliferative DR"
        ],
        "matrix": confusion_data["matrix"]
    })

@app.route("/api/class-imbalance", methods=["GET"])
def class_imbalance():
    return jsonify({
        "method": "Balanced class weighting",
        "source": "datasets/train_1.csv",
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
        ]
    })


@app.route("/api/model-improvement", methods=["GET"])
def model_improvement():
    distribution = request.args.get(
        "distribution",
        "iid"
    ).lower()

    experiment_id = request.args.get("experiment_id")

    if experiment_id:
        experiment = get_experiment_by_id(experiment_id)

        if (
            experiment is not None
            and not (
                experiment["directory"]
                / "class_metrics.json"
            ).exists()
        ):
            experiment = None

    else:
        experiment = get_best_experiment(
            distribution=distribution,
            required_file="class_metrics.json"
        )

    if experiment is None:
        return jsonify({
            "error": (
                f"No completed experiment found "
                f"for distribution '{distribution}'"
            )
        }), 404

    experiment_dir = experiment["directory"]
    summary = experiment["summary"]
    config = experiment["config"]

    class_metrics_path = (
        experiment_dir / "class_metrics.json"
    )

    if not class_metrics_path.exists():
        return jsonify({
            "error": (
                "Class metrics are not available for this "
                "experiment."
            ),
            "experiment_id": summary.get("experiment_id")
        }), 404

    with open(
        class_metrics_path,
        "r",
        encoding="utf-8"
    ) as f:
        class_metrics = json.load(f)

    sorted_classes = sorted(
        class_metrics,
        key=lambda item: item["f1"]
    )

    weakest = sorted_classes[0]
    secondary = sorted_classes[1]

    def format_class(metric):
        return {
            "label": metric["class_name"],
            "precision": float(metric["precision"]),
            "recall": float(metric["recall"]),
            "f1": float(metric["f1"]),
            "support": int(metric["support"])
        }

    recommendations = [
        {
            "title": (
                f"Increase {weakest['class_name']}-class training data"
            ),
            "text": (
                f"{weakest['class_name']} currently has the lowest "
                f"F1 score ({weakest['f1']:.3f}). Increasing the "
                "amount and diversity of representative training "
                "data for this class may improve performance."
            )
        },
        {
            "title": "Target minority-class augmentation",
            "text": (
                f"Apply clinically appropriate augmentation to "
                f"{weakest['class_name']} and "
                f"{secondary['class_name']} samples to increase "
                "variation during local training."
            )
        },
        {
            "title": (
                f"Investigate {weakest['class_name']} classification errors"
            ),
            "text": (
                f"Review false positives and false negatives for "
                f"{weakest['class_name']}. Its precision is "
                f"{weakest['precision']:.3f} and recall is "
                f"{weakest['recall']:.3f}, which can help identify "
                "the dominant error pattern."
            )
        },
        {
            "title": "Evaluate alternative loss functions",
            "text": (
                "Compare the current loss configuration with "
                "alternatives such as focal loss in a future "
                "experiment, especially for difficult or "
                "under-represented classes."
            )
        }
    ]

    return jsonify({
        "experiment_id": summary.get("experiment_id"),
        "distribution": config.get("distribution"),
        "algorithm": config.get("algorithm"),
        "best_round": summary.get("best_round"),

        "weakest_class": format_class(weakest),
        "secondary_weak_class": format_class(secondary),
        "recommendations": recommendations
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
    test_run=data.get("test_run", False),

    # Differential Privacy
    use_dp=data.get("use_dp", False),
    dp_clip_norm=data.get("dp_clip_norm", 1.0),
    dp_noise_multiplier=data.get("dp_noise_multiplier", 0.001)
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

                # Training configuration for dynamic comparisons
                "localEpochs": config.get("local_epochs"),
                "batchSize": config.get("batch_size"),
                "maxBatches": config.get("max_batches"),

                # Differential privacy configuration
                "useDP": config.get("use_dp", False),
                "dpClipNorm": config.get("dp_clip_norm"),
                "dpNoiseMultiplier": config.get("dp_noise_multiplier"),

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

@app.route("/api/predict", methods=["POST"])
def predict():

    if "image" not in request.files:
        return jsonify({
            "error": "No image file provided."
        }), 400

    image_file = request.files["image"]

    if image_file.filename == "":
        return jsonify({
            "error": "No image selected."
        }), 400

    try:
        image = Image.open(image_file.stream)

        result = predict_retinal_image(image)

        return jsonify(result)

    except Exception as error:
        print("Prediction failed:", error)

        return jsonify({
            "error": str(error)
        }), 500

if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)