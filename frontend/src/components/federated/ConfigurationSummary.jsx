import { CheckCircle2 } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import { percent } from "@/components/charts/chartTheme";

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-b-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-xs font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

export default function ConfigurationSummary({ config, title = "Current best configuration", showAccuracy = true }) {
  return (
    <section className="card-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
          {title}
        </h2>
        {config.experimentId ? <StatusBadge tone="success">{config.experimentId}</StatusBadge> : null}
      </div>

      <dl className="mt-4">
        <Row label="Data distribution" value={config.distribution} />
        <Row label="Aggregation" value={config.aggregation} />
        <Row label="Algorithm" value={config.algorithm} />
        <Row label="Learning rate" value={config.learningRate} />
        <Row label="FedProx μ" value={config.mu ?? "Not applicable"} />
        <Row label="Class weighting" value={config.classWeighting ? "Enabled" : "Disabled"} />
        <Row label="Communication rounds" value={config.rounds} />
        <Row label="Local epochs" value={config.localEpochs ?? 5} />
        <Row label="Batch size" value={config.batchSize ?? 32} />
        {showAccuracy ? (
          <Row
            label="Validation accuracy"
            value={config.validationAccuracy != null ? `${config.validationAccuracy.toFixed(2)}%` : "Not available"}
          />
        ) : null}
      </dl>
    </section>
  );
}
