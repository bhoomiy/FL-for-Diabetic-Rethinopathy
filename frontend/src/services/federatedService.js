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
export async function fetchTrainingHistory(
  distribution = "iid",
  experimentId = null
) {
  const query = experimentId
    ? `experiment_id=${encodeURIComponent(experimentId)}`
    : `distribution=${encodeURIComponent(distribution)}`;

  return apiRequest(
  `/training-history?${query}`,
  { timeoutMs: 30000 }
);
}

// GET /data-distribution
export async function fetchDataDistribution() {
  return apiRequest("/data-distribution");
}



// GET /class-imbalance
export async function fetchClassImbalance() {
  return apiRequest("/class-imbalance");
}

// GET /model-improvement
export async function fetchModelImprovement(distribution = "iid") {
  return apiRequest(
    `/model-improvement?distribution=${distribution}`
  );
}

// GET /model-performance
export async function fetchModelPerformance(distribution = "iid") {
  return apiRequest(
    `/model-performance?distribution=${distribution}`
  );
}

// GET /class-metrics
export async function fetchClassMetrics(
  distribution = "iid",
  experimentId = null
) {
  const query = experimentId
    ? `experiment_id=${encodeURIComponent(experimentId)}`
    : `distribution=${encodeURIComponent(distribution)}`;

  return apiRequest(
    `/class-metrics?${query}`
  );
}

// GET /confusion-matrix
export async function fetchConfusionMatrix(distribution = "iid") {
  return apiRequest(
    `/confusion-matrix?distribution=${distribution}`
  );
}

// GET /hospitals/:id/status
export async function fetchHospitalStatus(hospitalId) {
  return apiRequest(`/hospitals/${hospitalId}/status`);
}