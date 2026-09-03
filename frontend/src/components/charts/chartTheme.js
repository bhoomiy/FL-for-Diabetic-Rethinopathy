// Shared Recharts styling so every chart matches the dark clinical theme.
export const AXIS_PROPS = {
  stroke: "var(--color-muted-foreground)",
  tick: { fill: "var(--color-muted-foreground)", fontSize: 11 },
  tickLine: false,
  axisLine: false,
};

export const GRID_PROPS = {
  stroke: "var(--color-border)",
  strokeDasharray: "3 3",
  vertical: false,
};

export const TOOLTIP_PROPS = {
  cursor: { fill: "var(--color-muted)", opacity: 0.35 },
  contentStyle: {
    background: "var(--color-popover)",
    border: "1px solid var(--color-border)",
    borderRadius: 12,
    fontSize: 12,
    color: "var(--color-popover-foreground)",
  },
  labelStyle: { color: "var(--color-muted-foreground)" },
};

export const percent = (v) => (v == null ? "Not available" : `${(v * 100).toFixed(2)}%`);
export const percent1 = (v) => (v == null ? "N/A" : `${(v * 100).toFixed(1)}%`);
