import { Building2, Clock, Layers, Weight } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import { percent } from "@/components/charts/chartTheme";

export default function ClientCard({ client, onSelect }) {
  const online = client.status === "online";
  return (
    <button
      type="button"
      onClick={() => onSelect?.(client)}
      className="card-surface w-full p-5 text-left transition-colors hover:border-primary/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">{client.name}</p>
            <p className="text-xs text-muted-foreground">
              Client {client.clientNumber} · {client.region}
            </p>
          </div>
        </div>
        <StatusBadge tone={online ? "success" : "danger"} dot>
          {online ? "Online" : "Offline"}
        </StatusBadge>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 text-xs">
        <div>
          <dt className="text-muted-foreground">Local samples</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-foreground">{client.samples}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Local accuracy</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-foreground">{percent(client.localAccuracy)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-muted-foreground">
            <Layers className="size-3" aria-hidden="true" /> Local epochs
          </dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-foreground">{client.localEpochs}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-muted-foreground">
            <Weight className="size-3" aria-hidden="true" /> Contribution
          </dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-foreground">
            {(client.contributionWeight * 100).toFixed(0)}%
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="size-3" aria-hidden="true" /> Last sync {client.lastSync}
        </span>
        <StatusBadge tone={client.trainingStatus === "training" ? "info" : "neutral"}>
          {client.trainingStatus === "training" ? "Training locally" : "Idle"}
        </StatusBadge>
      </div>
    </button>
  );
}
