from fl.server import FLServer


server = FLServer(
    num_clients=4,
    local_epochs=1,
    batch_size=32,
    learning_rate=0.0005,
    max_batches=1,
    class_weights=None,
    mu=0.0,
    client_folder="clients"
)

global_model, loss, accuracy = server.train_round()

print()
print("=" * 60)
print("IID + FEDAVG DOCKER TEST SUCCESSFUL")
print(f"Federated Loss: {loss:.4f}")
print(f"Federated Accuracy: {accuracy:.2f}%")
print("=" * 60)