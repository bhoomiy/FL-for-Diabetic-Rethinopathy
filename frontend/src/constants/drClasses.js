// The five diabetic retinopathy stages used across the whole application.
export const DR_CLASSES = [
  { id: 0, key: "no_dr", label: "No DR", short: "No DR", color: "var(--color-chart-2)" },
  { id: 1, key: "mild", label: "Mild", short: "Mild", color: "var(--color-chart-1)" },
  { id: 2, key: "moderate", label: "Moderate", short: "Moderate", color: "var(--color-chart-5)" },
  { id: 3, key: "severe", label: "Severe", short: "Severe", color: "var(--color-chart-3)" },
  {
    id: 4,
    key: "proliferative",
    label: "Proliferative DR",
    short: "Proliferative",
    color: "var(--color-chart-4)",
  },
];

export const DR_CLASS_LABELS = DR_CLASSES.map((c) => c.label);

export const RESEARCH_DISCLAIMER =
  "For research and educational use only. Model predictions must not replace clinical diagnosis.";
