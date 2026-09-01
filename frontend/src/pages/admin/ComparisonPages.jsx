import PageHeader from "@/components/common/PageHeader";
import ChartCard from "@/components/common/ChartCard";
import StatusBadge from "@/components/common/StatusBadge";
import AccuracyLineChart from "@/components/charts/AccuracyLineChart";
import DistributionChart from "@/components/charts/DistributionChart";
import { ROUND_CURVES } from "@/data/experiments";
import { CLIENTS } from "@/data/clients";
import { DR_CLASSES } from "@/constants/drClasses";

function ComparisonTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-xs">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th scope="col" className="px-3 py-2 font-medium">Aspect</th>
            <th scope="col" className="px-3 py-2 font-medium">Option A</th>
            <th scope="col" className="px-3 py-2 font-medium">Option B</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.aspect} className="border-b border-border last:border-b-0">
              <th scope="row" className="px-3 py-3 font-medium text-foreground">{r.aspect}</th>
              <td className="px-3 py-3 text-muted-foreground">{r.a}</td>
              <td className="px-3 py-3 text-muted-foreground">{r.b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FedAvgVsFedProxPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Algorithm study"
        title="FedAvg vs FedProx"
        description="How the proximal term changes convergence when hospital data is heterogeneous."
        actions={<StatusBadge tone="warning">FedAvg curve is demonstration data</StatusBadge>}
      />
      <ChartCard
        title="Validation accuracy per communication round"
        subtitle="Non-IID split, 20 rounds, 5 local epochs"
        footer="Only the FedProx round-20 value (80.33%) is a confirmed result."
      >
        <AccuracyLineChart
          data={ROUND_CURVES}
          height={320}
          series={[
            { dataKey: "valAcc", name: "FedProx (μ = 0.01)", color: "var(--color-chart-1)" },
            { dataKey: "fedavg", name: "FedAvg", color: "var(--color-chart-3)" },
          ]}
        />
      </ChartCard>
      <ChartCard title="Behavioural comparison">
        <ComparisonTable
          rows={[
            { aspect: "Objective", a: "FedAvg — plain weighted average of client updates", b: "FedProx — average plus a proximal penalty" },
            { aspect: "Client drift", a: "Unconstrained; clients can diverge on skewed data", b: "Penalised; local weights stay near the global model" },
            { aspect: "Best suited to", a: "IID or near-IID partitions", b: "Non-IID partitions and stragglers" },
            { aspect: "Extra hyper-parameter", a: "None", b: "Proximal coefficient μ" },
            { aspect: "Observed in this project", a: "Not recorded yet", b: "80.33% validation accuracy (confirmed)" },
          ]}
        />
      </ChartCard>
    </div>
  );
}

const iidRows = (() => {
  const totals = DR_CLASSES.reduce((acc, c) => {
    acc[c.key] = CLIENTS.reduce((s, cl) => s + cl.distribution[c.key], 0);
    return acc;
  }, {});
  return CLIENTS.map((c) => {
    const row = { client: c.name };
    DR_CLASSES.forEach((d) => {
      row[d.key] = Math.round(totals[d.key] / CLIENTS.length);
    });
    return row;
  });
})();

const nonIidRows = CLIENTS.map((c) => ({ client: c.name, ...c.distribution }));

export function IidVsNonIidPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Partition study"
        title="IID vs Non-IID"
        description="Side-by-side view of how the same dataset is split across hospitals under each partitioning scheme."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="IID partition" subtitle="Balanced class mix at every hospital">
          <DistributionChart data={iidRows} height={300} />
        </ChartCard>
        <ChartCard title="Non-IID partition" subtitle="Each hospital dominated by a different DR stage">
          <DistributionChart data={nonIidRows} height={300} />
        </ChartCard>
      </div>
      <ChartCard title="What changes for the global model">
        <ComparisonTable
          rows={[
            { aspect: "Realism", a: "IID — synthetic, rarely occurs in practice", b: "Non-IID — matches real screening populations" },
            { aspect: "Convergence", a: "Smooth and fast", b: "Slower, noisier across rounds" },
            { aspect: "Minority classes", a: "Represented at every client", b: "Concentrated at one or two clients" },
            { aspect: "Recommended algorithm", a: "FedAvg is sufficient", b: "FedProx with class weighting" },
          ]}
        />
      </ChartCard>
    </div>
  );
}
