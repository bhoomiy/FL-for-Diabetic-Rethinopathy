
import { useEffect, useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import MetricCard from "@/components/common/MetricCard";
import ChartCard from "@/components/common/ChartCard";
import StatusBadge from "@/components/common/StatusBadge";

const API = "http://localhost:5000/api/async/dashboard";

function formatPercent(value) {
  return value == null
    ? "—"
    : `${(Number(value) * 100).toFixed(2)}%`;
}

function decisionLabel(decision) {
  return {
    accepted: "Accepted",
    rejected_stale: "Rejected — Stale",
    rejected_no_improvement: "Rejected — No improvement",
  }[decision] ?? decision;
}

export default function AsyncMonitoringPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
    const [lastRefreshed, setLastRefreshed] = useState(null);
  const [error, setError] = useState("");

  async function refresh() {
    setRefreshing(true);
    setError("");

    try {
      const response = await fetch(API);
      if (!response.ok) {
        throw new Error("Could not load asynchronous FL history.");
      }

      setData(await response.json());
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    setRefreshing(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  if (loading) {
    return <p className="p-6">Loading asynchronous FL dashboard...</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="FEDERATED MONITORING"
        title="Asynchronous FL Dashboard"
        description="Live model registry, validation performance, and hospital submission history."
        actions={
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
            {refreshing ? "Refreshing..." : "Refresh Dashboard"}
            </button>
        }
      />
      {lastRefreshed && (
  <p className="text-xs text-muted-foreground">
    Last refreshed: {lastRefreshed.toLocaleTimeString()}
  </p>
)}

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Global Version"
              value={`v${data.version}`}
              hint={data.checkpoint}
            />
            <MetricCard
              label="Hospitals"
              value={String(data.hospital_count)}
              hint="Configured clients"
            />
            <MetricCard
              label="Accepted Updates"
              value={String(data.accepted_count)}
              hint="Passed validation"
            />
            <MetricCard
              label="Rejected Updates"
              value={String(data.rejected_count)}
              hint="Stale or no improvement"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <MetricCard
              label="Global Validation Accuracy"
              value={formatPercent(data.latest_metrics?.accuracy)}
              hint="Latest accepted checkpoint"
            />
            <MetricCard
              label="Global Macro F1"
              value={formatPercent(data.latest_metrics?.macro_f1)}
              hint={`${data.latest_metrics?.validation_samples ?? "—"} validation images`}
            />
          </div>

          <ChartCard
            title="Hospital Aggregation History"
            subtitle={`${data.total_submissions} recorded asynchronous submissions`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-3 pr-4">Hospital</th>
                    <th className="py-3 pr-4">Base Version</th>
                    <th className="py-3 pr-4">Decision</th>
                    <th className="py-3 pr-4">Result Version</th>
                    <th className="py-3 pr-4">Candidate F1</th>
                  </tr>
                </thead>

                <tbody>
                  {data.events.map((event) => (
                    <tr
                      key={event.submission_id}
                      className="border-b border-border/60"
                    >
                      <td className="py-3 pr-4">
                        Hospital {event.hospital_id}
                      </td>
                      <td className="py-3 pr-4">
                        v{event.base_version}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge
                          tone={
                            event.decision === "accepted"
                              ? "success"
                              : "neutral"
                          }
                        >
                          {decisionLabel(event.decision)}
                        </StatusBadge>
                      </td>
                      <td className="py-3 pr-4">
                        v{event.new_version}
                      </td>
                      <td className="py-3 pr-4">
                        {formatPercent(event.candidate_metrics?.macro_f1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>

          <ChartCard
            title="How Asynchronous Aggregation Works"
            subtitle="Validation-based acceptance of hospital updates"
          >
            <p className="text-sm leading-7 text-muted-foreground">
              Each hospital independently synchronizes, trains locally,
              and submits model parameters. The server rejects stale
              updates and evaluates eligible candidates on its validation
              set. Only updates that improve macro F1 are accepted into
              the next global model version.
            </p>
          </ChartCard>
        </>
      )}
    </div>
  );
}
