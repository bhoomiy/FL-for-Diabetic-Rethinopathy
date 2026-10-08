import io
import os
import gc
import torch
from flask import Flask, jsonify, request, send_file
import json
import tempfile
from pathlib import Path
from fl.hospital_dataset import install_dataset, get_dataset_info
import zipfile
import requests

from fl.client import FLClient
from models.mobilenet import DRMobileNetV2


app = Flask(__name__)

from flask_cors import CORS

CORS(
    app,
    resources={
        r"/*": {
            "origins": ["http://localhost:8080", "http://127.0.0.1:8080"]
        }
    },
)

# ============================================================
# HOSPITAL RUNTIME STATUS
# ============================================================

hospital_status = {
    "status": "idle",
    "hospital_id": None,
    "distribution": None,
    "algorithm": None,
    "mu": None,
    "num_samples": None,
    "train_loss": None,
    "train_accuracy": None,
    "local_epochs": None,
    "batch_size": None,
    "learning_rate": None,
    "global_model_received": False,
    "completed_training_requests": 0,
    "use_dp": False,
    "dp_clip_norm": None,
    "dp_noise_multiplier": None,
}


# ============================================================
# HOSPITAL ID
# ============================================================

client_id = os.getenv("CLIENT_ID")

if client_id is None:
    raise ValueError(
        "CLIENT_ID environment variable is missing. "
        "Set CLIENT_ID to 1, 2, 3, or 4."
    )

try:
    client_id = int(client_id)
except ValueError:
    raise ValueError("CLIENT_ID must be an integer.")

if client_id not in [1, 2, 3, 4]:
    raise ValueError("CLIENT_ID must be between 1 and 4.")

hospital_status["hospital_id"] = client_id


print("=" * 60)
print("FedRetina Hospital Worker")
print(f"Hospital ID: {client_id}")
print("=" * 60)


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/health", methods=["GET"])
def health():
    return jsonify(
        {
            "status": "healthy",
            "hospital_id": client_id,
            "message": (
                f"Hospital {client_id} federated client is running"
            ),
        }
    )

# ============================================================
# HOSPITAL STATUS
# ============================================================

@app.route("/status", methods=["GET"])
def status():
    return jsonify(hospital_status)

ASYNC_SERVER_URL = os.getenv(
    "ASYNC_SERVER_URL",
    "http://host.docker.internal:5000"
).rstrip("/")

ASYNC_STORAGE = Path("/app/async_storage")
ASYNC_STORAGE.mkdir(parents=True, exist_ok=True)

# ============================================================
# LOCAL TRAINING
# ============================================================

@app.route("/train", methods=["POST"])
def train():

    print()
    print("=" * 60)
    print(
        f"Training request received by Hospital {client_id}"
    )
    print("=" * 60)

    hospital_status["status"] = "training"
    hospital_status["global_model_received"] = False

    # --------------------------------------------------------
    # Validate global model
    # --------------------------------------------------------

    if "model" not in request.files:
        return jsonify(
            {
                "status": "error",
                "message": "Global model file is missing.",
            }
        ), 400

    # --------------------------------------------------------
    # Read experiment configuration
    # --------------------------------------------------------

    distribution = request.form.get(
        "distribution",
        "iid"
    ).lower()

    algorithm = request.form.get(
        "algorithm",
        "fedavg"
    ).lower()

    try:
        local_epochs = int(
            request.form.get(
                "local_epochs",
                1
            )
        )

        batch_size = int(
            request.form.get(
                "batch_size",
                32
            )
        )

        learning_rate = float(
            request.form.get(
                "learning_rate",
                0.0005
            )
        )

        mu = float(
            request.form.get(
                "mu",
                0.0
            )
        )

        max_batches_raw = request.form.get(
            "max_batches",
            "None"
        )

        dp_clip_norm = float(
            request.form.get(
                "dp_clip_norm",
                1.0
            )
        )

        dp_noise_multiplier = float(
            request.form.get(
                "dp_noise_multiplier",
                0.1
            )
        )

    except ValueError:
        return jsonify(
            {
                "status": "error",
                "message": (
                    "Invalid numeric experiment configuration."
                ),
            }
        ), 400

    # --------------------------------------------------------
    # Differential Privacy configuration
    # --------------------------------------------------------

    use_dp = (
        request.form.get(
            "use_dp",
            "false"
        ).lower()
        == "true"
    )

    if dp_clip_norm <= 0:
        return jsonify(
            {
                "status": "error",
                "message": "dp_clip_norm must be greater than 0.",
            }
        ), 400

    if dp_noise_multiplier < 0:
        return jsonify(
            {
                "status": "error",
                "message": (
                    "dp_noise_multiplier cannot be negative."
                ),
            }
        ), 400

    # --------------------------------------------------------
    # Select IID / Non-IID dataset
    # --------------------------------------------------------

    if distribution == "iid":
        client_folder = "clients"

    elif distribution == "non_iid":
        client_folder = "clients_non_iid"

    else:
        return jsonify(
            {
                "status": "error",
                "message": (
                    "distribution must be "
                    "'iid' or 'non_iid'"
                ),
            }
        ), 400

    # --------------------------------------------------------
    # Select FedAvg / FedProx
    # --------------------------------------------------------

    if algorithm == "fedavg":

        experiment_mu = 0.0

    elif algorithm == "fedprox":

        if mu <= 0:
            return jsonify(
                {
                    "status": "error",
                    "message": (
                        "FedProx requires mu > 0."
                    ),
                }
            ), 400

        experiment_mu = mu

    else:
        return jsonify(
            {
                "status": "error",
                "message": (
                    "algorithm must be "
                    "'fedavg' or 'fedprox'"
                ),
            }
        ), 400

    # --------------------------------------------------------
    # max_batches
    # --------------------------------------------------------

    if (
        max_batches_raw is None
        or str(max_batches_raw).lower()
        in ["none", "", "null"]
    ):
        max_batches = None

    else:
        try:
            max_batches = int(
                max_batches_raw
            )
        except ValueError:
            return jsonify(
                {
                    "status": "error",
                    "message": (
                        "max_batches must be "
                        "an integer or None."
                    ),
                }
            ), 400

    # --------------------------------------------------------
    # Class weights
    # --------------------------------------------------------

    use_class_weights = (
        request.form.get(
            "use_class_weights",
            "false"
        ).lower()
        == "true"
    )

    class_weights = None

    if use_class_weights:

        class_weights_raw = request.form.get(
            "class_weights"
        )

        if class_weights_raw is None:
            return jsonify(
                {
                    "status": "error",
                    "message": (
                        "Class weighting is enabled "
                        "but class_weights were not supplied."
                    ),
                }
            ), 400

        try:

            weight_values = [
                float(value)
                for value
                in class_weights_raw.split(",")
            ]

            if len(weight_values) != 5:
                raise ValueError

            class_weights = torch.tensor(
                weight_values,
                dtype=torch.float32
            )

        except ValueError:

            return jsonify(
                {
                    "status": "error",
                    "message": (
                        "class_weights must contain "
                        "exactly 5 numeric values."
                    ),
                }
            ), 400

    # --------------------------------------------------------
    # Print received configuration
    # --------------------------------------------------------

    print(
        f"Distribution   : {distribution.upper()}"
    )

    print(
        f"Algorithm      : {algorithm.upper()}"
    )

    print(
        f"Local epochs   : {local_epochs}"
    )

    print(
        f"Batch size     : {batch_size}"
    )

    print(
        f"Learning rate  : {learning_rate}"
    )

    print(
        f"Mu             : {experiment_mu}"
    )

    print(
        f"Max batches    : {max_batches}"
    )

    print(
        f"Class weighting: {use_class_weights}"
    )

    print(
        f"Differential Privacy: {use_dp}"
    )

    if use_dp:
        print(
            f"DP clip norm    : {dp_clip_norm}"
        )
        print(
            f"DP noise mult.  : {dp_noise_multiplier}"
        )

    # --------------------------------------------------------
    # Create hospital client for THIS experiment
    # --------------------------------------------------------

    try:

        client = FLClient(
            client_id=client_id,
            batch_size=batch_size,
            local_epochs=local_epochs,
            max_batches=max_batches,
            class_weights=class_weights,
            mu=experiment_mu,
            client_folder=client_folder,
            learning_rate=learning_rate,
            use_dp=use_dp,
            dp_clip_norm=dp_clip_norm,
            dp_noise_multiplier=dp_noise_multiplier,
        )

    except Exception as error:

        print(
            f"Client initialization failed: {error}"
        )

        return jsonify(
            {
                "status": "error",
                "message": str(error),
            }
        ), 500

    print(
        f"Hospital {client_id} dataset: "
        f"{client.client_csv}"
    )

    print(
        f"Hospital {client_id} samples: "
        f"{len(client.dataset)}"
    )

    # --------------------------------------------------------
    # Load global model sent by server
    # --------------------------------------------------------

    model_file = request.files["model"]

    global_model = DRMobileNetV2(
        num_classes=5,
        freeze_features=True,
        pretrained=False
    )

    try:

        state_dict = torch.load(
            model_file.stream,
            map_location="cpu",
            weights_only=True,
        )

        global_model.load_state_dict(
            state_dict
        )

    except Exception as error:

        return jsonify(
            {
                "status": "error",
                "message": (
                    f"Unable to load global model: "
                    f"{error}"
                ),
            }
        ), 400

    print(
        f"Hospital {client_id} received "
        f"global model successfully."
    )

    hospital_status["global_model_received"] = True

    # --------------------------------------------------------
    # Perform local training
    # --------------------------------------------------------

    try:

        (
            updated_weights,
            num_samples,
            train_loss,
            train_accuracy,
        ) = client.train(
            global_model
        )

    except Exception as error:

        print(
            f"Local training failed: {error}"
        )

        return jsonify(
            {
                "status": "error",
                "message": (
                    f"Local training failed: {error}"
                ),
            }
        ), 500

    print(
        f"Hospital {client_id} "
        f"local training complete."
    )

    print(
        f"Loss: {train_loss:.4f}"
    )

    print(
        f"Accuracy: {train_accuracy:.2f}%"
    )

    hospital_status.update(
    {
        "status": "completed",
        "distribution": distribution,
        "algorithm": algorithm,
        "mu": experiment_mu,
        "num_samples": num_samples,
        "train_loss": float(train_loss),
        "train_accuracy": float(train_accuracy),
        "local_epochs": local_epochs,
        "batch_size": batch_size,
        "learning_rate": learning_rate,
        "global_model_received": True,
        "completed_training_requests":
            hospital_status["completed_training_requests"] + 1,
        "use_dp": use_dp,
        "dp_clip_norm": dp_clip_norm if use_dp else None,
        "dp_noise_multiplier": (
            dp_noise_multiplier if use_dp else None
        ),
    }
)

    # --------------------------------------------------------
    # Serialize updated weights
    # --------------------------------------------------------

    buffer = io.BytesIO()

    torch.save(
        updated_weights,
        buffer
    )

    buffer.seek(0)

    response = send_file(
        buffer,
        mimetype="application/octet-stream",
        as_attachment=True,
        download_name=(
            f"hospital_{client_id}_update.pth"
        ),
    )

    # --------------------------------------------------------
    # Return metadata
    # --------------------------------------------------------

    response.headers[
        "X-Hospital-ID"
    ] = str(client_id)

    response.headers[
        "X-Num-Samples"
    ] = str(num_samples)

    response.headers[
        "X-Train-Loss"
    ] = str(train_loss)

    response.headers[
        "X-Train-Accuracy"
    ] = str(train_accuracy)

    response.headers[
        "X-Distribution"
    ] = distribution

    response.headers[
        "X-Algorithm"
    ] = algorithm

    response.headers[
        "X-Mu"
    ] = str(experiment_mu)

    response.headers[
        "X-Use-DP"
    ] = str(use_dp).lower()

    response.headers[
        "X-DP-Clip-Norm"
    ] = str(dp_clip_norm)

    response.headers[
        "X-DP-Noise-Multiplier"
    ] = str(dp_noise_multiplier)

    # --------------------------------------------------------
    # Explicit memory cleanup
    # --------------------------------------------------------

    del updated_weights
    del global_model
    del client

    gc.collect()

    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    return response


# ============================================================
# ASYNCHRONOUS FL — HOSPITAL MODEL SYNCHRONIZATION
# ============================================================

@app.route("/async/sync", methods=["POST"])
def async_sync():
    try:
        info_response = requests.get(
            f"{ASYNC_SERVER_URL}/api/async/model/info",
            timeout=15,
        )
        info_response.raise_for_status()

        info = info_response.json()
        version = int(info["version"])

        model_response = requests.get(
            f"{ASYNC_SERVER_URL}/api/async/model/download",
            timeout=120,
            stream=True,
        )
        model_response.raise_for_status()

        downloaded_version = int(
            model_response.headers["X-Global-Model-Version"]
        )

        if downloaded_version != version:
            return jsonify({
                "status": "error",
                "message": "Global model version changed during synchronization."
            }), 409

        model_path = ASYNC_STORAGE / f"global_v{version}.pth"

        with tempfile.NamedTemporaryFile(
            dir=ASYNC_STORAGE,
            suffix=".tmp",
            delete=False,
        ) as temporary_file:
            temporary_path = Path(temporary_file.name)

            try:
                for chunk in model_response.iter_content(
                    chunk_size=1024 * 1024
                ):
                    if chunk:
                        temporary_file.write(chunk)
            except Exception:
                temporary_path.unlink(missing_ok=True)
                raise

        try:
            state_dict = torch.load(
                temporary_path,
                map_location="cpu",
                weights_only=True,
            )

            model = DRMobileNetV2(
                num_classes=5,
                freeze_features=True,
                pretrained=False,
            )
            model.load_state_dict(state_dict, strict=True)

            for name, tensor in state_dict.items():
                if (
                    torch.is_floating_point(tensor)
                    and not torch.isfinite(tensor).all()
                ):
                    raise ValueError(
                        f"Non-finite model parameter: {name}"
                    )

            os.replace(temporary_path, model_path)

        finally:
            temporary_path.unlink(missing_ok=True)

        metadata = {
            "hospital_id": client_id,
            "global_version": version,
            "checkpoint": model_path.name,
            "source": ASYNC_SERVER_URL,
        }

        metadata_path = ASYNC_STORAGE / "metadata.json"
        temporary_metadata = ASYNC_STORAGE / "metadata.tmp"

        with open(
            temporary_metadata, "w", encoding="utf-8"
        ) as file:
            json.dump(metadata, file, indent=2)

        os.replace(temporary_metadata, metadata_path)

        return jsonify({
            "status": "success",
            "hospital_id": client_id,
            "global_version": version,
            "checkpoint": model_path.name,
            "message": f"Hospital {client_id} synchronized successfully."
        })

    except requests.RequestException as error:
        return jsonify({
            "status": "error",
            "message": f"Central server unavailable: {error}"
        }), 503

    except Exception as error:
        return jsonify({
            "status": "error",
            "message": str(error)
        }), 500


# ============================================================
# ASYNCHRONOUS FL — INDEPENDENT LOCAL TRAINING
# ============================================================

@app.route("/async/train", methods=["POST"])
def async_local_train():
    import math
    import threading
    from datetime import datetime, timezone

    # Prevent overlapping asynchronous training requests.
    if not hasattr(app, "async_train_lock"):
        app.async_train_lock = threading.Lock()

    if not app.async_train_lock.acquire(blocking=False):
        return jsonify({
            "status": "error",
            "message": "Asynchronous training is already running."
        }), 409

    try:
        metadata_path = ASYNC_STORAGE / "metadata.json"

        if not metadata_path.exists():
            return jsonify({
                "status": "error",
                "message": "Synchronize a global model before training."
            }), 400

        with open(metadata_path, "r", encoding="utf-8") as file:
            sync_metadata = json.load(file)

        base_version = int(sync_metadata["global_version"])
        checkpoint_path = ASYNC_STORAGE / sync_metadata["checkpoint"]

        if not checkpoint_path.is_file():
            return jsonify({
                "status": "error",
                "message": "Synchronized checkpoint is missing."
            }), 400

        # Fixed test configuration.
        # We will expose configurable settings after validation.
        config = {
            "distribution": "non_iid",
            "algorithm": "fedprox",
            "local_epochs": 1,
            "batch_size": 16,
            "learning_rate": 0.0005,
            "max_batches": 2,
            "mu": 0.01,
            "use_dp": False,
        }

        
        # Use the hospital's uploaded dataset when available.
        uploaded_root = ASYNC_STORAGE / "datasets" / "active"
        uploaded_csv = uploaded_root / "client.csv"
        uploaded_images = uploaded_root / "images"

        custom_dataset_ready = (
            uploaded_csv.is_file()
            and uploaded_images.is_dir()
        )

        client = FLClient(
            client_id=client_id,
            batch_size=config["batch_size"],
            local_epochs=config["local_epochs"],
            max_batches=config["max_batches"],
            mu=config["mu"],
            client_folder="clients_non_iid",
            learning_rate=config["learning_rate"],
            use_dp=False,
            custom_csv=(
                str(uploaded_csv) if custom_dataset_ready else None
            ),
            custom_image_dir=(
                str(uploaded_images) if custom_dataset_ready else None
            ),
            test_split=0.2 if custom_dataset_ready else 0.0,
        )


        global_model = DRMobileNetV2(
            num_classes=5,
            freeze_features=True,
            pretrained=False,
        )

        state_dict = torch.load(
            checkpoint_path,
            map_location="cpu",
            weights_only=True,
        )

        global_model.load_state_dict(state_dict, strict=True)

        updated_weights, num_samples, loss, accuracy = client.train(
            global_model
        )

        test_metrics = client.evaluate_local(updated_weights)

        dataset_source = (
            "uploaded_idrid" if custom_dataset_ready
            else "existing_aptos_non_iid"
        )

        if not math.isfinite(float(loss)) or not math.isfinite(float(accuracy)):
            raise ValueError("Training produced non-finite metrics.")

        for name, tensor in updated_weights.items():
            if (
                torch.is_floating_point(tensor)
                and not torch.isfinite(tensor).all()
            ):
                raise ValueError(
                    f"Training produced non-finite parameters: {name}"
                )

        # Only one pending update per hospital in this first version.
        # Never overwrite an update awaiting submission.
        pending_path = ASYNC_STORAGE / "pending_update.pth"
        pending_metadata_path = ASYNC_STORAGE / "pending_update.json"

        if pending_path.exists() or pending_metadata_path.exists():
            return jsonify({
                "status": "error",
                "message": (
                    "A pending update already exists. "
                    "Submit or explicitly discard it before retraining."
                )
            }), 409

        # Save checkpoint atomically.
        with tempfile.NamedTemporaryFile(
            dir=ASYNC_STORAGE,
            suffix=".tmp",
            delete=False,
        ) as temporary_file:
            temporary_path = Path(temporary_file.name)

        try:
            torch.save(updated_weights, temporary_path)
            os.replace(temporary_path, pending_path)
        finally:
            temporary_path.unlink(missing_ok=True)

        pending_metadata = {
            "hospital_id": client_id,
            "base_version": base_version,
            "num_samples": int(num_samples),
            "train_loss": float(loss),
            "train_accuracy": float(accuracy),
            "config": config,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "pending_submission",
            "dataset_source": dataset_source,
            "test_metrics": test_metrics,
        }

        temporary_metadata = ASYNC_STORAGE / "pending_update.tmp"

        with open(temporary_metadata, "w", encoding="utf-8") as file:
            json.dump(pending_metadata, file, indent=2)

        os.replace(temporary_metadata, pending_metadata_path)

        del updated_weights, global_model, client
        gc.collect()

        return jsonify({
            "status": "success",
            "hospital_id": client_id,
            "base_version": base_version,
            "num_samples": num_samples,
            "train_loss": loss,
            "train_accuracy": accuracy,
            "pending_checkpoint": pending_path.name,
            "dataset_source": dataset_source,
            "test_metrics": test_metrics,
            "message": "Local training completed. Update awaits submission."
        })

    except Exception as error:
        return jsonify({
            "status": "error",
            "message": str(error)
        }), 500

    finally:
        app.async_train_lock.release()


# ============================================================
# ASYNCHRONOUS FL — SUBMIT PENDING LOCAL UPDATE
# ============================================================

@app.route("/async/submit", methods=["POST"])
def async_submit_local_update():

    pending_path = ASYNC_STORAGE / "pending_update.pth"
    metadata_path = ASYNC_STORAGE / "pending_update.json"

    if not pending_path.is_file() or not metadata_path.is_file():
        return jsonify({
            "status": "error",
            "message": "No pending local update exists."
        }), 404

    try:
        with open(metadata_path, "r", encoding="utf-8") as file:
            metadata = json.load(file)

        if int(metadata["hospital_id"]) != client_id:
            return jsonify({
                "status": "error",
                "message": "Pending update belongs to another hospital."
            }), 409

        if metadata.get("status") != "pending_submission":
            return jsonify({
                "status": "error",
                "message": "Update is not awaiting submission."
            }), 409

        server_url = (
            f"{ASYNC_SERVER_URL.rstrip('/')}/api/async/submit"
        )

        with open(pending_path, "rb") as checkpoint_file:
            response = requests.post(
                server_url,
                data={
                    "hospital_id": client_id,
                    "base_version": metadata["base_version"],
                    "num_samples": metadata["num_samples"],
                },
                files={
                    "model": (
                        pending_path.name,
                        checkpoint_file,
                        "application/octet-stream",
                    )
                },
                timeout=600,
            )

        response.raise_for_status()
        result = response.json()

        decision = result.get("decision")

        if decision not in {
            "accepted",
            "rejected_no_improvement",
            "rejected_stale",
        }:
            return jsonify({
                "status": "error",
                "message": "Unexpected server decision.",
                "server_response": result,
            }), 502

        # Preserve both files for the audit trail.
        # Do not delete the checkpoint automatically.
        metadata["status"] = "submitted"
        metadata["decision"] = decision
        metadata["submission_id"] = result.get("submission_id")
        metadata["new_version"] = result.get("new_version")

        temporary_metadata = (
            ASYNC_STORAGE / "pending_update_submit.tmp"
        )

        with open(temporary_metadata, "w", encoding="utf-8") as file:
            json.dump(metadata, file, indent=2)

        os.replace(temporary_metadata, metadata_path)

        return jsonify({
            "status": "success",
            "hospital_id": client_id,
            "decision": decision,
            "submission_id": result.get("submission_id"),
            "new_version": result.get("new_version"),
            "baseline_metrics": result.get("baseline_metrics"),
            "candidate_metrics": result.get("candidate_metrics"),
            "message": "Central server processed hospital update.",
        })

    except requests.RequestException as error:
        return jsonify({
            "status": "error",
            "message": f"Central server submission failed: {error}",
        }), 502

    except Exception as error:
        return jsonify({
            "status": "error",
            "message": str(error),
        }), 500


# ============================================================
# HOSPITAL-LOCAL DATASET MANAGEMENT
# ============================================================

@app.route("/async/dataset", methods=["GET"])
def async_dataset_info():
    return jsonify({
        "hospital_id": client_id,
        **get_dataset_info(ASYNC_STORAGE),
    })


@app.route("/async/dataset/upload", methods=["POST"])
def async_dataset_upload():
    if "dataset" not in request.files:
        return jsonify({
            "status": "error",
            "message": "Upload a ZIP using the dataset field.",
        }), 400

    try:
        result = install_dataset(
            request.files["dataset"].stream,
            ASYNC_STORAGE,
        )

        return jsonify({
            "hospital_id": client_id,
            **result,
        }), 201

    except (ValueError, zipfile.BadZipFile) as error:
        return jsonify({
            "status": "error",
            "message": str(error),
        }), 400

    except Exception:
        app.logger.exception("Dataset upload failed")
        return jsonify({
            "status": "error",
            "message": "Dataset upload failed.",
        }), 500


# ============================================================
# START HOSPITAL API
# ============================================================

if __name__ == "__main__":

    print(
        f"Hospital {client_id} API is ready."
    )

    print(
        "Listening on port 5000..."
    )

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False,
    )