import io
import os
import gc
import torch
from flask import Flask, jsonify, request, send_file

from fl.client import FLClient
from models.mobilenet import DRMobileNetV2


app = Flask(__name__)


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