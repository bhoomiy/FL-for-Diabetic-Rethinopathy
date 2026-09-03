import { EXPERIMENTS, ROUND_CURVES, CURRENT_BEST_CONFIG } from "@/data/experiments";
import { apiRequest, withMockFallback, delay } from "./apiClient";

// GET /experiments
export async function fetchExperiments() {
  return withMockFallback(() => apiRequest("/experiments"), EXPERIMENTS);
}

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

// POST /experiments — simulated run. No training happens in the browser.
export async function startExperiment(config, onProgress) {
  const totalRounds = Number(config.rounds) || 20;
  for (let round = 1; round <= totalRounds; round += 1) {
    await delay(160);
    onProgress?.({ round, totalRounds, progress: (round / totalRounds) * 100 });
  }
  return { experimentId: `EXP-${25 + Math.floor(totalRounds % 3)}`, status: "queued", simulated: true };
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
