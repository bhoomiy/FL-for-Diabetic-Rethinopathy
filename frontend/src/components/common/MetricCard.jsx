import StatusBadge from "./StatusBadge";

export default function MetricCard({ label, value, hint, icon: Icon, tone = "info", confirmed }) {
  return (
    <div className="card-surface p-5 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        {Icon ? (
          <span className="rounded-lg bg-primary/10 p-2 text-primary">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {confirmed === true ? (
          <StatusBadge tone="success">Confirmed result</StatusBadge>
        ) : confirmed === false ? (
          <StatusBadge tone="warning">Demo value</StatusBadge>
        ) : null}
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
    </div>
  );
}
