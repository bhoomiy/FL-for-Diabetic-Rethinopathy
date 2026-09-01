import { Activity, AlertTriangle, Building2, GitBranch, Layers, Repeat, ShieldCheck, Target } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import MetricCard from "@/components/common/MetricCard";
import ChartCard from "@/components/common/ChartCard";
import StatusBadge from "@/components/common/StatusBadge";
import AccuracyLineChart from "@/components/charts/AccuracyLineChart";
import ConfigurationSummary from "@/components/federated/ConfigurationSummary";
import { CLIENTS } from "@/data/clients";
import { CURRENT_BEST_CONFIG, RECENT_ACTIVITY, ROUND_CURVES } from "@/data/experiments";
import { GLOBAL_METRICS, getWeakestClass } from "@/data/metrics";
import { percent } from "@/components/charts/chartTheme";

export default function DashboardPage() {
  const weakest = getWeakestClass();

  const metrics = [
    { label: "Active clients", value: String(GLOBAL_METRICS.activeClients), icon: Building2, hint: "Participating hospitals" },
    { label: "Data distribution", value: GLOBAL_METRICS.distribution, icon: Layers, hint: "Current experiment split" },
    { label: "Global algorithm", value: GLOBAL_METRICS.algorithm, icon: GitBranch, hint: "μ = 0.01" },
    {
      label: "Validation accuracy",
      value: percent(GLOBAL_METRICS.validationAccuracy.value),
      icon: Target,
      confirmed: true,
    },
    {
      label: "Macro F1 score",
      value: GLOBAL_METRICS.macroF1.value?.toFixed(3) ?? "Not available",
      icon: Activity,
      confirmed: false,
    },
    { label: "Communication rounds", value: String(GLOBAL_METRICS.rounds), icon: Repeat, hint: "5 local epochs each" },
    { label: "Aggregation", value: GLOBAL_METRICS.aggregation, icon: Layers, hint: "Sample-size weighted" },
    { label: "Global status", value: GLOBAL_METRICS.status, icon: ShieldCheck, hint: `Model ${GLOBAL_METRICS.modelVersion}` },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Research overview"
        title="Global federated dashboard"
        description="Monitor the federated diabetic retinopathy experiment across four participating hospitals."
        actions={<StatusBadge tone="success" dot>Global model {GLOBAL_METRICS.modelVersion} · Converged</StatusBadge>}
      />

      <section className="card-surface relative overflow-hidden p-6 sm:p-8">
        <div className="max-w-2xl">
          <StatusBadge tone="info">Privacy-preserving federated learning</StatusBadge>
          <h2 className="mt-3 text-xl font-semibold leading-snug tracking-tight text-foreground sm:text-2xl">
            Federated intelligence for privacy-preserving retinal screening
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Raw retinal data never leaves an individual hospital. Each client trains locally on its own fundus images
            and transmits only model updates, which the global server aggregates with sample-size weighting before
            distributing an improved global model.
          </p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Training accuracy vs communication round"
          subtitle="Best configuration — Non-IID + Weighted FedProx"
          footer="Round-by-round curve values are demonstration data pending export from the training logs."
        >
          <AccuracyLineChart
            data={ROUND_CURVES}
            series={[{ dataKey: "trainAcc", name: "Training accuracy", color: "var(--color-chart-1)" }]}
          />
        </ChartCard>

        <ChartCard
          title="Validation accuracy vs communication round"
          subtitle="Round 20 matches the confirmed 80.33% validation accuracy"
          footer="Only the final round value (80.33%) is a confirmed result."
        >
          <AccuracyLineChart
            data={ROUND_CURVES}
            series={[{ dataKey: "valAcc", name: "Validation accuracy", color: "var(--color-chart-2)" }]}
          />
        </ChartCard>
      </div>

      <ChartCard
        title="FedAvg vs FedProx"
        subtitle="Validation accuracy under the Non-IID split"
        footer="FedAvg curve shown as demonstration data — the run has not been recorded yet."
      >
        <AccuracyLineChart
          data={ROUND_CURVES}
          series={[
            { dataKey: "valAcc", name: "FedProx (weighted)", color: "var(--color-chart-1)" },
            { dataKey: "fedavg", name: "FedAvg (demo)", color: "var(--color-chart-3)" },
          ]}
        />
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ChartCard title="Client participation" subtitle="Status of the four federated hospitals">
            <ul className="grid gap-3 sm:grid-cols-2">
              {CLIENTS.map((c) => (
                <li key={c.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <StatusBadge tone={c.status === "online" ? "success" : "danger"} dot>
                      {c.status === "online" ? "Online" : "Offline"}
                    </StatusBadge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {c.samples} samples · local accuracy {percent(c.localAccuracy)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Contribution weight {(c.contributionWeight * 100).toFixed(0)}%</p>
                </li>
              ))}
            </ul>
          </ChartCard>

          <ChartCard title="Recent experiment activity">
            <ul className="space-y-3">
              {RECENT_ACTIVITY.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
                  <span className="flex items-start gap-2 text-sm text-foreground">
                    <span
                      className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                        a.tone === "success" ? "bg-success" : a.tone === "warning" ? "bg-warning" : "bg-primary"
                      }`}
                      aria-hidden="true"
                    />
                    {a.text}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{a.time}</span>
                </li>
              ))}
            </ul>
          </ChartCard>
        </div>

        <div className="space-y-6">
          <ConfigurationSummary config={CURRENT_BEST_CONFIG} />

          <section className="card-surface border-destructive/30 p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-destructive">
              <AlertTriangle className="size-4" aria-hidden="true" />
              Weak class warning
            </h2>
            <p className="mt-3 text-sm text-foreground">
              <span className="font-semibold">{weakest.label}</span> currently has the lowest sensitivity at{" "}
              {percent(weakest.recall)} recall.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              The next optimization should target minority-class detection under Non-IID federated learning rather
              than overall accuracy alone.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
