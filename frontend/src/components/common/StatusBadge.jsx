const TONES = {
  success: "bg-success/12 text-success border-success/30",
  warning: "bg-warning/12 text-warning border-warning/30",
  danger: "bg-destructive/12 text-destructive border-destructive/30",
  info: "bg-primary/12 text-primary border-primary/30",
  neutral: "bg-muted text-muted-foreground border-border",
};

export default function StatusBadge({ tone = "neutral", children, dot = false, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${TONES[tone] ?? TONES.neutral} ${className}`}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
