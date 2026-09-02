import PageHeader from "@/components/common/PageHeader";
import ChartCard from "@/components/common/ChartCard";
import MetricCard from "@/components/common/MetricCard";
import StatusBadge from "@/components/common/StatusBadge";
import PerformanceBar from "@/components/charts/PerformanceBar";
import ConfusionMatrixTable from "@/components/federated/ConfusionMatrixTable";
import AccuracyLineChart from "@/components/charts/AccuracyLineChart";
import { CLASS_METRICS,  GLOBAL_METRICS,  getWeakestClass } from "@/data/metrics";
import { EXPERIMENTS } from "@/data/experiments";
import { percent } from "@/components/charts/chartTheme";
import { useEffect, useState } from "react";
import {
  fetchModelPerformance,
  fetchTrainingHistory,
  fetchClassMetrics,
  fetchConfusionMatrix,
  fetchClassImbalance,
} from "@/services/federatedService";

export function ModelPerformancePage() {
  const [metrics, setMetrics] = useState(null);
  const [trainingHistory, setTrainingHistory] = useState([]);

  useEffect(() => {
    fetchModelPerformance()
      .then((data) => {
        setMetrics(data);
      })
      .catch((error) => {
        console.error("Failed to fetch model performance:", error);
      });
  }, []);

  useEffect(() => {
    fetchTrainingHistory()
      .then((data) => {
        setTrainingHistory(data);
      })
      .catch((error) => {
        console.error("Failed to fetch training history:", error);
      });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evaluation"
        title="Model performance"
        description="Performance of the global model from the IID FedAvg federated training run."
        actions={
          <StatusBadge tone="success" dot>
            IID · FedAvg
          </StatusBadge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Validation accuracy"
          value={
            metrics
              ? `${metrics.validation_accuracy.toFixed(2)}%`
              : "Loading..."
          }
          confirmed
        />

        <MetricCard
          label="Training accuracy"
          value={
            metrics
              ? `${metrics.train_accuracy.toFixed(2)}%`
              : "Loading..."
          }
          confirmed
        />

        <MetricCard
          label="Macro precision"
          value={
            metrics
              ? metrics.macro_precision.toFixed(3)
              : "Loading..."
          }
          confirmed
        />

        <MetricCard
          label="Macro recall"
          value={
            metrics
              ? metrics.macro_recall.toFixed(3)
              : "Loading..."
          }
          confirmed
        />

        <MetricCard
          label="Macro F1"
          value={
            metrics
              ? metrics.macro_f1.toFixed(3)
              : "Loading..."
          }
          confirmed
        />

        <MetricCard
          label="Weighted F1"
          value={
            metrics
              ? metrics.weighted_f1.toFixed(3)
              : "Loading..."
          }
          confirmed
        />
      </div>

      <ChartCard
        title="Accuracy across communication rounds"
        subtitle="IID + FedAvg"
        footer="Round-by-round values loaded from the actual federated training results."
      >
        <AccuracyLineChart
          data={trainingHistory}
          height={300}
          series={[
            {
              dataKey: "trainAcc",
              name: "Training",
              color: "var(--color-chart-1)",
            },
            {
              dataKey: "valAcc",
              name: "Validation",
              color: "var(--color-chart-2)",
            },
          ]}
        />
      </ChartCard>
    </div>
  );
}

export function ClassMetricsPage() {
  const [classMetrics, setClassMetrics] = useState([]);

  useEffect(() => {
    fetchClassMetrics()
      .then((data) => {
        setClassMetrics(data);
      })
      .catch((error) => {
        console.error("Failed to fetch class metrics:", error);
      });
  }, []);

  const weakest =
    classMetrics.length > 0
      ? classMetrics.reduce((a, b) => (b.f1 < a.f1 ? b : a))
      : { key: "", label: "Loading..." };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evaluation"
        title="Class-wise metrics"
        description="Precision, recall and F1 for each diabetic retinopathy stage from the IID FedAvg global model."
        actions={
          <StatusBadge tone="success">
            Actual evaluation results
          </StatusBadge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Recall (sensitivity) per class"
          subtitle={`Weakest class by F1: ${weakest.label}`}
        >
          <div className="space-y-4">
            {classMetrics.map((c) => (
              <PerformanceBar
                key={c.key}
                label={c.label}
                value={c.recall}
                weak={c.key === weakest.key}
                tone={c.key === weakest.key ? "danger" : "primary"}
              />
            ))}
          </div>
        </ChartCard>

        <ChartCard title="F1 score per class">
          <div className="space-y-4">
            {classMetrics.map((c) => (
              <PerformanceBar
                key={c.key}
                label={c.label}
                value={c.f1}
                tone="success"
              />
            ))}
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Full metric table">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                {["Class", "Precision", "Recall", "F1", "Support"].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {classMetrics.map((c) => (
                <tr
                  key={c.key}
                  className="border-b border-border last:border-b-0"
                >
                  <th
                    scope="row"
                    className="px-3 py-3 font-medium text-foreground"
                  >
                    {c.label}
                  </th>

                  <td className="px-3 py-3 tabular-nums text-muted-foreground">
                    {c.precision.toFixed(2)}
                  </td>

                  <td className="px-3 py-3 tabular-nums text-muted-foreground">
                    {c.recall.toFixed(2)}
                  </td>

                  <td className="px-3 py-3 tabular-nums text-muted-foreground">
                    {c.f1.toFixed(2)}
                  </td>

                  <td className="px-3 py-3 tabular-nums text-muted-foreground">
                    {c.support}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

export function ConfusionMatrixPage() {
  const [confusionData, setConfusionData] = useState(null);

  useEffect(() => {
    fetchConfusionMatrix()
      .then((data) => {
        setConfusionData(data);
      })
      .catch((error) => {
        console.error("Failed to fetch confusion matrix:", error);
      });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evaluation"
        title="Confusion matrix"
        description="Actual versus predicted diabetic retinopathy classes for the IID FedAvg global model."
        actions={
          <StatusBadge tone="success">
            IID · FedAvg · 78.14%
          </StatusBadge>
        }
      />

      <ChartCard
        title="Actual versus predicted class"
        subtitle="Evaluation on 366 validation images"
        footer="Values are generated from the same IID FedAvg checkpoint used for the reported 78.14% validation accuracy."
      >
        {confusionData ? (
          <ConfusionMatrixTable
            labels={confusionData.labels}
            matrix={confusionData.matrix}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Loading confusion matrix...
          </p>
        )}
      </ChartCard>
    </div>
  );
}

export function ClassImbalancePage() {
  const [imbalanceData, setImbalanceData] = useState(null);

  useEffect(() => {
    fetchClassImbalance()
      .then((data) => {
        setImbalanceData(data);
      })
      .catch((error) => {
        console.error("Failed to fetch class imbalance data:", error);
      });
  }, []);

  const classWeights = imbalanceData?.class_weights ?? [];

  const highestWeight =
    classWeights.length > 0
      ? classWeights.reduce((a, b) => (b.weight > a.weight ? b : a))
      : { label: "Loading..." };

  const maxWeight =
    classWeights.length > 0
      ? Math.max(...classWeights.map((c) => c.weight))
      : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evaluation"
        title="Class imbalance"
        description="Balanced class weighting is used during federated training so minority diabetic retinopathy stages contribute more strongly to the loss."
        actions={
          <StatusBadge tone="warning">
            Highest weight: {highestWeight.label}
          </StatusBadge>
        }
      />

      <ChartCard
        title="Applied class weights"
        subtitle="Weights calculated from datasets/train_1.csv using balanced class weighting"
        footer="Higher weights are assigned to less frequent classes during local client training."
      >
        <div className="space-y-4">
          {classWeights.map((c) => (
            <PerformanceBar
              key={c.key}
              label={c.label}
              value={c.weight / maxWeight}
              suffix={`w = ${c.weight.toFixed(4)}`}
              tone="warning"
            />
          ))}
        </div>
      </ChartCard>

      <ChartCard
        title="Weighting strategy"
        footer="These are the actual weights used by the current IID federated training pipeline."
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Method:{" "}
            <span className="font-medium text-foreground">
              {imbalanceData?.method ?? "Loading..."}
            </span>
          </p>

          <p>
            Training source:{" "}
            <span className="font-medium text-foreground">
              {imbalanceData?.source ?? "Loading..."}
            </span>
          </p>

          <p>
            Severe and Proliferative DR receive substantially higher weights
            because they are less represented in the training data.
          </p>
        </div>
      </ChartCard>
    </div>
  );
}

export function ModelImprovementPage() {
  const weakest = getWeakestClass();
  const actions = [
    { title: "Targeted augmentation for minority stages", text: "Apply rotation, contrast and lesion-preserving augmentation to Severe and Proliferative samples at the clients that hold them." },
    { title: "Tune the proximal coefficient", text: "Sweep μ between 0.005 and 0.05 to trade convergence speed against client drift on the Non-IID split." },
    { title: "Focal loss on minority classes", text: "Replace weighted cross-entropy with focal loss to concentrate gradient on hard, rare cases." },
    { title: "Increase client participation", text: "Hospital D missed rounds 18 and 20; stabilising its uplink recovers the class it dominates." },
    { title: "Report balanced accuracy", text: "Overall accuracy hides minority failure — track macro recall as the primary objective." },
  ];
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Next steps" title="Model improvement plan"
        description={`Priorities for the next experiment cycle, focused on ${weakest.label} sensitivity rather than overall accuracy.`} />
      <div className="grid gap-4 md:grid-cols-2">
        {actions.map((a, i) => (
          <section key={a.title} className="card-surface p-5">
            <span className="grid size-8 place-items-center rounded-full border border-primary/40 bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
            <h2 className="mt-3 text-sm font-semibold text-foreground">{a.title}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{a.text}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

export function ExperimentHistoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Research log" title="Experiment history"
        description="Chronological record of every federated run in this project." />
      <ChartCard title="Timeline">
        <ol className="relative space-y-6 border-l border-border pl-6">
          {EXPERIMENTS.map((e) => (
            <li key={e.id}>
              <span className={`absolute -left-[5px] mt-1.5 size-2.5 rounded-full ${e.confirmed ? "bg-success" : "bg-muted-foreground"}`} aria-hidden="true" />
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{e.id}</p>
                <StatusBadge tone={e.status === "Completed" ? "success" : "warning"}>{e.status}</StatusBadge>
                <span className="text-xs text-muted-foreground">{e.date}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {e.algorithm} · {e.distribution} · {e.aggregation} · {e.rounds} rounds ·{" "}
                {e.accuracy != null ? `${percent(e.accuracy)} validation accuracy` : "Accuracy not recorded"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{e.notes}</p>
            </li>
          ))}
        </ol>
      </ChartCard>
    </div>
  );
}
