import { DR_CLASSES } from "@/constants/drClasses";
import { GLOBAL_METRICS } from "@/data/metrics";
import { delay } from "./apiClient";

export const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png"];
export const MAX_FILE_SIZE_MB = 8;

export function validateImageFile(file) {
  if (!file) return "Please choose a retinal fundus image.";
  if (!ACCEPTED_TYPES.includes(file.type)) return "Unsupported format. Upload a JPG, JPEG or PNG image.";
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) return `File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`;
  return null;
}

// Deterministic pseudo-random generator so the same file always produces the
// same demo result (no values that change on every render).
function seedFromFile(file) {
  const source = `${file.name}-${file.size}`;
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) % 100000;
  }
  return hash;
}

/**
 * Mock inference. To connect the real backend, replace the body with:
 *
 *   const formData = new FormData();
 *   formData.append("image", file);
 *   return apiRequest("/predict", { method: "POST", body: formData });
 */
export async function predictImage(file) {
  await delay(1400);
  const seed = seedFromFile(file);
  const raw = DR_CLASSES.map((c, i) => ((seed * (i + 3)) % 97) + 5);
  const total = raw.reduce((a, b) => a + b, 0);
  const probabilities = DR_CLASSES.map((c, i) => ({
    key: c.key,
    label: c.label,
    probability: raw[i] / total,
  }));
  const top = probabilities.reduce((a, b) => (b.probability > a.probability ? b : a));

  return {
    predictedClass: top.label,
    confidence: top.probability,
    probabilities,
    modelVersion: GLOBAL_METRICS.modelVersion,
    gradCamAvailable: true,
    simulated: true,
  };
}
