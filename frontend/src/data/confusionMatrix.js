// 5x5 confusion matrix for the best global model (demonstration values).
// Rows = actual class, columns = predicted class. Replace with GET /confusion-matrix.
export const CONFUSION_LABELS = ["No DR", "Mild", "Moderate", "Severe", "Proliferative DR"];

export const CONFUSION_MATRIX = [
  [632, 30, 12, 4, 2],
  [48, 238, 51, 8, 5],
  [22, 46, 377, 33, 12],
  [8, 18, 96, 126, 52],
  [4, 6, 30, 60, 150],
];

export const CONFUSION_MATRIX_CONFIRMED = false;
