import PageHeader from "@/components/common/PageHeader";
import ChartCard from "@/components/common/ChartCard";
import MetricCard from "@/components/common/MetricCard";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import DistributionChart from "@/components/charts/DistributionChart";
import PerformanceBar from "@/components/charts/PerformanceBar";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  fetchClients,
  fetchDashboard,
  fetchDataDistribution,
  fetchHospitalStatus,
} from "@/services/federatedService";
import { getClientById } from "@/data/clients";
import { DR_CLASSES } from "@/constants/drClasses";
import { percent } from "@/components/charts/chartTheme";

function useClient() {
  const { user } = useAuth();
  return getClientById(user?.clientId);
}

function NoClient() {
  return <EmptyState title="No hospital linked" description="This account is not associated with a federated client." />;
}


export function HospitalDashboardPage() {
  const { user } = useAuth();

  const clientId = Number(
    String(user?.clientId ?? "").replace("client-", "")
  );

  const validHospital = clientId >= 1 && clientId <= 4;

  const [model, setModel] = useState(null);
  const [hospital, setHospital] = useState(null);
  const [dataset, setDataset] = useState(null);
  const [monitoring, setMonitoring] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      if (!validHospital) {
        throw new Error("No hospital linked to this account.");
      }

      const workerUrl = `http://localhost:${5000 + clientId}`;

      const [modelResponse, healthResponse, datasetResponse, monitoringResponse] =
        await Promise.all([
          fetch("http://localhost:5000/api/async/model/info"),
          fetch(`${workerUrl}/health`),
          fetch(`${workerUrl}/async/dataset`),
          fetch("http://localhost:5000/api/async/dashboard"),
        ]);

      for (const response of [
        modelResponse,
        healthResponse,
        datasetResponse,
        monitoringResponse,
      ]) {
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }
      }

      const [modelData, healthData, datasetData, monitoringData] =
        await Promise.all([
          modelResponse.json(),
          healthResponse.json(),
          datasetResponse.json(),
          monitoringResponse.json(),
        ]);

      setModel(modelData);
      setHospital(healthData);
      setDataset(datasetData);
      setMonitoring(monitoringData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [clientId]);

  const submissions =
    monitoring?.events?.filter(
      (event) => Number(event.hospital_id) === clientId
    ) ?? [];

  const latestSubmission = submissions[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`FEDERATED CLIENT ${validHospital ? clientId : "—"}`}
        title={`Hospital ${validHospital ? clientId : ""} Dashboard`}
        description="Live hospital participation in the asynchronous federated learning network."
        actions={
          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        }
      />

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Hospital Status"
          value={hospital?.status ?? "Unavailable"}
          hint="Live Docker worker health"
        />
        <MetricCard
          label="Global Model"
          value={model ? `v${model.version}` : "—"}
          hint="Latest server version"
        />
        <MetricCard
          label="Custom Dataset"
          value={dataset?.status === "ready" ? String(dataset.samples) : "None"}
          hint="Uploaded images on this worker"
        />
        <MetricCard
          label="Submitted Updates"
          value={String(submissions.length)}
          hint="Recorded asynchronous submissions"
        />
      </div>

      <ChartCard
        title="Latest Hospital Contribution"
        subtitle="Recorded server-side aggregation decision"
      >
        {latestSubmission ? (
          <div className="space-y-3 text-sm">
            <p>
              <strong>Base model:</strong> v{latestSubmission.base_version}
            </p>
            <p>
              <strong>Decision:</strong>{" "}
              {latestSubmission.decision.replaceAll("_", " ")}
            </p>
            <p>
              <strong>Resulting global version:</strong>{" "}
              v{latestSubmission.new_version}
            </p>
            <p>
              <strong>Candidate macro F1:</strong>{" "}
              {latestSubmission.candidate_metrics?.macro_f1 != null
                ? `${(latestSubmission.candidate_metrics.macro_f1 * 100).toFixed(2)}%`
                : "Not evaluated"}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No asynchronous submissions recorded for this hospital.
          </p>
        )}
      </ChartCard>

      <ChartCard
        title="Federated Learning Workflow"
        subtitle="How this hospital participates"
      >
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["1. Synchronize", "Download the latest global checkpoint."],
            ["2. Train Locally", "Train the model using local retinal images."],
            ["3. Submit Update", "Send model parameters for server evaluation."],
          ].map(([title, description]) => (
            <div key={title} className="rounded-xl border border-border p-4">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  );
}



export function HospitalDatasetPage() {
  const { user } = useAuth();

  const clientId = Number(
    String(user?.clientId ?? "").replace("client-", "")
  );

  const validHospital = clientId >= 1 && clientId <= 4;
  const workerUrl = `http://localhost:${5000 + clientId}`;

  const [file, setFile] = useState(null);
  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refreshDataset() {
    if (!validHospital) {
      setError("No valid hospital is linked to this account.");
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${workerUrl}/async/dataset`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load dataset.");
      }

      setDataset(data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshDataset();
  }, [clientId]);

  async function uploadDataset() {
    if (!file || uploading || !validHospital) return;

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("dataset", file);

      const response = await fetch(
        `${workerUrl}/async/dataset/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Dataset upload failed.");
      }

      setMessage(
        `Dataset uploaded successfully to Hospital ${clientId}.`
      );

      setFile(null);
      await refreshDataset();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  const sampleCount = dataset?.samples ?? 0;
  const classDistribution =
    dataset?.class_distribution ??
    dataset?.distribution ??
    dataset?.class_counts ??
    null;

  const distributionEntries = Array.isArray(classDistribution)
    ? classDistribution.map((count, index) => [String(index), count])
    : classDistribution && typeof classDistribution === "object"
      ? Object.entries(classDistribution)
      : [];

  const classNames = [
    "No DR",
    "Mild",
    "Moderate",
    "Severe",
    "Proliferative DR",
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`HOSPITAL ${validHospital ? clientId : "—"}`}
        title="Local Dataset"
        description="Upload and manage the hospital's private retinal image dataset."
      />

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-700">
          {message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Hospital"
          value={validHospital ? `Hospital ${clientId}` : "—"}
          hint="Local federated client"
        />

        <MetricCard
          label="Uploaded Images"
          value={loading ? "Loading..." : String(sampleCount)}
          hint="Custom uploaded dataset"
        />

        <MetricCard
          label="Dataset Status"
          value={loading ? "Loading..." : dataset?.status ?? "Unknown"}
          hint="Reported by hospital worker"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Upload Retinal Dataset</h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Select the ZIP archive containing this hospital's retinal images
          and labels.csv file. Images are uploaded to the hospital worker.
        </p>

        <div className="mt-5 space-y-4">
          <input
            type="file"
            accept=".zip,application/zip"
            disabled={uploading}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setMessage("");
              setError("");
            }}
            className="block w-full rounded-lg border border-border p-3 text-sm"
          />

          {file && (
            <p className="text-sm text-muted-foreground">
              Selected: {file.name} (
              {(file.size / (1024 * 1024)).toFixed(2)} MB)
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={uploadDataset}
              disabled={!file || uploading || !validHospital}
              className="rounded-lg bg-pink-600 px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload Dataset"}
            </button>

            <button
              type="button"
              onClick={refreshDataset}
              disabled={loading || uploading}
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh Dataset"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Uploaded Dataset Details</h2>

        <div className="mt-4 space-y-3 text-sm">
          <p>
            <strong>Status:</strong> {dataset?.status ?? "Unknown"}
          </p>
          <p>
            <strong>Image count:</strong> {sampleCount}
          </p>
          <p>
            <strong>Hospital ID:</strong> {validHospital ? clientId : "—"}
          </p>
        </div>

        {distributionEntries.length > 0 ? (
          <div className="mt-5 space-y-3">
            <h3 className="font-semibold">Class Distribution</h3>

            {distributionEntries.map(([classId, count]) => {
              const numericClass = Number(classId);
              const label = Number.isInteger(numericClass) &&
                numericClass >= 0 && numericClass <= 4
                  ? classNames[numericClass]
                  : classId;

              const percentage = sampleCount > 0
                ? (Number(count) / sampleCount) * 100
                : 0;

              return (
                <div key={classId}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{label}</span>
                    <span>{count} images</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-pink-100">
                    <div
                      className="h-full rounded-full bg-pink-500"
                      style={{
                        width: `${Math.min(100, Math.max(0, percentage))}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            {sampleCount > 0
              ? "Dataset uploaded. Class counts are not included in the current dataset API response."
              : "No custom dataset uploaded yet."}
          </p>
        )}
      </div>
    </div>
  );
}

export function HospitalTrainingPage() {
  const { user } = useAuth();

  const clientId = Number(
    String(user?.clientId ?? "").replace("client-", "")
  );

  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const validHospital = clientId >= 1 && clientId <= 4;
  const workerUrl = `http://localhost:${5000 + clientId}`;

  async function runAction(action) {
    if (!validHospital) return;

    setBusy(action);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${workerUrl}/async/${action}`,
        { method: "POST" }
      );

      const data = await response.json();

      if (!response.ok || data.status === "error") {
        throw new Error(
          data.message || data.error || `${action} failed.`
        );
      }

      setResult(data);

      if (action === "sync") {
        setMessage("Latest global model synchronized successfully.");
      } else if (action === "train") {
        setMessage("Local training completed successfully.");
      } else {
        setMessage(
          `Update submitted. Server decision: ${
            data.decision?.status ??
            data.decision ??
            data.status ??
            "See response below"
          }`
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Federated Client ${clientId}`}
        title="Local Training"
        description="Independently train and submit a hospital model update."
        actions={
          <StatusBadge tone={busy ? "info" : "success"} dot>
            {busy ? `${busy} in progress` : "Ready"}
          </StatusBadge>
        }
      />

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-700">
          {message}
        </div>
      )}

      <ChartCard
        title="Asynchronous Training Workflow"
        subtitle="Each hospital operates independently"
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              action: "sync",
              title: "1. Synchronize",
              description: "Download the latest global model.",
            },
            {
              action: "train",
              title: "2. Train Locally",
              description: "Train using this hospital's retinal images.",
            },
            {
              action: "submit",
              title: "3. Submit Update",
              description: "Send model parameters for server evaluation.",
            },
          ].map((step) => (
            <div
              key={step.action}
              className="rounded-xl border border-border p-5"
            >
              <h3 className="font-semibold">{step.title}</h3>

              <p className="mt-2 min-h-12 text-sm text-muted-foreground">
                {step.description}
              </p>

              <button
                type="button"
                disabled={Boolean(busy) || !validHospital}
                onClick={() => runAction(step.action)}
                className="mt-4 w-full rounded-lg bg-pink-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy === step.action
                  ? "Processing..."
                  : step.action === "sync"
                    ? "Sync Global Model"
                    : step.action === "train"
                      ? "Start Training"
                      : "Submit Update"}
              </button>
            </div>
          ))}
        </div>
      </ChartCard>

      
      <ChartCard
        title="Local Training & Evaluation Results"
        subtitle="Live results returned by the hospital worker"
      >
        {result ? (
          <div className="space-y-5">
            {result.test_metrics ? (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    {
                      label: "Training Accuracy",
                      value: `${Number(result.train_accuracy).toFixed(2)}%`,
                    },
                    {
                      label: "Test Accuracy",
                      value: `${Number(result.test_metrics.test_accuracy).toFixed(2)}%`,
                    },
                    {
                      label: "Test Loss",
                      value: Number(result.test_metrics.test_loss).toFixed(4),
                    },
                    {
                      label: "Macro F1 Score",
                      value: Number(result.test_metrics.test_macro_f1).toFixed(4),
                    },
                  ].map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-xl border bg-card p-5 shadow-sm"
                    >
                      <p className="text-sm text-muted-foreground">
                        {metric.label}
                      </p>
                      <p className="mt-2 text-2xl font-bold">
                        {metric.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">
                      Training Images
                    </p>
                    <p className="mt-1 text-xl font-semibold">
                      {result.num_samples}
                    </p>
                  </div>

                  <div className="rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">
                      Test Images
                    </p>
                    <p className="mt-1 text-xl font-semibold">
                      {result.test_metrics.test_samples}
                    </p>
                  </div>

                  <div className="rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">
                      Global Model Version
                    </p>
                    <p className="mt-1 text-xl font-semibold">
                      v{result.base_version}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="font-medium">
                    {result.message || "Training completed"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Dataset: {result.dataset_source || "Unknown"}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {result.message || "Operation completed."}
              </p>
            )}

          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No operation performed in this session.
          </p>
        )}
      </ChartCard>

    </div>
  );
}


export function HospitalGlobalModelPage() {
  const { user } = useAuth();
  const clientId = Number(
    String(user?.clientId ?? "").replace("client-", "")
  );

  const [model, setModel] = useState(null);
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadModel() {
    setError("");

    try {
      const modelResponse = await fetch(
        "http://localhost:5000/api/async/model/info"
      );

      if (!modelResponse.ok) {
        throw new Error("Could not load global model.");
      }

      const modelData = await modelResponse.json();
      setModel(modelData);

      if (clientId >= 1 && clientId <= 4) {
        const workerResponse = await fetch(
          `http://localhost:${5000 + clientId}/health`
        );

        if (!workerResponse.ok) {
          throw new Error("Hospital worker is unavailable.");
        }

        setHospital(await workerResponse.json());
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadModel();
  }, [clientId]);

  async function syncModel() {
    if (clientId < 1 || clientId > 4) return;

    setSyncing(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `http://localhost:${5000 + clientId}/async/sync`,
        { method: "POST" }
      );

      const result = await response.json();

      if (!response.ok || result.status === "error") {
        throw new Error(
          result.message || result.error || "Synchronization failed."
        );
      }

      setMessage(
        `Hospital ${clientId} synchronized successfully.`
      );

      await loadModel();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <EmptyState
        title="Loading global model"
        description="Connecting to the asynchronous FL server."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Asynchronous Federated Learning"
        title="Global Model"
        description="Live global model information from the central server."
        actions={
          <StatusBadge tone={model ? "success" : "neutral"} dot>
            {model ? "Server connected" : "Unavailable"}
          </StatusBadge>
        }
      />

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-700">
          {message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Global Model Version"
          value={model ? `v${model.version}` : "—"}
          hint="Latest accepted model"
        />

        <MetricCard
          label="Checkpoint"
          value={model?.checkpoint ?? "—"}
          hint="Saved global model"
        />

        <MetricCard
          label="Hospital"
          value={clientId ? `Hospital ${clientId}` : "—"}
          hint="Current federated client"
        />

        <MetricCard
          label="Worker Status"
          value={hospital?.status ?? "Unavailable"}
          hint="Live hospital API health"
        />
      </div>

      <ChartCard
        title="Global model synchronization"
        subtitle="Retrieve the latest accepted global checkpoint"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The hospital downloads the latest global model
            before performing independent local training.
            Raw retinal images are not uploaded during
            synchronization.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={syncModel}
              disabled={syncing || !hospital}
              className="rounded-lg bg-pink-600 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {syncing ? "Synchronizing..." : "Sync Global Model"}
            </button>

            <button
              type="button"
              onClick={loadModel}
              className="rounded-lg border border-border px-5 py-3 text-sm font-medium"
            >
              Refresh
            </button>
          </div>
        </div>
      </ChartCard>

      <ChartCard
        title="Model information"
        subtitle="Retrieved directly from the asynchronous server"
      >
        <div className="space-y-3 text-sm">
          <p>
            <strong>Version:</strong>{" "}
            {model?.version ?? "—"}
          </p>
          <p>
            <strong>Checkpoint:</strong>{" "}
            {model?.checkpoint ?? "—"}
          </p>
          <p>
            <strong>Created:</strong>{" "}
            {model?.created_at
              ? new Date(model.created_at).toLocaleString()
              : "—"}
          </p>
          <p>
            <strong>Server status:</strong>{" "}
            {model?.status ?? "—"}
          </p>
        </div>
      </ChartCard>
    </div>
  );
}
