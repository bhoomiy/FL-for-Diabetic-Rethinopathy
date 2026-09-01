// Global + class-wise metrics for the best configuration (EXP-24).
// Only validation accuracy is a confirmed result; the rest are demonstration values.
export const GLOBAL_METRICS = {
  modelVersion: "v20",
  status: "Converged",
  rounds: 20,
  activeClients: 4,
  distribution: "Non-IID",
  algorithm: "FedProx",
  aggregation: "Weighted",
  validationAccuracy: { value: 0.8033, confirmed: true },
  macroPrecision: { value: 0.712, confirmed: false },
  macroRecall: { value: 0.681, confirmed: false },
  macroF1: { value: 0.694, confirmed: false },
  weightedF1: { value: 0.789, confirmed: false },
  balancedAccuracy: { value: 0.687, confirmed: false },
};

// Class-wise metrics (demonstration values). The weakest class is derived from
// this data at runtime — never hard-coded in the UI.
export const CLASS_METRICS = [
  { key: "no_dr", label: "No DR", precision: 0.88, recall: 0.93, f1: 0.9, support: 680 },
  { key: "mild", label: "Mild", precision: 0.71, recall: 0.68, f1: 0.69, support: 350 },
  { key: "moderate", label: "Moderate", precision: 0.74, recall: 0.77, f1: 0.75, support: 490 },
  { key: "severe", label: "Severe", precision: 0.61, recall: 0.42, f1: 0.5, support: 300 },
  { key: "proliferative", label: "Proliferative DR", precision: 0.62, recall: 0.6, f1: 0.61, support: 250 },
];

export const CLASS_METRICS_CONFIRMED = false;

// Class weights currently used for the imbalance strategy.
export const CLASS_WEIGHTS = [
  { key: "no_dr", label: "No DR", weight: 0.42 },
  { key: "mild", label: "Mild", weight: 1.1 },
  { key: "moderate", label: "Moderate", weight: 0.95 },
  { key: "severe", label: "Severe", weight: 1.85 },
  { key: "proliferative", label: "Proliferative DR", weight: 2.3 },
];

// Before / after class weighting comparison — mock data.
export const WEIGHTING_COMPARISON = [
  { label: "No DR", before: 0.95, after: 0.93 },
  { label: "Mild", before: 0.6, after: 0.68 },
  { label: "Moderate", before: 0.73, after: 0.77 },
  { label: "Severe", before: 0.31, after: 0.42 },
  { label: "Proliferative DR", before: 0.48, after: 0.6 },
];

// Returns the class with the lowest recall (weakest sensitivity).
export function getWeakestClass(metrics = CLASS_METRICS) {
  return metrics.reduce((worst, m) => (m.recall < worst.recall ? m : worst), metrics[0]);
}
