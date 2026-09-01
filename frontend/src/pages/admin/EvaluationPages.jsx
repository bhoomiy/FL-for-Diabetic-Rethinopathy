import PageHeader from "@/components/common/PageHeader";
import ChartCard from "@/components/common/ChartCard";
import MetricCard from "@/components/common/MetricCard";
import StatusBadge from "@/components/common/StatusBadge";
import PerformanceBar from "@/components/charts/PerformanceBar";
import ConfusionMatrixTable from "@/components/federated/ConfusionMatrixTable";
import AccuracyLineChart from "@/components/charts/AccuracyLineChart";
import { CLASS_METRICS, CLASS_WEIGHTS, GLOBAL_METRICS, WEIGHTING_COMPARISON, getWeakestClass } from "@/data/metrics";
import { CONFUSION_LABELS, CONFUSION_MATRIX } from "@/data/confusionMatrix";
import { EXPERIMENTS, ROUND_CURVES } from "@/data/experiments";
import { percent } from "@/components/charts/chartTheme";

export function ModelPerformancePage() {
  const m = GLOBAL_METRICS;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Evaluation" title="Model performance"
        description="Aggregate performance of the global model produced by the best federated configuration."
        actions={<StatusBadge tone="success" dot>Model {m.modelVersion}</StatusBadge>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Validation accuracy" value={percent(m.validationAccuracy.value)} confirmed />
        <MetricCard label="Macro precision" value={m.macroPrecision.value.toFixed(3)} confirmed={false} />
        <MetricCard label="Macro recall" value={m.macroRecall.value.toFixed(3)} confirmed={false} />
        <MetricCard label="Macro F1" value={m.macroF1.value.toFixed(3)} confirmed={false} />
        <MetricCard label="Weighted F1" value={m.weightedF1.value.toFixed(3)} confirmed={false} />
        <MetricCard label="Balanced accuracy" value={percent(m.balancedAccuracy.value)} confirmed={false} />
      </div>
      <ChartCard title="Accuracy across communication rounds" footer="Curve values are demonstration data; round 20 matches the confirmed result.">
        <AccuracyLineChart data={ROUND_CURVES} height={300}
          series={[{ dataKey: "trainAcc", name: "Training", color: "var(--color-chart-1)" },
                   { dataKey: "valAcc", name: "Validation", color: "var(--color-chart-2)" }]} />
      </ChartCard>
    </div>
  );
}

export function ClassMetricsPage() {
  const weakest = getWeakestClass();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Evaluation" title="Class-wise metrics"
        description="Precision, recall and F1 for each of the five diabetic retinopathy stages."
        actions={<StatusBadge tone="warning">Demonstration values</StatusBadge>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Recall (sensitivity) per class" subtitle={`Weakest class: ${weakest.label}`}>
          <div className="space-y-4">
            {CLASS_METRICS.map((c) => (
              <PerformanceBar key={c.key} label={c.label} value={c.recall}
                weak={c.key === weakest.key} tone={c.key === weakest.key ? "danger" : "primary"} />
            ))}
          </div>
        </ChartCard>
        <ChartCard title="F1 score per class">
          <div className="space-y-4">
            {CLASS_METRICS.map((c) => (
              <PerformanceBar key={c.key} label={c.label} value={c.f1} tone="success" />
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
                  <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CLASS_METRICS.map((c) => (
                <tr key={c.key} className="border-b border-border last:border-b-0">
                  <th scope="row" className="px-3 py-3 font-medium text-foreground">{c.label}</th>
                  <td className="px-3 py-3 tabular-nums text-muted-foreground">{c.precision.toFixed(2)}</td>
                  <td className="px-3 py-3 tabular-nums text-muted-foreground">{c.recall.toFixed(2)}</td>
                  <td className="px-3 py-3 tabular-nums text-muted-foreground">{c.f1.toFixed(2)}</td>
                  <td className="px-3 py-3 tabular-nums text-muted-foreground">{c.support}</td>
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
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Evaluation" title="Confusion matrix"
        description="Where the global model confuses one diabetic retinopathy stage for another." />
      <ChartCard title="Actual versus predicted class"
        footer="Severe cases are most often misclassified as Moderate, which is the key clinical risk in this model.">
        <ConfusionMatrixTable labels={CONFUSION_LABELS} matrix={CONFUSION_MATRIX} />
      </ChartCard>
    </div>
  );
}

export function ClassImbalancePage() {
  const weakest = getWeakestClass();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Evaluation" title="Class imbalance"
        description="Minority DR stages are under-represented; class weighting compensates during local training."
        actions={<StatusBadge tone="warning">Weakest class: {weakest.label}</StatusBadge>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Applied class weights" subtitle="Inverse-frequency weights used in the loss function">
          <ul className="space-y-4">
            {CLASS_WEIGHTS.map((c) => (
              <PerformanceBar key={c.key} label={c.label} value={c.weight / 2.5} suffix={`(w = ${c.weight})`} tone="warning" />
            ))}
          </ul>
        </ChartCard>
        <ChartCard title="Recall before and after weighting" footer="Demonstration comparison values.">
          <div className="space-y-5">
            {WEIGHTING_COMPARISON.map((c) => (
              <div key={c.label} className="space-y-2">
                <PerformanceBar label={`${c.label} — before`} value={c.before} tone="danger" />
                <PerformanceBar label={`${c.label} — after`} value={c.after} tone="success" />
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
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
