import { useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import ChartCard from "@/components/common/ChartCard";
import Modal from "@/components/common/Modal";
import StatusBadge from "@/components/common/StatusBadge";
import ClientCard from "@/components/federated/ClientCard";
import DistributionChart from "@/components/charts/DistributionChart";
import { CLIENTS } from "@/data/clients";
import { DR_CLASSES } from "@/constants/drClasses";
import { percent } from "@/components/charts/chartTheme";

const distributionRows = CLIENTS.map((c) => ({ client: c.name, ...c.distribution }));

export default function ClientsPage() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Participants"
        title="Hospital clients"
        description="Local dataset size, training status and contribution weight for every participating hospital."
        actions={<StatusBadge tone="info">{CLIENTS.filter((c) => c.status === "online").length} of {CLIENTS.length} online</StatusBadge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CLIENTS.map((c) => (
          <ClientCard key={c.id} client={c} onSelect={setSelected} />
        ))}
      </div>

      <ChartCard
        title="Local class distribution per client"
        subtitle="Non-IID split — each hospital sees a different mix of DR stages"
        footer="Sample counts are demonstration data representing the Non-IID partition."
      >
        <DistributionChart data={distributionRows} />
      </ChartCard>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name ?? ""}>
        {selected ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground">Region</p>
                <p className="mt-0.5 font-medium text-foreground">{selected.region}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Global model version</p>
                <p className="mt-0.5 font-medium text-foreground">{selected.globalModelVersion}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Local samples</p>
                <p className="mt-0.5 font-medium tabular-nums text-foreground">{selected.samples}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Local accuracy</p>
                <p className="mt-0.5 font-medium tabular-nums text-foreground">{percent(selected.localAccuracy)}</p>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class distribution</h3>
              <ul className="mt-2 space-y-1.5">
                {DR_CLASSES.map((c) => (
                  <li key={c.key} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-foreground">
                      <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} aria-hidden="true" />
                      {c.label}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{selected.distribution[c.key]} samples</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent participation</h3>
              <ul className="mt-2 space-y-1.5">
                {selected.participation.map((p) => (
                  <li key={p.round} className="flex items-center justify-between text-xs">
                    <span className="text-foreground">Round {p.round}</span>
                    <span className="flex items-center gap-2">
                      <span className="tabular-nums text-muted-foreground">
                        {p.accuracy != null ? percent(p.accuracy) : "Skipped"}
                      </span>
                      <StatusBadge tone={p.participated ? "success" : "neutral"}>
                        {p.participated ? "Participated" : "Missed"}
                      </StatusBadge>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
