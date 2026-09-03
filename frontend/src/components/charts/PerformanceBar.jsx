import { AlertTriangle } from "lucide-react";

const TONE_BG = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
};

// Horizontal metric bar used on the class performance pages.
export default function PerformanceBar({ label, value, tone = "primary", weak = false, suffix }) {
  const pct = Math.max(0, Math.min(100, (value ?? 0) * 100));
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={`flex items-center gap-1.5 font-medium ${weak ? "text-destructive" : "text-foreground"}`}>
          {weak ? <AlertTriangle className="size-3.5" aria-hidden="true" /> : null}
          {label}
        </span>
        <span className="tabular-nums text-muted-foreground">
          {value == null ? "Not available" : `${pct.toFixed(1)}%`}
          {suffix ? ` ${suffix}` : ""}
        </span>
      </div>
      <div
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full rounded-full transition-all ${TONE_BG[tone]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
