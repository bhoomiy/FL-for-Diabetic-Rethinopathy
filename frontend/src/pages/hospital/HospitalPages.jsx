import PageHeader from "@/components/common/PageHeader";
import ChartCard from "@/components/common/ChartCard";
import MetricCard from "@/components/common/MetricCard";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import DistributionChart from "@/components/charts/DistributionChart";
import PerformanceBar from "@/components/charts/PerformanceBar";
import { useAuth } from "@/context/AuthContext";
import { getClientById } from "@/data/clients";
import { GLOBAL_METRICS } from "@/data/metrics";
import { DR_CLASSES } from "@/constants/drClasses";
import { percent } from "@/components/charts/chartTheme";

function useClient() {
  const { user } = useAuth();
  return getClientById(user?.clientId);
}

function NoClient() {
  return <EmptyState title="No hospital linked" description="This account is not associated with a federated client." />;
}

export function HospitalDashboardPage() {
  const client = useClient();
  if (!client) return <NoClient />;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={client.region} title={client.name}
        description="Your local contribution to the federated diabetic retinopathy network."
        actions={<StatusBadge tone={client.status === "online" ? "success" : "danger"} dot>
          {client.status === "online" ? "Connected" : "Offline"}</StatusBadge>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Local samples" value={String(client.samples)} hint="Retinal images on site" />
        <MetricCard label="Local accuracy" value={percent(client.localAccuracy)} confirmed={false} />
        <MetricCard label="Contribution weight" value={`${(client.contributionWeight * 100).toFixed(0)}%`} hint="In weighted aggregation" />
        <MetricCard label="Global model" value={client.globalModelVersion} hint={`Last sync ${client.lastSync}`} />
      </div>
      <ChartCard title="Your local class distribution" footer="Sample counts are demonstration data.">
        <DistributionChart data={[{ client: client.name, ...client.distribution }]} height={260} />
      </ChartCard>
    </div>
  );
}

export function HospitalDatasetPage() {
  const client = useClient();
  if (!client) return <NoClient />;
  const total = Object.values(client.distribution).reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="My hospital" title="Local dataset"
        description="Retinal fundus images stored on your hospital infrastructure. These images never leave your network." />
      <ChartCard title="Class breakdown" subtitle={`${total} images in total`}>
        <ul className="space-y-4">
          {DR_CLASSES.map((c) => (
            <PerformanceBar key={c.key} label={c.label} value={client.distribution[c.key] / total}
              suffix={`(${client.distribution[c.key]} images)`} />
          ))}
        </ul>
      </ChartCard>
    </div>
  );
}

export function HospitalTrainingPage() {
  const client = useClient();
  if (!client) return <NoClient />;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="My hospital" title="Local training"
        description="Round-by-round participation history for your client."
        actions={<StatusBadge tone={client.trainingStatus === "training" ? "info" : "neutral"} dot>
          {client.trainingStatus === "training" ? "Training locally" : "Idle"}</StatusBadge>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Local epochs per round" value={String(client.localEpochs)} />
        <MetricCard label="Local accuracy" value={percent(client.localAccuracy)} confirmed={false} />
        <MetricCard label="Last sync" value={client.lastSync} />
      </div>
      <ChartCard title="Participation history">
        <ul className="space-y-3">
          {client.participation.map((p) => (
            <li key={p.round} className="flex items-center justify-between border-b border-border pb-3 text-xs last:border-b-0 last:pb-0">
              <span className="font-medium text-foreground">Round {p.round}</span>
              <span className="flex items-center gap-3">
                <span className="tabular-nums text-muted-foreground">{p.accuracy != null ? percent(p.accuracy) : "Not available"}</span>
                <StatusBadge tone={p.participated ? "success" : "neutral"}>{p.participated ? "Participated" : "Missed"}</StatusBadge>
              </span>
            </li>
          ))}
        </ul>
      </ChartCard>
    </div>
  );
}

export function HospitalGlobalModelPage() {
  const client = useClient();
  const behind = client && client.globalModelVersion !== GLOBAL_METRICS.modelVersion;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="My hospital" title="Global model"
        description="The shared model produced by aggregating updates from all participating hospitals."
        actions={<StatusBadge tone={behind ? "warning" : "success"} dot>
          {behind ? `Your client is on ${client.globalModelVersion}` : "Up to date"}</StatusBadge>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Model version" value={GLOBAL_METRICS.modelVersion} hint={GLOBAL_METRICS.status} />
        <MetricCard label="Validation accuracy" value={percent(GLOBAL_METRICS.validationAccuracy.value)} confirmed />
        <MetricCard label="Algorithm" value={GLOBAL_METRICS.algorithm} hint="μ = 0.01" />
        <MetricCard label="Communication rounds" value={String(GLOBAL_METRICS.rounds)} />
      </div>
      <ChartCard title="What your hospital contributes">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your client trains locally for {client?.localEpochs ?? 5} epochs each round and uploads only model parameter
          updates. The server weights your update by your local sample count before merging it into the global model.
        </p>
      </ChartCard>
    </div>
  );
}
