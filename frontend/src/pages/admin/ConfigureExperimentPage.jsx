import { useState } from "react";
import { Info, Play, RotateCcw } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import ChartCard from "@/components/common/ChartCard";
import Button from "@/components/common/Button";
import StatusBadge from "@/components/common/StatusBadge";
import ConfigurationSummary from "@/components/federated/ConfigurationSummary";
import { CURRENT_BEST_CONFIG } from "@/data/experiments";
import { startExperiment } from "@/services/experimentService";

const DEFAULTS = {
  distribution: "Non-IID",
  aggregation: "Weighted",
  algorithm: "FedProx",
  learningRate: 0.0005,
  mu: 0.01,
  classWeighting: true,
  rounds: 20,
  localEpochs: 5,
  batchSize: 32,
};

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-foreground">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const selectClass =
  "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-primary focus:outline-none";

export default function ConfigureExperimentPage() {
  const [config, setConfig] = useState(DEFAULTS);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);

  const update = (patch) => setConfig((c) => ({ ...c, ...patch }));

  const run = async () => {
    setRunning(true);
    setResult(null);
    setProgress({ round: 0, totalRounds: config.rounds, progress: 0 });
    const res = await startExperiment(config, setProgress);
    setResult(res);
    setRunning(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Planning"
        title="Configure experiment"
        description="Assemble a federated configuration and queue it for the training backend."
        actions={<StatusBadge tone="warning">Simulated run — no training happens in the browser</StatusBadge>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ChartCard title="Federated parameters">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Data distribution" hint="Non-IID mirrors real hospital populations.">
                <select
                  className={selectClass}
                  value={config.distribution}
                  onChange={(e) => update({ distribution: e.target.value })}
                >
                  <option>IID</option>
                  <option>Non-IID</option>
                </select>
              </Field>

              <Field label="Aggregation strategy" hint="Weighted aggregation scales updates by local sample count.">
                <select
                  className={selectClass}
                  value={config.aggregation}
                  onChange={(e) => update({ aggregation: e.target.value })}
                >
                  <option>Standard</option>
                  <option>Weighted</option>
                </select>
              </Field>

              <Field label="Algorithm" hint="FedProx adds a proximal term that limits client drift.">
                <select
                  className={selectClass}
                  value={config.algorithm}
                  onChange={(e) =>
                    update({ algorithm: e.target.value, mu: e.target.value === "FedProx" ? (config.mu ?? 0.01) : null })
                  }
                >
                  <option>FedAvg</option>
                  <option>FedProx</option>
                </select>
              </Field>

              <Field label="Learning rate">
                <select
                  className={selectClass}
                  value={config.learningRate}
                  onChange={(e) => update({ learningRate: Number(e.target.value) })}
                >
                  {[0.0001, 0.0005, 0.001, 0.005].map((lr) => (
                    <option key={lr} value={lr}>
                      {lr}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={`Proximal term μ — ${config.mu ?? "not applicable"}`} hint="Only used by FedProx.">
                <input
                  type="range"
                  min="0"
                  max="0.1"
                  step="0.005"
                  disabled={config.algorithm !== "FedProx"}
                  value={config.mu ?? 0}
                  onChange={(e) => update({ mu: Number(e.target.value) })}
                  className="w-full accent-[var(--color-primary)] disabled:opacity-40"
                />
              </Field>

              <Field label={`Communication rounds — ${config.rounds}`}>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={config.rounds}
                  onChange={(e) => update({ rounds: Number(e.target.value) })}
                  className="w-full accent-[var(--color-primary)]"
                />
              </Field>

              <Field label={`Local epochs — ${config.localEpochs}`}>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={config.localEpochs}
                  onChange={(e) => update({ localEpochs: Number(e.target.value) })}
                  className="w-full accent-[var(--color-primary)]"
                />
              </Field>

              <Field label="Batch size">
                <select
                  className={selectClass}
                  value={config.batchSize}
                  onChange={(e) => update({ batchSize: Number(e.target.value) })}
                >
                  {[16, 32, 64].map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </Field>

              <label className="flex items-center gap-2 text-xs text-foreground sm:col-span-2">
                <input
                  type="checkbox"
                  checked={config.classWeighting}
                  onChange={(e) => update({ classWeighting: e.target.checked })}
                  className="size-4 rounded border-border bg-surface accent-[var(--color-primary)]"
                />
                Apply class weighting to counter minority-class imbalance
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
              <Button onClick={run} disabled={running}>
                <Play className="size-4" aria-hidden="true" /> {running ? "Running simulation…" : "Run experiment"}
              </Button>
              <Button variant="outline" onClick={() => setConfig(DEFAULTS)} disabled={running}>
                <RotateCcw className="size-4" aria-hidden="true" /> Reset to best config
              </Button>
            </div>

            {progress ? (
              <div className="mt-5" aria-live="polite">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Round {progress.round} of {progress.totalRounds}
                  </span>
                  <span className="tabular-nums">{progress.progress.toFixed(0)}%</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress.progress}%` }} />
                </div>
              </div>
            ) : null}

            {result ? (
              <p className="mt-4 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-foreground">
                Simulation finished. {result.experimentId} would be queued on the training server — no accuracy is
                reported because no real training ran.
              </p>
            ) : null}
          </ChartCard>

          <section className="card-surface flex gap-3 p-5">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              This screen produces a configuration payload for the future training backend. When the API is connected,
              the same form posts to <code className="text-foreground">POST /experiments</code> and streams real
              round-by-round progress.
            </p>
          </section>
        </div>

        <div className="space-y-6">
          <ConfigurationSummary config={{ ...config, experimentId: null }} title="Selected configuration" showAccuracy={false} />
          <ConfigurationSummary config={CURRENT_BEST_CONFIG} />
        </div>
      </div>
    </div>
  );
}
