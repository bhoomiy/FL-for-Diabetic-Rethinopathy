import { EXPERIMENTS, ROUND_CURVES, CURRENT_BEST_CONFIG } from "@/data/experiments";
import { apiRequest, withMockFallback, delay } from "./apiClient";



// GET /experiments/:id
export async function fetchExperiment(id) {
  return withMockFallback(
    () => apiRequest(`/experiments/${id}`),
    EXPERIMENTS.find((e) => e.id === id) ?? null,
  );
}

// GET /dashboard/summary
export async function fetchDashboardSummary() {
  return withMockFallback(() => apiRequest("/dashboard/summary"), {
    best: CURRENT_BEST_CONFIG,
    curves: ROUND_CURVES,
  });
}

// POST /experiments/start — starts a real federated learning experiment through the backend.
const API_BASE = "http://localhost:5000/api";

export async function startExperiment(config) {
  const payload = {
    distribution: config.distribution.toLowerCase().replace("-", "_"),
    algorithm: config.algorithm.toLowerCase(),
    rounds: config.rounds,
    local_epochs: config.localEpochs,
    batch_size: config.batchSize,
    learning_rate: config.learningRate,
    mu: config.algorithm === "FedProx" ? config.mu : 0,
    use_class_weights: config.classWeighting,
    max_batches: 1,
    test_run: false,
  };

  const response = await fetch(`${API_BASE}/experiments/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to start experiment");
  }

  return response.json();
}

export async function fetchExperiments() {
  const response = await fetch("http://localhost:5000/api/experiments");

  if (!response.ok) {
    throw new Error("Failed to fetch experiments");
  }

  return response.json();
}

export function exportExperimentsToCsv(rows) {
  const headers = [
    "Experiment ID",
    "Date",
    "Algorithm",
    "Distribution",
    "Aggregation",
    "Learning rate",
    "Mu",
    "Class weighting",
    "Rounds",
    "Accuracy",
    "Macro F1",
    "Weakest class",
    "Status",
  ];
  const lines = rows.map((r) =>
    [
      r.id,
      r.date,
      r.algorithm,
      r.distribution,
      r.aggregation,
      r.learningRate,
      r.mu ?? "-",
      r.classWeighting ? "Yes" : "No",
      r.rounds,
      r.accuracy != null ? (r.accuracy * 100).toFixed(2) + "%" : "Not available",
      r.macroF1 != null ? r.macroF1.toFixed(3) : "Not available",
      r.weakestClass,
      r.status,
    ].join(","),
  );
  return [headers.join(","), ...lines].join("\n");
}
