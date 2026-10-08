
import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import ChartCard from "@/components/common/ChartCard";
import { fetchExperiments } from "@/services/experimentService";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const HISTORY_URL = "http://localhost:5000/api/training-history";

const format = (value, digits = 2) => {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "N/A";
};

const normalized = (value) =>
  String(value ?? "").toLowerCase().replace(/[-\s]/g, "_");

const numberKey = (value) =>
  value === null || value === undefined || value === ""
    ? null
    : Number(value);

function configurationKey(run) {
  return JSON.stringify({
    distribution: normalized(run.distribution),
    algorithm: normalized(run.algorithm),
    rounds: numberKey(run.rounds),
    localEpochs: numberKey(run.localEpochs),
    batchSize: numberKey(run.batchSize),
    learningRate: numberKey(run.learningRate),
    maxBatches: numberKey(run.maxBatches),
    classWeighting: run.classWeighting,
    mu: normalized(run.algorithm) === "fedprox"
      ? numberKey(run.mu)
      : 0,
  });
}

function findLatestMatchingPair(experiments, distribution) {
  const runs = experiments
    .filter(
      (run) =>
        normalized(run.distribution) === distribution &&
        normalized(run.status) === "completed" &&
        typeof run.useDP === "boolean"
    )
    .sort((a, b) => String(b.id).localeCompare(String(a.id)));

  const sameConfiguration = (a, b) =>
    normalized(a.algorithm) === normalized(b.algorithm) &&
    Number(a.rounds) === Number(b.rounds) &&
    Number(a.localEpochs) === Number(b.localEpochs) &&
    Number(a.batchSize) === Number(b.batchSize) &&
    Number(a.learningRate) === Number(b.learningRate) &&
    Number(a.maxBatches) === Number(b.maxBatches) &&
    Boolean(a.classWeighting) === Boolean(b.classWeighting) &&
    (
      normalized(a.algorithm) !== "fedprox" ||
      Number(a.mu) === Number(b.mu)
    );

  for (const run of runs) {
    const match = runs.find(
      (candidate) =>
        candidate.useDP !== run.useDP &&
        sameConfiguration(run, candidate)
    );

    if (match) {
      return {
        normal: run.useDP ? match : run,
        dp: run.useDP ? run : match,
      };
    }
  }

  return null;
}

async function fetchHistory(experimentId) {
  const url = `${HISTORY_URL}?experiment_id=${encodeURIComponent(experimentId)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load history for ${experimentId}`);
  }

  const data = await response.json();
  return data.history ?? [];
}

function MetricCard({ title, experiment, accent }) {
  return (
    <ChartCard title={title} subtitle={experiment.id}>
      <div className="space-y-4">
        <div>
          <p className={`text-3xl font-semibold ${accent}`}>
            {format(experiment.accuracy)}%
          </p>
          <p className="text-sm text-muted-foreground">
            Best validation accuracy
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Final macro F1</p>
            <p className="font-semibold">{format(experiment.macroF1, 4)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Final weighted F1</p>
            <p className="font-semibold">{format(experiment.weightedF1, 4)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Best round</p>
            <p className="font-semibold">{experiment.bestRound ?? "N/A"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total rounds</p>
            <p className="font-semibold">{experiment.rounds ?? "N/A"}</p>
          </div>
        </div>
      </div>
    </ChartCard>
  );
}

export default function DifferentialPrivacyPage() {
  const [distribution, setDistribution] = useState("non_iid");
  const [experiments, setExperiments] = useState([]);
  const [normalHistory, setNormalHistory] = useState([]);
  const [dpHistory, setDpHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadExperiments() {
      try {
        setLoading(true);
        setError("");

        const result = await fetchExperiments();
        const rows = Array.isArray(result) ? result : result.experiments ?? [];

        if (active) setExperiments(rows);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadExperiments();

    return () => {
      active = false;
    };
  }, []);

 const selectedPair = useMemo(
  () => findLatestMatchingPair(experiments, distribution),
  [experiments, distribution]
);

  useEffect(() => {
    let active = true;

    async function loadHistories() {
      if (!selectedPair) {
        setNormalHistory([]);
        setDpHistory([]);
        return;
      }

      try {
        setHistoryLoading(true);
        setError("");
        setNormalHistory([]);
        setDpHistory([]);

        const [normalRows, dpRows] = await Promise.all([
          fetchHistory(selectedPair.normal.id),
          fetchHistory(selectedPair.dp.id),
        ]);

        if (active) {
          setNormalHistory(normalRows);
          setDpHistory(dpRows);
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setHistoryLoading(false);
      }
    }

    loadHistories();

    return () => {
      active = false;
    };
    }, [selectedPair?.normal?.id, selectedPair?.dp?.id]);

  const normal = selectedPair?.normal;
  const dp = selectedPair?.dp;

  const comparison = normal && dp
    ? [
        {
          name: "DP OFF",
          accuracy: normal.accuracy,
          macroF1: normal.macroF1 == null ? null : normal.macroF1 * 100,
          weightedF1:
            normal.weightedF1 == null ? null : normal.weightedF1 * 100,
        },
        {
          name: "DP ON",
          accuracy: dp.accuracy,
          macroF1: dp.macroF1 == null ? null : dp.macroF1 * 100,
          weightedF1:
            dp.weightedF1 == null ? null : dp.weightedF1 * 100,
        },
      ]
    : [];

  const roundNumbers = Array.from(
    new Set([
      ...normalHistory.map((row) => row.round),
      ...dpHistory.map((row) => row.round),
    ])
  ).sort((a, b) => a - b);

  const roundComparison = roundNumbers.map((round) => {
    const normalRow = normalHistory.find((row) => row.round === round);
    const dpRow = dpHistory.find((row) => row.round === round);

    return {
      round,
      normalAccuracy: normalRow?.valAcc ?? null,
      dpAccuracy: dpRow?.valAcc ?? null,
      normalF1:
        normalRow?.macroF1 == null ? null : normalRow.macroF1 * 100,
      dpF1: dpRow?.macroF1 == null ? null : dpRow.macroF1 * 100,
    };
  });

  const accuracyDifference =
    normal && dp && normal.accuracy != null && dp.accuracy != null
      ? Number(normal.accuracy) - Number(dp.accuracy)
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          eyebrow="Privacy study"
          title="DP vs Non-DP"
          description="Compare saved federated learning experiments with and without differential privacy."
        />

        <div className="flex rounded-2xl border border-[#e2cfc1] bg-[#fff8f1] p-1">
          {[
            { value: "iid", label: "IID" },
            { value: "non_iid", label: "Non-IID" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDistribution(option.value)}
              className={`rounded-xl px-5 py-2 text-sm font-medium transition ${
                distribution === option.value
                  ? "bg-pink-400 text-white"
                  : "text-[#8c6955]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>


      {loading && (
        <p className="text-sm text-muted-foreground">
          Loading saved experiments...
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {!loading && !selectedPair && (
        <ChartCard title="No Compatible Experiment Pair">
          <p className="text-sm text-muted-foreground">
            No completed DP ON and DP OFF experiments with matching
            configurations were found for this selection. Run a matching
            experiment pair to enable comparison.
          </p>
        </ChartCard>
      )}

      {selectedPair && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <MetricCard
              title="Without Differential Privacy"
              experiment={normal}
              accent="text-success"
            />
            <MetricCard
              title="With Differential Privacy"
              experiment={dp}
              accent="text-primary"
            />
          </div>

          <ChartCard
            title="DP vs Non-DP Performance"
            subtitle="Best validation accuracy and final-round F1 scores"
          >
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} unit="%" />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="accuracy"
                    name="Best validation accuracy"
                    fill="#e879ad"
                  />
                  <Bar
                    dataKey="macroF1"
                    name="Final macro F1 (%)"
                    fill="#8b7ad8"
                  />
                  <Bar
                    dataKey="weightedF1"
                    name="Final weighted F1 (%)"
                    fill="#65a99a"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard
            title="Validation Accuracy Across Communication Rounds"
            subtitle="Actual round-by-round results from both experiments"
          >
            {historyLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading round history...
              </p>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={roundComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="round" allowDecimals={false} />
                    <YAxis domain={[0, 100]} unit="%" />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="normalAccuracy"
                      name="DP OFF"
                      stroke="#65a99a"
                      strokeWidth={3}
                      dot
                    />
                    <Line
                      type="monotone"
                      dataKey="dpAccuracy"
                      name="DP ON"
                      stroke="#e879ad"
                      strokeWidth={3}
                      dot
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          <ChartCard
            title="Macro F1 Across Communication Rounds"
            subtitle="Class-balanced classification performance"
          >
            {historyLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading round history...
              </p>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={roundComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="round" allowDecimals={false} />
                    <YAxis domain={[0, 100]} unit="%" />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="normalF1"
                      name="DP OFF Macro F1"
                      stroke="#65a99a"
                      strokeWidth={3}
                      dot
                    />
                    <Line
                      type="monotone"
                      dataKey="dpF1"
                      name="DP ON Macro F1"
                      stroke="#e879ad"
                      strokeWidth={3}
                      dot
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          <ChartCard title="Observed Privacy-Utility Difference">
            <p className="text-2xl font-semibold">
              {format(accuracyDifference)} percentage points
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              DP OFF minus DP ON best validation accuracy. This is an
              observed difference between saved experiments, not proof
              that differential privacy alone caused the change.
            </p>
          </ChartCard>

          <ChartCard title="Experiment Configuration">
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Algorithm</p>
                <p className="font-semibold">{normal.algorithm}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Distribution</p>
                <p className="font-semibold">{normal.distribution}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Rounds</p>
                <p className="font-semibold">{normal.rounds}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Batch size</p>
                <p className="font-semibold">{normal.batchSize}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Local epochs</p>
                <p className="font-semibold">{normal.localEpochs}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Maximum batches</p>
                <p className="font-semibold">{normal.maxBatches}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Learning rate</p>
                <p className="font-semibold">{normal.learningRate}</p>
              </div>
              <div>
                <p className="text-muted-foreground">DP clipping norm</p>
                <p className="font-semibold">{format(dp.dpClipNorm, 4)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">DP noise multiplier</p>
                <p className="font-semibold">
                  {format(dp.dpNoiseMultiplier, 4)}
                </p>
              </div>
            </div>

            <p className="mt-5 text-xs text-muted-foreground">
              The DP-enabled experiment applies clipping and noise to
              client model updates. This is not formal DP-SGD and does
              not establish a verified epsilon-delta privacy guarantee.
              Missing or NaN validation losses are not treated as
              valid numerical results.
            </p>
          </ChartCard>
        </>
      )}
    </div>
  );
}
