import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import PageHeader from "@/components/common/PageHeader";
import ChartCard from "@/components/common/ChartCard";
import MetricCard from "@/components/common/MetricCard";
import StatusBadge from "@/components/common/StatusBadge";
import DistributionChart from "@/components/charts/DistributionChart";
import { CLIENTS } from "@/data/clients";
import { DR_CLASSES } from "@/constants/drClasses";
import { TOOLTIP_PROPS } from "@/components/charts/chartTheme";

const clientRows = CLIENTS.map((c) => ({ client: c.name, ...c.distribution }));

const iidRows = (() => {
  const totals = DR_CLASSES.reduce((acc, c) => {
    acc[c.key] = CLIENTS.reduce((sum, cl) => sum + cl.distribution[c.key], 0);
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

const globalTotals = DR_CLASSES.map((c) => ({
  name: c.label,
  value: CLIENTS.reduce((sum, cl) => sum + cl.distribution[c.key], 0),
  color: c.color,
}));

const totalSamples = globalTotals.reduce((a, b) => a + b.value, 0);
const majority = globalTotals.reduce((a, b) => (b.value > a.value ? b : a));
const minority = globalTotals.reduce((a, b) => (b.value < a.value ? b : a));

export default function DataDistributionPage() {
  const [mode, setMode] = useState("non-iid");
  const rows = mode === "iid" ? iidRows : clientRows;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dataset"
        title="Data distribution analysis"
        description="Compare how diabetic retinopathy classes are spread across the four hospitals under IID and Non-IID partitions."
        actions={
          <div className="inline-flex rounded-lg border border-border bg-surface p-1" role="group" aria-label="Partition mode">
            {[
              { key: "iid", label: "IID" },
              { key: "non-iid", label: "Non-IID" },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                aria-pressed={mode === opt.key}
                onClick={() => setMode(opt.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === opt.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total samples" value={String(totalSamples)} hint="Across all clients" />
        <MetricCard label="Majority class" value={majority.name} hint={`${majority.value} samples`} />
        <MetricCard label="Minority class" value={minority.name} hint={`${minority.value} samples`} />
        <MetricCard
          label="Imbalance ratio"
          value={`${(majority.value / minority.value).toFixed(1)} : 1`}
          hint="Majority to minority"
        />
      </div>

      <ChartCard
        title={mode === "iid" ? "IID partition" : "Non-IID partition"}
        subtitle={
          mode === "iid"
            ? "Every hospital receives a statistically similar class mix"
            : "Each hospital is dominated by a different DR stage, mirroring real screening populations"
        }
        footer="Sample counts are demonstration data."
      >
        <DistributionChart data={rows} height={340} />
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Global class balance" subtitle="Combined dataset across all four clients">
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={globalTotals} dataKey="value" nameKey="name" innerRadius={65} outerRadius={110} paddingAngle={2}>
                  {globalTotals.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="var(--color-background)" />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_PROPS} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-xs">
            {globalTotals.map((g) => (
              <li key={g.name} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-foreground">
                  <span className="size-2 rounded-full" style={{ backgroundColor: g.color }} aria-hidden="true" />
                  {g.name}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {((g.value / totalSamples) * 100).toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </ChartCard>

        <ChartCard title="Per-client sample share" subtitle="Contribution weight in the weighted aggregation">
          <ul className="space-y-4">
            {CLIENTS.map((c) => {
              const share = (c.samples / CLIENTS.reduce((a, b) => a + b.samples, 0)) * 100;
              return (
                <li key={c.id}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{c.name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {c.samples} samples · {share.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-5">
            <StatusBadge tone="warning">
              Non-IID skew increases client drift, which FedProx mitigates with its proximal term
            </StatusBadge>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
