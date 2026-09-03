import { Activity, AlertTriangle, Building2, GitBranch, Layers, Repeat, ShieldCheck, Target } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import MetricCard from "@/components/common/MetricCard";
import ChartCard from "@/components/common/ChartCard";
import StatusBadge from "@/components/common/StatusBadge";
import AccuracyLineChart from "@/components/charts/AccuracyLineChart";
import ConfigurationSummary from "@/components/federated/ConfigurationSummary";
import { useEffect, useState } from "react";
import { fetchExperiments } from "@/services/experimentService";
import {
  fetchDashboard,
  fetchTrainingHistory,
  fetchClients,
  fetchClassMetrics,
} from "@/services/federatedService";

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [trainingHistory, setTrainingHistory] = useState([]);
  const [clients, setClients] = useState([]);
  const [recentExperiments, setRecentExperiments] = useState([]);
  const [classMetrics, setClassMetrics] = useState([]);

    const weakest = classMetrics.length
    ? classMetrics.reduce((lowest, current) =>
        current.recall < lowest.recall
          ? current
          : lowest
      )
    : null;

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
  if (!dashboardData?.experiment_id) return;

  fetchTrainingHistory(
    dashboardData.distribution,
    dashboardData.experiment_id
  )
    .then((data) => {
      setTrainingHistory(data.history ?? []);
    })
    .catch((error) => {
      console.error(
        "Failed to fetch training history:",
        error
      );
    });
}, [dashboardData]);

useEffect(() => {
  fetchExperiments()
    .then((data) => {
      setRecentExperiments(data.slice(-5).reverse());
    })
    .catch((error) => {
      console.error(
        "Failed to fetch recent experiments:",
        error
      );
    });
}, []);

  useEffect(() => {
  if (!dashboardData?.experiment_id) return;

  fetchClassMetrics(
    dashboardData.distribution,
    dashboardData.experiment_id
  )
    .then((data) => {
      setClassMetrics(data.class_metrics ?? data);
    })
    .catch((error) => {
      console.error(
        "Failed to fetch class metrics:",
        error
      );
    });
}, [dashboardData]);

useEffect(() => {
  fetchClients()
    .then((data) => {
      setClients(data);
    })
    .catch((error) => {
      console.error("Failed to fetch clients:", error);
    });
}, []);


    const metrics = [
    {
      label: "Active clients",
      value: dashboardData
        ? String(dashboardData.active_clients)
        : "Loading...",
      icon: Building2,
      hint: "Participating hospitals",
    },

    {
      label: "Data distribution",
      value: dashboardData?.distribution ?? "Loading...",
      icon: Layers,
      hint: "Current experiment split",
    },

    {
      label: "Global algorithm",
      value: dashboardData?.algorithm ?? "Loading...",
      icon: GitBranch,
      hint: dashboardData
  ? `μ = ${dashboardData.mu}`
  : "Loading...",
    },

    {
      label: "Validation accuracy",
      value: dashboardData
        ? `${dashboardData.validation_accuracy.toFixed(2)}%`
        : "Loading...",
      icon: Target,
      confirmed: true,
    },

    {
      label: "Macro F1 score",
      value: dashboardData
        ? dashboardData.macro_f1.toFixed(3)
        : "Loading...",
      icon: Activity,
      confirmed: true,
    },

    {
      label: "Communication rounds",
      value: dashboardData
        ? String(dashboardData.rounds)
        : "Loading...",
      icon: Repeat,
      hint: "Completed federated rounds",
    },

    {
      label: "Aggregation",
      value: "Weighted FedAvg",
      icon: Layers,
      hint: "Sample-size weighted aggregation",
    },

    {
      label: "Global status",
      value: dashboardData ? "Completed" : "Loading...",
      icon: ShieldCheck,
      hint: dashboardData
        ? `Latest experiment: ${dashboardData.experiment_id}`
        : "Loading latest experiment",
    },
  ];

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
        eyebrow="Research overview"
        title="Global federated dashboard"
        description="Monitor the federated diabetic retinopathy experiment across four participating hospitals."
        actions={
          dashboardData ? (
            <StatusBadge tone="success" dot>
              {dashboardData.experiment_id} · Completed
            </StatusBadge>
          ) : (
            <StatusBadge tone="info">
              Loading model...
            </StatusBadge>
          )
        }
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
  subtitle={
    dashboardData
      ? `${dashboardData.distribution.toUpperCase()} + ${dashboardData.algorithm}`
      : "Loading experiment..."
  }
  footer="Round-by-round values from the latest federated experiment."
>
          <AccuracyLineChart
            data={trainingHistory}
            series={[{ dataKey: "trainAcc", name: "Training accuracy", color: "var(--color-chart-1)" }]}
          />
        </ChartCard>

        <ChartCard
  title="Validation accuracy vs communication round"
  subtitle={
    dashboardData
      ? `${dashboardData.distribution.toUpperCase()} ${dashboardData.algorithm} validation accuracy across ${dashboardData.rounds} communication round${dashboardData.rounds === 1 ? "" : "s"}`
      : "Loading experiment..."
  }
  footer={
    dashboardData
      ? `Best validation accuracy: ${dashboardData.validation_accuracy.toFixed(2)}%.`
      : "Loading validation results..."
  }
>
          <AccuracyLineChart
            data={trainingHistory}
            series={[{ dataKey: "valAcc", name: "Validation accuracy", color: "var(--color-chart-2)" }]}
          />
        </ChartCard>
      </div>


      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ChartCard title="Client participation" subtitle="Status of the four federated hospitals">
            <ul className="grid gap-3 sm:grid-cols-2">
              {clients.map((c) => (
                <li key={c.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <StatusBadge tone={c.status === "online" ? "success" : "danger"} dot>
                      {c.status === "online" ? "Online" : "Offline"}
                    </StatusBadge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {c.samples} samples
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Contribution weight{" "}
                    {(c.contributionWeight * 100).toFixed(2)}%
                  </p>
                </li>
              ))}
            </ul>
          </ChartCard>

          <ChartCard title="Recent experiment activity">
  {recentExperiments.length === 0 ? (
    <p className="text-sm text-muted-foreground">
      No completed experiments found.
    </p>
  ) : (
    <ul className="space-y-3">
      {recentExperiments.map((experiment) => (
        <li
          key={experiment.id}
          className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0"
        >
          <span className="flex items-start gap-2 text-sm text-foreground">
            <span
              className="mt-1.5 size-1.5 shrink-0 rounded-full bg-success"
              aria-hidden="true"
            />

            {experiment.id} completed —{" "}
            {experiment.algorithm} ·{" "}
            {experiment.distribution} ·{" "}
            {experiment.accuracy != null
              ? `${experiment.accuracy.toFixed(2)}% validation accuracy`
              : "accuracy unavailable"}
          </span>
        </li>
      ))}
    </ul>
  )}
</ChartCard>
        </div>

        <div className="space-y-6">
          {currentConfig && (
  <ConfigurationSummary config={currentConfig} />
)}

          <section className="card-surface border-destructive/30 p-5">
  <h2 className="flex items-center gap-2 text-base font-semibold text-destructive">
    <AlertTriangle className="size-4" aria-hidden="true" />
    Weak class warning
  </h2>

  {weakest ? (
    <>
      <p className="mt-3 text-sm text-foreground">
        <span className="font-semibold">
          {weakest.class_name}
        </span>{" "}
        currently has the lowest sensitivity at{" "}
        {(weakest.recall * 100).toFixed(2)}% recall.
      </p>

      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        The next optimization should target minority-class detection
        rather than overall accuracy alone.
      </p>
    </>
  ) : (
    <p className="mt-3 text-sm text-muted-foreground">
      Loading class metrics...
    </p>
  )}
</section>
        </div>
      </div>
    </div>
);
}