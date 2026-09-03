import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import ChartCard from "@/components/common/ChartCard";
import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import { EXPERIMENTS, BEST_EXPERIMENT_ID } from "@/data/experiments";
import { exportExperimentsToCsv } from "@/services/experimentService";
import { percent } from "@/components/charts/chartTheme";

const FILTERS = [
  { key: "all", label: "All runs" },
  { key: "FedAvg", label: "FedAvg" },
  { key: "FedProx", label: "FedProx" },
];

export default function ExperimentsPage() {
  const [filter, setFilter] = useState("all");

  const rows = useMemo(
    () => (filter === "all" ? EXPERIMENTS : EXPERIMENTS.filter((e) => e.algorithm === filter)),
    [filter],
  );

  const downloadCsv = () => {
    const csv = exportExperimentsToCsv(rows);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "fedretina-experiments.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Research log"
        title="Experiments"
        description="Every federated configuration that has been run or queued. Only EXP-24 has a confirmed accuracy result."
        actions={
          <Button variant="outline" onClick={downloadCsv}>
            <Download className="size-4" aria-hidden="true" /> Export CSV
          </Button>
        }
      />

      <div className="inline-flex rounded-lg border border-border bg-surface p-1" role="group" aria-label="Algorithm filter">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ChartCard title="Experiment matrix" subtitle={`${rows.length} configurations`}>
        {rows.length === 0 ? (
          <EmptyState title="No experiments match this filter" description="Try selecting a different algorithm." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  {["ID", "Date", "Algorithm", "Distribution", "Aggregation", "LR", "μ", "Weighting", "Rounds", "Accuracy", "Weakest class", "Status"].map(
                    (h) => (
                      <th key={h} scope="col" className="whitespace-nowrap px-3 py-2 font-medium">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr
                    key={e.id}
                    className={`border-b border-border last:border-b-0 ${e.id === BEST_EXPERIMENT_ID ? "bg-success/5" : ""}`}
                  >
                    <th scope="row" className="whitespace-nowrap px-3 py-3 font-semibold text-foreground">
                      {e.id}
                      {e.id === BEST_EXPERIMENT_ID ? (
                        <span className="ml-2 align-middle">
                          <StatusBadge tone="success">Best</StatusBadge>
                        </span>
                      ) : null}
                    </th>
                    <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{e.date}</td>
                    <td className="px-3 py-3 text-foreground">{e.algorithm}</td>
                    <td className="px-3 py-3 text-foreground">{e.distribution}</td>
                    <td className="px-3 py-3 text-foreground">{e.aggregation}</td>
                    <td className="px-3 py-3 tabular-nums text-muted-foreground">{e.learningRate}</td>
                    <td className="px-3 py-3 tabular-nums text-muted-foreground">{e.mu ?? "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground">{e.classWeighting ? "Enabled" : "Disabled"}</td>
                    <td className="px-3 py-3 tabular-nums text-muted-foreground">{e.rounds}</td>
                    <td className="px-3 py-3 font-semibold tabular-nums text-foreground">
                      {e.accuracy != null ? percent(e.accuracy) : "Not available"}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{e.weakestClass}</td>
                    <td className="px-3 py-3">
                      <StatusBadge tone={e.status === "Completed" ? "success" : "warning"}>{e.status}</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Runs marked “Pending” have not had their metrics recorded yet. They are shown so the full experiment grid is
        visible, but no invented accuracy is displayed for them.
      </p>
    </div>
  );
}
