import { ArrowDown, ArrowUp, Building2, Server, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import ChartCard from "@/components/common/ChartCard";
import StatusBadge from "@/components/common/StatusBadge";
import ConfigurationSummary from "@/components/federated/ConfigurationSummary";
import { useEffect, useState } from "react";
import {
  fetchDashboard,
  fetchClients,
} from "@/services/federatedService";

const getSteps = (localEpochs = 1) => [
  {
    title: "Global model broadcast",
    text: "The server sends the current global weights to every participating hospital."
  },
  {
    title: "Local training",
    text: `Each hospital trains for ${localEpochs} local epoch${localEpochs === 1 ? "" : "s"} on its own retinal fundus images.`
  },
  {
    title: "Update transmission",
    text: "Only model parameter updates are uploaded — never patient images."
  },
  {
    title: "Weighted aggregation",
    text: "The server aggregates updates weighted by each client's sample count."
  },
  {
    title: "Improved global model",
    text: "The new global model is redistributed for the next communication round."
  },
];

export default function FederatedSetupPage() {
  const [dashboardData, setDashboardData] = useState(null);
const [clients, setClients] = useState([]);

useEffect(() => {
  fetchDashboard()
    .then((data) => {
      setDashboardData(data);
    })
    .catch((error) => {
      console.error("Failed to fetch dashboard data:", error);
    });
}, []);

useEffect(() => {
  fetchClients()
    .then((data) => {
      setClients(data);
    })
    .catch((error) => {
      console.error("Failed to fetch clients:", error);
    });
}, []);

const currentConfig = dashboardData
  ? {
      experimentId: dashboardData.experiment_id,
      distribution: dashboardData.distribution,
      aggregation: "Weighted",
      algorithm: dashboardData.algorithm,
      learningRate: dashboardData.learning_rate,
      mu: dashboardData.mu,
      classWeighting: dashboardData.class_weighting,
      rounds: dashboardData.rounds,
      localEpochs: dashboardData.local_epochs,
      batchSize: dashboardData.batch_size,
      validationAccuracy: dashboardData.validation_accuracy,
    }
  : null;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Architecture"
        title="Federated setup"
        description="How the global server and the four hospital clients exchange model updates without sharing patient data."
        actions={
  dashboardData ? (
    <StatusBadge tone="info">
      {dashboardData.active_clients} clients · {dashboardData.rounds} round
      {dashboardData.rounds === 1 ? "" : "s"}
    </StatusBadge>
  ) : (
    <StatusBadge tone="info">Loading setup...</StatusBadge>
  )
}
      />

      <ChartCard title="Network topology" subtitle="Global server with four hospital clients">
        <div className="flex flex-col items-center gap-6">
          <div className="w-full max-w-sm rounded-2xl border border-primary/40 bg-primary/5 p-5 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/15 text-primary">
              <Server className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-semibold text-foreground">Global aggregation server</p>
            <p className="mt-1 text-xs text-muted-foreground">
  {dashboardData
    ? `${dashboardData.algorithm} · weighted aggregation · ${dashboardData.experiment_id}`
    : "Loading global model..."}
</p>
          </div>

          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ArrowDown className="size-4 text-primary" aria-hidden="true" /> Global weights down
            </span>
            <span className="flex items-center gap-1">
              <ArrowUp className="size-4 text-success" aria-hidden="true" /> Model updates up
            </span>
          </div>

          <ul className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {clients.map((c) => (
              <li key={c.id} className="rounded-2xl border border-border bg-surface p-4 text-center">
                <span className="mx-auto grid size-10 place-items-center rounded-xl bg-muted text-foreground">
                  <Building2 className="size-5" aria-hidden="true" />
                </span>
                <p className="mt-2 text-sm font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.samples} local samples</p>
                <div className="mt-2 flex justify-center">
                  <StatusBadge tone={c.status === "online" ? "success" : "danger"} dot>
                    {c.status === "online" ? "Online" : "Offline"}
                  </StatusBadge>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard
          title="Communication round lifecycle"
          subtitle="One full round of federated training"
          className="lg:col-span-2"
        >
          <ol className="space-y-4">
            {getSteps(dashboardData?.local_epochs ?? 1).map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-primary/40 bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{s.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </ChartCard>

        <div className="space-y-6">
          <section className="card-surface p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <ShieldCheck className="size-4 text-success" aria-hidden="true" />
              Privacy guarantees
            </h2>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
              <li>Retinal images remain inside each hospital's own infrastructure.</li>
              <li>Only numerical model parameters cross the network boundary.</li>
              <li>The proximal term in FedProx limits client drift on heterogeneous data.</li>
              <li>Aggregation is weighted by local sample count, never by raw records.</li>
            </ul>
          </section>
          {currentConfig && (
  <ConfigurationSummary config={currentConfig} />
)}
        </div>
      </div>
    </div>
  );
}
