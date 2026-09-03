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
  fetchModelImprovement,
} from "@/services/federatedService";

export function ModelPerformancePage() {
  const [distribution, setDistribution] = useState("iid");
  const [metrics, setMetrics] = useState(null);
  const [trainingHistory, setTrainingHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setMetrics(null);

    fetchModelPerformance(distribution)
      .then((data) => {
        setMetrics(data);
      })
      .catch((error) => {
        console.error("Failed to fetch model performance:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [distribution]);

  useEffect(() => {
    if (distribution === "iid") {
      fetchTrainingHistory()
        .then((data) => {
          setTrainingHistory(data);
        })
        .catch((error) => {
          console.error("Failed to fetch training history:", error);
        });
    } else {
      setTrainingHistory([]);
    }
  }, [distribution]);

  const isIID = distribution === "iid";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evaluation"
        title="Model performance"
        description={
          isIID
            ? "Performance of the global model from the verified IID FedAvg federated training run."
            : "Performance of the global model from the verified Non-IID weighted FedProx federated training run."
        }
        actions={
          <StatusBadge tone="success" dot>
            {isIID ? "IID · FedAvg" : "Non-IID · FedProx"}
          </StatusBadge>
        }
      />

      {/* Distribution selector */}
      <div className="flex w-fit rounded-lg border border-border bg-card p-1">
        <button
          type="button"
          onClick={() => setDistribution("iid")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            isIID
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          IID
        </button>

        <button
          type="button"
          onClick={() => setDistribution("non_iid")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            !isIID
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Non-IID
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Validation accuracy"
          value={
            loading
              ? "Loading..."
              : metrics
                ? `${metrics.validation_accuracy.toFixed(2)}%`
                : "N/A"
          }
          confirmed
        />

        <MetricCard
          label="Training accuracy"
          value={
            loading
              ? "Loading..."
              : metrics?.train_accuracy != null
                ? `${metrics.train_accuracy.toFixed(2)}%`
                : "N/A"
          }
          confirmed={metrics?.train_accuracy != null}
        />

        <MetricCard
          label="Macro precision"
          value={
            loading
              ? "Loading..."
              : metrics
                ? metrics.macro_precision.toFixed(3)
                : "N/A"
          }
          confirmed
        />

        <MetricCard
          label="Macro recall"
          value={
            loading
              ? "Loading..."
              : metrics
                ? metrics.macro_recall.toFixed(3)
                : "N/A"
          }
          confirmed
        />

        <MetricCard
          label="Macro F1"
          value={
            loading
              ? "Loading..."
              : metrics
                ? metrics.macro_f1.toFixed(3)
                : "N/A"
          }
          confirmed
        />

        <MetricCard
          label="Weighted F1"
          value={
            loading
              ? "Loading..."
              : metrics
                ? metrics.weighted_f1.toFixed(3)
                : "N/A"
          }
          confirmed
        />
      </div>

      {isIID ? (
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
      ) : (
        <ChartCard
          title="Accuracy across communication rounds"
          subtitle="Non-IID + weighted FedProx"
          footer="Round-wise validation metrics were not recorded by the original Non-IID training script."
        >
          <div className="flex min-h-[180px] items-center justify-center text-center">
            <div>
              <p className="text-sm font-medium text-foreground">
                Final model evaluation available
              </p>

              <p className="mt-2 max-w-lg text-xs leading-relaxed text-muted-foreground">
                The verified Non-IID checkpoint was evaluated after round 5,
                but validation accuracy was not recorded after every
                communication round. The final verified validation accuracy is{" "}
                <span className="font-semibold text-foreground">
                  76.23%
                </span>.
              </p>
            </div>
          </div>
        </ChartCard>
      )}
    </div>
  );
}

export function ClassMetricsPage() {
  const [distribution, setDistribution] = useState("iid");
  const [classMetrics, setClassMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setClassMetrics([]);

    fetchClassMetrics(distribution)
      .then((data) => {
        setClassMetrics(data);
      })
      .catch((error) => {
        console.error("Failed to fetch class metrics:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [distribution]);

  const weakest =
    classMetrics.length > 0
      ? classMetrics.reduce((a, b) => (b.f1 < a.f1 ? b : a))
      : { key: "", label: "Loading..." };

  const isIID = distribution === "iid";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evaluation"
        title="Class-wise metrics"
        description={
          isIID
            ? "Precision, recall and F1 for each diabetic retinopathy stage from the verified IID FedAvg global model."
            : "Precision, recall and F1 for each diabetic retinopathy stage from the verified Non-IID weighted FedProx global model."
        }
        actions={
          <StatusBadge tone="success">
            {isIID ? "IID · FedAvg" : "Non-IID · FedProx"}
          </StatusBadge>
        }
      />

      <div className="flex w-fit rounded-lg border border-border bg-card p-1">
        <button
          type="button"
          onClick={() => setDistribution("iid")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            isIID
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          IID
        </button>

        <button
          type="button"
          onClick={() => setDistribution("non_iid")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            !isIID
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Non-IID
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">
          Loading class metrics...
        </p>
      ) : (
        <>
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
                    tone={c.key === weakest.key ? "danger" : "success"}
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
                      <th
                        key={h}
                        scope="col"
                        className="px-3 py-2 font-medium"
                      >
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
                        {c.precision.toFixed(4)}
                      </td>

                      <td className="px-3 py-3 tabular-nums text-muted-foreground">
                        {c.recall.toFixed(4)}
                      </td>

                      <td className="px-3 py-3 tabular-nums text-muted-foreground">
                        {c.f1.toFixed(4)}
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
        </>
      )}
    </div>
  );
}

export function ConfusionMatrixPage() {
  const [distribution, setDistribution] = useState("iid");
  const [confusionData, setConfusionData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setConfusionData(null);

    fetchConfusionMatrix(distribution)
      .then((data) => {
        setConfusionData(data);
      })
      .catch((error) => {
        console.error("Failed to fetch confusion matrix:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [distribution]);

  const isIID = distribution === "iid";
  const accuracy = isIID ? "78.14%" : "76.23%";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evaluation"
        title="Confusion matrix"
        description={
          isIID
            ? "Actual versus predicted diabetic retinopathy classes for the verified IID FedAvg global model."
            : "Actual versus predicted diabetic retinopathy classes for the verified Non-IID weighted FedProx global model."
        }
        actions={
          <StatusBadge tone="success">
            {isIID
              ? "IID · FedAvg · 78.14%"
              : "Non-IID · FedProx · 76.23%"}
          </StatusBadge>
        }
      />

      <div className="flex w-fit rounded-lg border border-border bg-card p-1">
        <button
          type="button"
          onClick={() => setDistribution("iid")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            isIID
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          IID
        </button>

        <button
          type="button"
          onClick={() => setDistribution("non_iid")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            !isIID
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Non-IID
        </button>
      </div>

      <ChartCard
        title="Actual versus predicted class"
        subtitle="Evaluation on 366 validation images"
        footer={
          isIID
            ? "Values come from the verified IID FedAvg checkpoint with 78.14% validation accuracy."
            : "Values come from the verified Non-IID weighted FedProx checkpoint with 76.23% validation accuracy."
        }
      >
        {loading ? (
          <p className="text-sm text-muted-foreground">
            Loading confusion matrix...
          </p>
        ) : confusionData ? (
          <ConfusionMatrixTable
            labels={confusionData.labels}
            matrix={confusionData.matrix}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Confusion matrix unavailable.
          </p>
        )}
      </ChartCard>

      <ChartCard
        title="Evaluation summary"
        subtitle={isIID ? "IID + FedAvg" : "Non-IID + weighted FedProx"}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">
              Validation samples
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              366
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              Validation accuracy
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {accuracy}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              Weakest class
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              Severe
            </p>
          </div>
        </div>
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
          description="Balanced class weighting is used during weighted federated training so minority diabetic retinopathy stages contribute more strongly to the loss."
          actions={
            <StatusBadge tone="warning">
              Highest weight: {highestWeight.label}
            </StatusBadge>
          }
        />

        <ChartCard
          title="Applied class weights"
          subtitle="Weights calculated from datasets/train_1.csv using balanced class weighting"
          footer="These weights are used in the weighted training configurations, including IID FedAvg and Non-IID weighted FedProx."
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
  footer="These are the verified balanced class weights used during weighted local client training."
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
  const [improvementData, setImprovementData] = useState(null);

  useEffect(() => {
    fetchModelImprovement()
      .then((data) => {
        setImprovementData(data);
      })
      .catch((error) => {
        console.error("Failed to fetch model improvement data:", error);
      });
  }, []);

  const weakest = improvementData?.weakest_class;
  const secondary = improvementData?.secondary_weak_class;
  const recommendations = improvementData?.recommendations ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Next steps"
        title="Model improvement plan"
        description="Recommendations derived from the verified evaluation results and the weakest diabetic retinopathy classes."
        actions={
          <StatusBadge tone="warning">
            {weakest
              ? `Priority: ${weakest.label}`
              : "Loading..."}
          </StatusBadge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Weakest class"
          value={weakest?.label ?? "Loading..."}
        />

        <MetricCard
          label={
            weakest
              ? `${weakest.label} F1`
              : "Weakest class F1"
          }
          value={
            weakest
              ? weakest.f1.toFixed(3)
              : "Loading..."
          }
        />

        <MetricCard
          label={
            weakest
              ? `${weakest.label} precision`
              : "Weakest class precision"
          }
          value={
            weakest
              ? weakest.precision.toFixed(3)
              : "Loading..."
          }
        />

        <MetricCard
          label={
            weakest
              ? `${weakest.label} support`
              : "Weakest class support"
          }
          value={
            weakest
              ? weakest.support
              : "Loading..."
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Primary weakness"
          subtitle={
            weakest
              ? weakest.label
              : "Loading..."
          }
        >
          {weakest ? (
            <div className="space-y-4">
              <PerformanceBar
                label={`${weakest.label} precision`}
                value={weakest.precision}
                tone="danger"
              />

              <PerformanceBar
                label={`${weakest.label} recall`}
                value={weakest.recall}
                tone="warning"
              />

              <PerformanceBar
                label={`${weakest.label} F1`}
                value={weakest.f1}
                tone="danger"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Loading evaluation data...
            </p>
          )}
        </ChartCard>

        <ChartCard
          title="Secondary weak class"
          subtitle={
            secondary
              ? secondary.label
              : "Loading..."
          }
        >
          {secondary ? (
            <div className="space-y-4">
              <PerformanceBar
                label={`${secondary.label} precision`}
                value={secondary.precision}
                tone="warning"
              />

              <PerformanceBar
                label={`${secondary.label} recall`}
                value={secondary.recall}
                tone="warning"
              />

              <PerformanceBar
                label={`${secondary.label} F1`}
                value={secondary.f1}
                tone="warning"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Loading evaluation data...
            </p>
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="Recommended next experiments"
        subtitle="Suggestions derived from current model weaknesses"
        footer="These are proposed improvements and have not yet been experimentally validated."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {recommendations.map((item, index) => (
            <section
              key={item.title}
              className="card-surface p-5"
            >
              <span className="grid size-8 place-items-center rounded-full border border-primary/40 bg-primary/10 text-xs font-semibold text-primary">
                {index + 1}
              </span>

              <h2 className="mt-3 text-sm font-semibold text-foreground">
                {item.title}
              </h2>

              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {item.text}
              </p>
            </section>
          ))}
        </div>
      </ChartCard>
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
