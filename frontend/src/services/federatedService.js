import { CLIENTS, getClientById } from "@/data/clients";
import { GLOBAL_METRICS, CLASS_METRICS } from "@/data/metrics";
import { CONFUSION_MATRIX, CONFUSION_LABELS } from "@/data/confusionMatrix";
import { apiRequest, withMockFallback, delay } from "./apiClient";

// GET /clients
export async function fetchClients() {
  return apiRequest("/clients");
}

// GET /clients/:id
export async function fetchClient(id) {
  return withMockFallback(() => apiRequest(`/clients/${id}`), getClientById(id));
}

// GET /metrics/global
export async function fetchGlobalMetrics() {
  return withMockFallback(() => apiRequest("/metrics/global"), GLOBAL_METRICS);
}

// GET /metrics/classes
export async function fetchClassMetrics() {
  return apiRequest("/class-metrics");
}

// GET /confusion-matrix
export async function fetchConfusionMatrix() {
  return apiRequest("/confusion-matrix");
}

// POST /clients/:id/train — simulated only, nothing is trained in the browser.
export async function startLocalTraining(clientId, onProgress) {
  for (let epoch = 1; epoch <= 5; epoch += 1) {
    await delay(600);
    onProgress?.({ epoch, totalEpochs: 5, progress: (epoch / 5) * 100 });
  }
  return { clientId, status: "completed", simulated: true };
}

// POST /clients/:id/synchronize — simulated only.
export async function synchronizeGlobalModel(clientId) {
  await delay(1200);
  return { clientId, modelVersion: GLOBAL_METRICS.modelVersion, simulated: true };
}

// GET /dashboard
export async function fetchDashboard() {
  return apiRequest("/dashboard");
}

// GET /training-history
export async function fetchTrainingHistory() {
  return apiRequest("/training-history");
}

// GET /data-distribution
export async function fetchDataDistribution() {
  return apiRequest("/data-distribution");
}

// GET /model-performance
export async function fetchModelPerformance() {
  return apiRequest("/model-performance");
}

// GET /class-imbalance
export async function fetchClassImbalance() {
  return apiRequest("/class-imbalance");
}

// GET /model-improvement
export async function fetchModelImprovement() {
  return apiRequest("/model-improvement");
}



