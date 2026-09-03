import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";

import PageHeader from "@/components/common/PageHeader";
import ChartCard from "@/components/common/ChartCard";
import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";

import {
  fetchExperiments,
  exportExperimentsToCsv,
} from "@/services/experimentService";

const FILTERS = [
  { key: "all", label: "All runs" },
  { key: "FedAvg", label: "FedAvg" },
  { key: "FedProx", label: "FedProx" },
];

export default function ExperimentsPage() {
  const [filter, setFilter] = useState("all");
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadExperiments() {
      try {
        setLoading(true);
        setError("");

        const data = await fetchExperiments();
        setExperiments(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load experiments.");
      } finally {
        setLoading(false);
      }
    }

    loadExperiments();
  }, []);

  const normalizedExperiments = useMemo(() => {
    return experiments.map((e) => ({
      ...e,

      algorithmLabel:
        e.algorithm === "fedavg"
          ? "FedAvg"
          : e.algorithm === "fedprox"
          ? "FedProx"
          : e.algorithm,

      distributionLabel:
        e.distribution === "non_iid"
          ? "Non-IID"
          : e.distribution === "iid"
          ? "IID"
          : e.distribution,

      dateLabel: formatExperimentDate(e.id),

      weakestClass: "Not recorded",
    }));
  }, [experiments]);

  const rows = useMemo(() => {
    if (filter === "all") {
      return normalizedExperiments;
    }

    return normalizedExperiments.filter(
      (e) => e.algorithmLabel === filter,
    );
  }, [filter, normalizedExperiments]);

  const bestExperimentId = useMemo(() => {
    if (normalizedExperiments.length === 0) {
      return null;
    }

    return normalizedExperiments.reduce((best, current) =>
      current.accuracy > best.accuracy ? current : best,
    ).id;
  }, [normalizedExperiments]);

  const downloadCsv = () => {
    const csv = exportExperimentsToCsv(rows);
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv" }),
    );

    const link = document.createElement("a");
    link.href = url;
    link.download = "fedretina-experiments.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Research log"
          title="Experiments"
          description="Loading saved federated learning experiments."
        />

        <ChartCard title="Experiment matrix">
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
          eyebrow="Research log"
          title="Experiments"
          description="Saved federated learning experiment history."
        />

        <ChartCard title="Experiment matrix">
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
        eyebrow="Research log"
        title="Experiments"
        description="Completed federated learning experiments saved by the backend."
        actions={
          <Button
            variant="outline"
            onClick={downloadCsv}
            disabled={rows.length === 0}
          >
            <Download className="size-4" aria-hidden="true" />
            Export CSV
          </Button>
        }
      />

      <div
        className="inline-flex rounded-lg border border-border bg-surface p-1"
        role="group"
        aria-label="Algorithm filter"
      >
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ChartCard
        title="Experiment matrix"
        subtitle={`${rows.length} completed configurations`}
      >
        {rows.length === 0 ? (
          <EmptyState
            title="No experiments match this filter"
            description="Try selecting a different algorithm."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  {[
                    "ID",
                    "Date",
                    "Algorithm",
                    "Distribution",
                    "Aggregation",
                    "LR",
                    "μ",
                    "Weighting",
                    "Rounds",
                    "Accuracy",
                    "Macro F1",
                    "Weighted F1",
                    "Weakest class",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="whitespace-nowrap px-3 py-2 font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((e) => (
                  <tr
                    key={e.id}
                    className={`border-b border-border last:border-b-0 ${
                      e.id === bestExperimentId
                        ? "bg-success/5"
                        : ""
                    }`}
                  >
                    <th
                      scope="row"
                      className="whitespace-nowrap px-3 py-3 font-semibold text-foreground"
                    >
                      {e.id}

                      {e.id === bestExperimentId ? (
                        <span className="ml-2 align-middle">
                          <StatusBadge tone="success">
                            Best
                          </StatusBadge>
                        </span>
                      ) : null}
                    </th>

                    <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                      {e.dateLabel}
                    </td>

                    <td className="px-3 py-3 text-foreground">
                      {e.algorithmLabel}
                    </td>

                    <td className="px-3 py-3 text-foreground">
                      {e.distributionLabel}
                    </td>

                    <td className="px-3 py-3 text-foreground capitalize">
                      {e.aggregation ?? "N/A"}
                    </td>

                    <td className="px-3 py-3 tabular-nums text-muted-foreground">
                      {e.learningRate ?? "N/A"}
                    </td>

                    <td className="px-3 py-3 tabular-nums text-muted-foreground">
                      {e.algorithm === "fedavg"
                        ? "0"
                        : e.mu ?? "N/A"}
                    </td>

                    <td className="px-3 py-3 text-muted-foreground">
                      {e.classWeighting
                        ? "Enabled"
                        : "Disabled"}
                    </td>

                    <td className="px-3 py-3 tabular-nums text-muted-foreground">
                      {e.rounds ?? "N/A"}
                    </td>

                    <td className="px-3 py-3 font-semibold tabular-nums text-foreground">
                      {typeof e.accuracy === "number"
                        ? `${e.accuracy.toFixed(2)}%`
                        : "Not available"}
                    </td>

                    <td className="px-3 py-3 tabular-nums text-muted-foreground">
                      {typeof e.macroF1 === "number"
                        ? e.macroF1.toFixed(3)
                        : "N/A"}
                    </td>

                    <td className="px-3 py-3 tabular-nums text-muted-foreground">
                      {typeof e.weightedF1 === "number"
                        ? e.weightedF1.toFixed(3)
                        : "N/A"}
                    </td>

                    <td className="px-3 py-3 text-muted-foreground">
                      {e.weakestClass}
                    </td>

                    <td className="px-3 py-3">
                      <StatusBadge
                        tone={
                          e.status === "completed"
                            ? "success"
                            : "warning"
                        }
                      >
                        {e.status}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      <p className="text-xs leading-relaxed text-muted-foreground">
        This table is generated from real experiment artifacts stored by
        the federated learning backend. Weakest-class data will become
        available once class-level metrics are saved per experiment.
      </p>
    </div>
  );
}

function formatExperimentDate(id) {
  if (!id || id.length < 15) {
    return "Unknown";
  }

  const year = id.slice(0, 4);
  const month = id.slice(4, 6);
  const day = id.slice(6, 8);

  const hour = id.slice(9, 11);
  const minute = id.slice(11, 13);

  return `${day}/${month}/${year} ${hour}:${minute}`;
}