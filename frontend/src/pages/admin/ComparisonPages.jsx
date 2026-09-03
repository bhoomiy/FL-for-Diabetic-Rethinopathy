import PageHeader from "@/components/common/PageHeader";
import ChartCard from "@/components/common/ChartCard";

import { useEffect, useMemo, useState } from "react";

import StatusBadge from "@/components/common/StatusBadge";
import DistributionChart from "@/components/charts/DistributionChart";

import { fetchExperiments } from "@/services/experimentService";
import { fetchDataDistribution } from "@/services/federatedService";
import { DR_CLASSES } from "@/constants/drClasses";
import AlgorithmComparisonChart from "@/components/charts/AlgorithmComparisonChart";

function ComparisonTable({
  rows,
  aLabel = "Option A",
  bLabel = "Option B",
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-xs">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th scope="col" className="px-3 py-2 font-medium">
              Aspect
            </th>

            <th scope="col" className="px-3 py-2 font-medium text-primary">
              {aLabel}
            </th>

            <th scope="col" className="px-3 py-2 font-medium text-success">
              {bLabel}
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr
              key={r.aspect}
              className="border-b border-border last:border-b-0"
            >
              <th
                scope="row"
                className="px-3 py-3 font-medium text-foreground"
              >
                {r.aspect}
              </th>

              <td className="px-3 py-3 text-muted-foreground">
                {r.a}
              </td>

              <td className="px-3 py-3 text-muted-foreground">
                {r.b}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FedAvgVsFedProxPage() {
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadExperiments() {
      try {
        setLoading(true);
        setError("");

        const data = await fetchExperiments();

        setExperiments(
          data.filter((experiment) => experiment.status === "completed"),
        );
      } catch (err) {
        console.error(err);
        setError("Failed to load experiment comparison.");
      } finally {
        setLoading(false);
      }
    }

    loadExperiments();
  }, []);

  const bestFedAvg = useMemo(() => {
    const runs = experiments.filter(
      (experiment) => experiment.algorithm === "fedavg",
    );

    if (runs.length === 0) {
      return null;
    }

    return runs.reduce((best, current) =>
      current.accuracy > best.accuracy ? current : best,
    );
  }, [experiments]);

  const bestFedProx = useMemo(() => {
    const runs = experiments.filter(
      (experiment) => experiment.algorithm === "fedprox",
    );

    if (runs.length === 0) {
      return null;
    }

    return runs.reduce((best, current) =>
      current.accuracy > best.accuracy ? current : best,
    );
  }, [experiments]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Algorithm study"
          title="FedAvg vs FedProx"
          description="Comparing completed federated learning experiments."
        />

        <ChartCard title="Algorithm comparison">
          <p className="text-sm text-muted-foreground">
            Loading experiments...
          </p>
        </ChartCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Algorithm study"
          title="FedAvg vs FedProx"
          description="Comparing completed federated learning experiments."
        />

        <ChartCard title="Algorithm comparison">
          <p className="text-sm text-destructive">
            {error}
          </p>
        </ChartCard>
      </div>
    );
  }

  return (
    
    <div className="space-y-6">
      <PageHeader
        eyebrow="Algorithm study"
        title="FedAvg vs FedProx"
        description="Comparison of the best completed FedAvg and FedProx experiments recorded by FedRetina AI."
        actions={
          <StatusBadge tone="success">
            Real experiment data
          </StatusBadge>
        }
      />

      {/* ADD THE CHART HERE */}
    <ChartCard
      title="FedAvg vs FedProx performance"
      subtitle="Best recorded completed experiment for each algorithm"
      footer="Macro F1 and Weighted F1 are displayed as percentages for comparison with validation accuracy."
    >
      {bestFedAvg && bestFedProx ? (
        <AlgorithmComparisonChart
          fedAvg={bestFedAvg}
          fedProx={bestFedProx}
          height={320}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Both a completed FedAvg and FedProx experiment are required for comparison.
        </p>
      )}
    </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Best FedAvg run"
          subtitle={
            bestFedAvg
              ? bestFedAvg.id
              : "No completed FedAvg experiment"
          }
        >
          {bestFedAvg ? (
            <div className="grid grid-cols-2 gap-4">
              <Metric
                tone="primary"
                label="Validation accuracy"
                value={`${bestFedAvg.accuracy.toFixed(2)}%`}
              />

              <Metric
                tone="primary"
                label="Macro F1"
                value={bestFedAvg.macroF1.toFixed(3)}
              />

              <Metric
                tone="primary"
                label="Weighted F1"
                value={bestFedAvg.weightedF1.toFixed(3)}
              />

              <Metric
                tone="primary"
                label="Distribution"
                value={formatDistribution(bestFedAvg.distribution)}
              />

              <Metric
                tone="primary"
                label="Rounds"
                value={bestFedAvg.rounds}
              />

              <Metric
                tone="primary"
                label="Learning rate"
                value={bestFedAvg.learningRate}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No completed FedAvg experiments are available yet.
            </p>
          )}
        </ChartCard>

        <ChartCard
          title="Best FedProx run"
          subtitle={
            bestFedProx
              ? bestFedProx.id
              : "No completed FedProx experiment"
          }
        >
          {bestFedProx ? (
            <div className="grid grid-cols-2 gap-4">
              <Metric
                tone="success"
                label="Validation accuracy"
                value={`${bestFedProx.accuracy.toFixed(2)}%`}
              />

              <Metric
                tone="success"
                label="Macro F1"
                value={bestFedProx.macroF1.toFixed(3)}
              />

              <Metric
                tone="success"
                label="Weighted F1"
                value={bestFedProx.weightedF1.toFixed(3)}
              />

              <Metric
                tone="success"
                label="Distribution"
                value={formatDistribution(bestFedProx.distribution)}
              />

              <Metric
                tone="success"
                label="Rounds"
                value={bestFedProx.rounds}
              />

              <Metric
                tone="success"
                label="μ"
                value={bestFedProx.mu}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No completed FedProx experiments are available yet.
            </p>
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="Recorded performance comparison"
        subtitle="Best completed run for each algorithm"
      >
        <ComparisonTable
          aLabel="FedAvg"
          bLabel="FedProx"

          rows={[
            {
              aspect: "Experiment",
              a: bestFedAvg?.id ?? "Not available",
              b: bestFedProx?.id ?? "Not available",
            },
            {
              aspect: "Validation accuracy",
              a: bestFedAvg
                ? `${bestFedAvg.accuracy.toFixed(2)}%`
                : "Not available",
              b: bestFedProx
                ? `${bestFedProx.accuracy.toFixed(2)}%`
                : "Not available",
            },
            {
              aspect: "Macro F1",
              a: bestFedAvg
                ? bestFedAvg.macroF1.toFixed(3)
                : "Not available",
              b: bestFedProx
                ? bestFedProx.macroF1.toFixed(3)
                : "Not available",
            },
            {
              aspect: "Weighted F1",
              a: bestFedAvg
                ? bestFedAvg.weightedF1.toFixed(3)
                : "Not available",
              b: bestFedProx
                ? bestFedProx.weightedF1.toFixed(3)
                : "Not available",
            },
            {
              aspect: "Distribution",
              a: bestFedAvg
                ? formatDistribution(bestFedAvg.distribution)
                : "Not available",
              b: bestFedProx
                ? formatDistribution(bestFedProx.distribution)
                : "Not available",
            },
            {
              aspect: "Proximal coefficient μ",
              a: "0",
              b: bestFedProx?.mu ?? "Not available",
            },
          ]}
        />
      </ChartCard>

      <ChartCard title="Algorithm behaviour">
        <ComparisonTable
        aLabel="FedAvg"
          bLabel="FedProx"
          rows={[
            {
              aspect: "Objective",
              a: "FedAvg — weighted average of client model updates",
              b: "FedProx — FedAvg with a proximal penalty during local training",
            },
            {
              aspect: "Client drift",
              a: "Local models can move farther from the global model",
              b: "Proximal term limits how far local models move from the global model",
            },
            {
              aspect: "Extra hyper-parameter",
              a: "None",
              b: "Proximal coefficient μ",
            },
          ]}
        />
      </ChartCard>
    </div>
  );
}

function Metric({ label, value, tone = "neutral" }) {
  const styles = {
    primary:
      "border-primary/25 bg-primary/5",

    success:
      "border-success/25 bg-success/5",

    neutral:
      "border-border bg-surface",
  };

  const valueStyles = {
    primary: "text-primary",
    success: "text-success",
    neutral: "text-foreground",
  };

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${styles[tone]}`}
    >
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p
        className={`mt-1 text-base font-semibold ${valueStyles[tone]}`}
      >
        {value}
      </p>
    </div>
  );
}
function formatDistribution(distribution) {
  if (distribution === "iid") {
    return "IID";
  }

  if (distribution === "non_iid") {
    return "Non-IID";
  }

  return distribution;
}

export function IidVsNonIidPage() {
  const [experiments, setExperiments] = useState([]);
  const [iidRows, setIidRows] = useState([]);
  const [nonIidRows, setNonIidRows] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [experimentData, distributionData] =
          await Promise.all([
            fetchExperiments(),
            fetchDataDistribution(),
          ]);

        setExperiments(
          experimentData.filter(
            (experiment) =>
              experiment.status === "completed",
          ),
        );

        setIidRows(
          convertDistributionForChart(
            distributionData.iid,
          ),
        );

        setNonIidRows(
          convertDistributionForChart(
            distributionData.non_iid,
          ),
        );
      } catch (err) {
        console.error(err);
        setError(
          "Failed to load IID and Non-IID comparison.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const bestIid = useMemo(() => {
    const runs = experiments.filter(
      (experiment) =>
        experiment.distribution === "iid",
    );

    if (runs.length === 0) {
      return null;
    }

    return runs.reduce((best, current) =>
      current.accuracy > best.accuracy
        ? current
        : best,
    );
  }, [experiments]);

  const bestNonIid = useMemo(() => {
    const runs = experiments.filter(
      (experiment) =>
        experiment.distribution === "non_iid",
    );

    if (runs.length === 0) {
      return null;
    }

    return runs.reduce((best, current) =>
      current.accuracy > best.accuracy
        ? current
        : best,
    );
  }, [experiments]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Partition study"
          title="IID vs Non-IID"
          description="Loading federated data distributions and experiment results."
        />

        <ChartCard title="Distribution comparison">
          <p className="text-sm text-muted-foreground">
            Loading data...
          </p>
        </ChartCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Partition study"
          title="IID vs Non-IID"
          description="Comparison of federated data distributions."
        />

        <ChartCard title="Distribution comparison">
          <p className="text-sm text-destructive">
            {error}
          </p>
        </ChartCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Partition study"
        title="IID vs Non-IID"
        description="How retinal image classes are distributed across the four hospitals, together with the best recorded experiment for each partition."
        actions={
          <StatusBadge tone="success">
            Real distribution data
          </StatusBadge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="IID partition"
          subtitle="Similar class distribution across all 4 hospitals"
          footer="Counts are read from the actual IID client partitions used by the federated learning backend."
        >
          <DistributionChart
            data={iidRows}
            height={320}
          />
        </ChartCard>

        <ChartCard
          title="Non-IID partition"
          subtitle="Class distribution varies strongly between hospitals"
          footer="Counts are read from the actual Non-IID client partitions used by the federated learning backend."
        >
          <DistributionChart
            data={nonIidRows}
            height={320}
          />
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Best IID experiment"
          subtitle={
            bestIid
              ? bestIid.id
              : "No completed IID experiment"
          }
        >
          {bestIid ? (
            <div className="grid grid-cols-2 gap-4">
              <Metric
                tone="primary"
                label="Validation accuracy"
                value={`${bestIid.accuracy.toFixed(2)}%`}
              />

              <Metric
                tone="primary"
                label="Macro F1"
                value={bestIid.macroF1.toFixed(3)}
              />

              <Metric
                tone="primary"
                label="Weighted F1"
                value={bestIid.weightedF1.toFixed(3)}
              />

              <Metric
                tone="primary"
                label="Algorithm"
                value={formatAlgorithm(
                  bestIid.algorithm,
                )}
              />

              <Metric
                tone="primary"
                label="Rounds"
                value={bestIid.rounds}
              />

              <Metric
                tone="primary"
                label="Class weighting"
                value={
                  bestIid.classWeighting
                    ? "Enabled"
                    : "Disabled"
                }
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No completed IID experiments available.
            </p>
          )}
        </ChartCard>

        <ChartCard
          title="Best Non-IID experiment"
          subtitle={
            bestNonIid
              ? bestNonIid.id
              : "No completed Non-IID experiment"
          }
        >
          {bestNonIid ? (
            <div className="grid grid-cols-2 gap-4">
              <Metric
                tone="success"
                label="Validation accuracy"
                value={`${bestNonIid.accuracy.toFixed(2)}%`}
              />

              <Metric
                tone="success"
                label="Macro F1"
                value={bestNonIid.macroF1.toFixed(3)}
              />

              <Metric
                tone="success"
                label="Weighted F1"
                value={bestNonIid.weightedF1.toFixed(3)}
              />

              <Metric
                tone="success"
                label="Algorithm"
                value={formatAlgorithm(
                  bestNonIid.algorithm,
                )}
              />

              <Metric
                tone="success"
                label="Rounds"
                value={bestNonIid.rounds}
              />

              <Metric
                tone="success"
                label="Class weighting"
                value={
                  bestNonIid.classWeighting
                    ? "Enabled"
                    : "Disabled"
                }
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No completed Non-IID experiments available.
            </p>
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="Recorded performance comparison"
        subtitle="Best completed experiment for each distribution"
      >
        <ComparisonTable
          aLabel="IID"
          bLabel="Non-IID"
          rows={[
            {
              aspect: "Experiment",
              a:
                bestIid?.id ??
                "Not available",
              b:
                bestNonIid?.id ??
                "Not available",
            },
            {
              aspect: "Validation accuracy",
              a: bestIid
                ? `${bestIid.accuracy.toFixed(2)}%`
                : "Not available",
              b: bestNonIid
                ? `${bestNonIid.accuracy.toFixed(2)}%`
                : "Not available",
            },
            {
              aspect: "Macro F1",
              a: bestIid
                ? bestIid.macroF1.toFixed(3)
                : "Not available",
              b: bestNonIid
                ? bestNonIid.macroF1.toFixed(3)
                : "Not available",
            },
            {
              aspect: "Weighted F1",
              a: bestIid
                ? bestIid.weightedF1.toFixed(3)
                : "Not available",
              b: bestNonIid
                ? bestNonIid.weightedF1.toFixed(3)
                : "Not available",
            },
            {
              aspect: "Algorithm",
              a: bestIid
                ? formatAlgorithm(
                    bestIid.algorithm,
                  )
                : "Not available",
              b: bestNonIid
                ? formatAlgorithm(
                    bestNonIid.algorithm,
                  )
                : "Not available",
            },
          ]}
        />
      </ChartCard>

      <ChartCard title="What changes in federated learning">
        <ComparisonTable
          aLabel="IID"
          bLabel="Non-IID"
          rows={[
            {
              aspect: "Client distribution",
              a: "Similar class proportions across hospitals",
              b: "Different class proportions across hospitals",
            },
            {
              aspect: "Statistical heterogeneity",
              a: "Lower",
              b: "Higher",
            },
            {
              aspect: "Client drift",
              a: "Generally lower",
              b: "Can be stronger because local datasets differ",
            },
            {
              aspect: "Federated difficulty",
              a: "Simpler aggregation setting",
              b: "More challenging heterogeneous setting",
            },
          ]}
        />
      </ChartCard>
    </div>
  );
}

function convertDistributionForChart(hospitals = []) {
  return hospitals.map((hospital) => {
    const row = {
      client: hospital.name,
    };

    hospital.classes.forEach((classInfo) => {
      const drClass = DR_CLASSES.find(
        (item) => item.id === classInfo.classId
      );

      if (drClass) {
        row[drClass.key] = classInfo.count;
      }
    });

    return row;
  });
}

function formatAlgorithm(algorithm) {
  if (algorithm === "fedavg") {
    return "FedAvg";
  }

  if (algorithm === "fedprox") {
    return "FedProx";
  }

  return algorithm;
}