import PageHeader from "@/components/common/PageHeader";
import ChartCard from "@/components/common/ChartCard";
import MetricCard from "@/components/common/MetricCard";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import DistributionChart from "@/components/charts/DistributionChart";
import PerformanceBar from "@/components/charts/PerformanceBar";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  fetchClients,
  fetchDashboard,
  fetchDataDistribution,
  fetchHospitalStatus,
} from "@/services/federatedService";
import { getClientById } from "@/data/clients";
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
  const { user } = useAuth();

  const [client, setClient] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [runtimeStatus, setRuntimeStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHospitalData() {
      try {
        const clientId = Number(
          String(user?.clientId).replace("client-", "")
        );
        const [
          clientsData,
          dashboard,
          distributionData,
          hospitalStatus,
        ] = await Promise.all([
          fetchClients(),
          fetchDashboard(),
          fetchDataDistribution(),
          fetchHospitalStatus(clientId),
        ]);

        
        const currentClient = clientsData.find(
          (item) => Number(item.id) === clientId
        );

        if (!currentClient) {
          setClient(null);
          return;
        }

        const distributionKey =
          dashboard?.distribution === "non_iid"
            ? "non_iid"
            : "iid";

        const partition = distributionData[distributionKey]?.find(
          (item) => Number(item.id) === clientId
        );

        const classDistribution = {};

        partition?.classes?.forEach((item) => {
          if (item.className === "No DR") {
            classDistribution.no_dr = item.count;
          }

          if (item.className === "Mild") {
            classDistribution.mild = item.count;
          }

          if (item.className === "Moderate") {
            classDistribution.moderate = item.count;
          }

          if (item.className === "Severe") {
            classDistribution.severe = item.count;
          }

          if (item.className === "Proliferative DR") {
            classDistribution.proliferative = item.count;
          }
        });

        setClient(currentClient);
        setDashboardData(dashboard);
        setRuntimeStatus(hospitalStatus);
        setDistribution(classDistribution);
      } catch (error) {
        console.error("Failed to load hospital dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    if (user?.clientId) {
      loadHospitalData();
    } else {
      setLoading(false);
    }
  }, [user?.clientId]);

  if (loading) {
    return (
      <EmptyState
        title="Loading hospital"
        description="Loading federated client data."
      />
    );
  }

  if (!client) return <NoClient />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Federated client ${client.id}`}
        title={client.name}
        description="Your local contribution to the federated diabetic retinopathy network."
        actions={
        <StatusBadge
          tone={
            runtimeStatus?.status === "completed"
              ? "success"
              : runtimeStatus?.status === "training"
                ? "info"
                : "neutral"
          }
          dot
        >
          {runtimeStatus?.status === "completed"
            ? "Completed"
            : runtimeStatus?.status === "training"
              ? "Training"
              : "Idle"}
        </StatusBadge>
      }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Local samples"
          value={String(client.samples)}
          hint="APTOS retinal images on site"
        />

        <MetricCard
          label="Local epochs"
          value={String(dashboardData?.local_epochs ?? "—")}
          hint="Per communication round"
        />

        <MetricCard
          label="Contribution weight"
          value={`${(client.contributionWeight * 100).toFixed(2)}%`}
          hint="In weighted aggregation"
        />

        <MetricCard
          label="Latest experiment"
          value={dashboardData?.experiment_id ?? "—"}
          hint={
            dashboardData?.distribution
              ? `${dashboardData.distribution.toUpperCase()} · ${dashboardData.algorithm}`
              : "No completed experiment"
          }
        />
      </div>

      <ChartCard
        title="Your local class distribution"
        subtitle={
          dashboardData?.distribution === "non_iid"
            ? "Non-IID partition used by the latest experiment"
            : "IID partition used by the latest experiment"
        }
        footer="Class counts loaded from this hospital's real APTOS client partition."
      >
        <DistributionChart
          data={[
            {
              client: client.name,
              ...(distribution ?? {}),
            },
          ]}
          height={260}
        />
      </ChartCard>
    </div>
  );
}

export function HospitalDatasetPage() {
  const { user } = useAuth();

  const [distribution, setDistribution] = useState(null);
  const [distributionType, setDistributionType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDataset() {
      try {
        const [dashboard, distributionData] = await Promise.all([
          fetchDashboard(),
          fetchDataDistribution(),
        ]);

        const clientId = Number(
          String(user?.clientId).replace("client-", "")
        );

        const distributionKey =
          dashboard?.distribution === "non_iid"
            ? "non_iid"
            : "iid";

        const hospitalPartition = distributionData[distributionKey]?.find(
          (item) => Number(item.id) === clientId
        );

        setDistribution(hospitalPartition ?? null);
        setDistributionType(distributionKey);
      } catch (error) {
        console.error("Failed to load local dataset:", error);
        setDistribution(null);
      } finally {
        setLoading(false);
      }
    }

    if (user?.clientId) {
      loadDataset();
    } else {
      setLoading(false);
    }
  }, [user?.clientId]);

  if (loading) {
    return (
      <EmptyState
        title="Loading local dataset"
        description="Loading this hospital's APTOS partition."
      />
    );
  }

  if (!distribution) return <NoClient />;

  const classCounts = {};

  distribution.classes.forEach((item) => {
    if (item.className === "No DR") {
      classCounts.no_dr = item.count;
    }

    if (item.className === "Mild") {
      classCounts.mild = item.count;
    }

    if (item.className === "Moderate") {
      classCounts.moderate = item.count;
    }

    if (item.className === "Severe") {
      classCounts.severe = item.count;
    }

    if (item.className === "Proliferative DR") {
      classCounts.proliferative = item.count;
    }
  });

  const total = distribution.samples;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My hospital"
        title="Local dataset"
        description="Retinal fundus images stored on your hospital infrastructure. These images never leave your network."
        actions={
          <StatusBadge tone="info">
            {distributionType === "non_iid" ? "Non-IID" : "IID"} partition
          </StatusBadge>
        }
      />

      <ChartCard
        title="Class breakdown"
        subtitle={`${total} APTOS images in this hospital`}
        footer={`Class counts loaded from the real ${
          distributionType === "non_iid" ? "Non-IID" : "IID"
        } client partition.`}
      >
        <ul className="space-y-4">
          {DR_CLASSES.map((c) => {
            const count = classCounts[c.key] ?? 0;

            return (
              <PerformanceBar
                key={c.key}
                label={c.label}
                value={total > 0 ? count / total : 0}
                suffix={`(${count} images)`}
              />
            );
          })}
        </ul>
      </ChartCard>
    </div>
  );
}

export function HospitalTrainingPage() {
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [client, setClient] = useState(null);
  const [runtimeStatus, setRuntimeStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTrainingData() {
      try {
        const clientId = Number(
          String(user?.clientId).replace("client-", "")
        );

        const [dashboard, clientsData, hospitalStatus] =
          await Promise.all([
            fetchDashboard(),
            fetchClients(),
            fetchHospitalStatus(clientId),
          ]);

        const currentClient = clientsData.find(
          (item) => Number(item.id) === clientId
        );

        setDashboardData(dashboard);
        setClient(currentClient ?? null);
        setRuntimeStatus(hospitalStatus);
      } catch (error) {
        console.error(
          "Failed to load hospital training data:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    if (user?.clientId) {
      loadTrainingData();
    } else {
      setLoading(false);
    }
  }, [user?.clientId]);

  if (loading) {
    return (
      <EmptyState
        title="Loading training data"
        description="Loading this hospital's Docker runtime state."
      />
    );
  }

  if (!client || !dashboardData || !runtimeStatus) {
    return <NoClient />;
  }

  const runtimeState = runtimeStatus.status ?? "idle";

  const statusTone =
    runtimeState === "completed"
      ? "success"
      : runtimeState === "training"
        ? "info"
        : "neutral";

  const statusLabel =
    runtimeState === "completed"
      ? "Completed"
      : runtimeState === "training"
        ? "Training"
        : "Idle";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My hospital"
        title="Local training"
        description="Live training state reported by this hospital's Docker worker."
        actions={
          <StatusBadge tone={statusTone} dot>
            {statusLabel}
          </StatusBadge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Completed training requests"
          value={String(
            runtimeStatus.completed_training_requests ?? 0
          )}
          hint="Since this hospital container started"
        />

        <MetricCard
          label="Local epochs"
          value={
            runtimeStatus.local_epochs != null
              ? String(runtimeStatus.local_epochs)
              : "—"
          }
          hint="Latest Docker training request"
        />

        <MetricCard
          label="Local training accuracy"
          value={
            runtimeStatus.train_accuracy != null
              ? `${Number(runtimeStatus.train_accuracy).toFixed(2)}%`
              : "—"
          }
          hint="Latest local training result"
        />

        <MetricCard
          label="Local training loss"
          value={
            runtimeStatus.train_loss != null
              ? Number(runtimeStatus.train_loss).toFixed(4)
              : "—"
          }
          hint="Latest local training result"
        />
      </div>

      <ChartCard
        title="Docker training state"
        subtitle={`${client.name} runtime information`}
      >
        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-muted-foreground">
              Global model received
            </span>

            <StatusBadge
              tone={
                runtimeStatus.global_model_received
                  ? "success"
                  : "neutral"
              }
            >
              {runtimeStatus.global_model_received ? "Yes" : "No"}
            </StatusBadge>
          </div>

          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-muted-foreground">
              Distribution
            </span>

            <span className="font-medium text-foreground">
              {runtimeStatus.distribution
                ? runtimeStatus.distribution
                    .replace("_", "-")
                    .toUpperCase()
                : "—"}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-muted-foreground">
              Algorithm
            </span>

            <span className="font-medium text-foreground">
              {runtimeStatus.algorithm
                ? runtimeStatus.algorithm.toUpperCase()
                : "—"}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-muted-foreground">
              Local samples
            </span>

            <span className="font-medium text-foreground">
              {runtimeStatus.num_samples ?? "—"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Learning rate
            </span>

            <span className="font-medium text-foreground">
              {runtimeStatus.learning_rate ?? "—"}
            </span>
          </div>
        </div>
      </ChartCard>
    </div>
  );
}

export function HospitalGlobalModelPage() {
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [client, setClient] = useState(null);
  const [runtimeStatus, setRuntimeStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGlobalModel() {
      try {
        const clientId = Number(
          String(user?.clientId).replace("client-", "")
        );

        const [dashboard, clientsData, hospitalStatus] =
          await Promise.all([
            fetchDashboard(),
            fetchClients(),
            fetchHospitalStatus(clientId),
          ]);

        const currentClient = clientsData.find(
          (item) => Number(item.id) === clientId
        );

        setDashboardData(dashboard);
        setClient(currentClient ?? null);
        setRuntimeStatus(hospitalStatus);
      } catch (error) {
        console.error(
          "Failed to load global model data:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    if (user?.clientId) {
      loadGlobalModel();
    } else {
      setLoading(false);
    }
  }, [user?.clientId]);

  if (loading) {
    return (
      <EmptyState
        title="Loading global model"
        description="Loading federated model information."
      />
    );
  }

  if (!client || !dashboardData || !runtimeStatus) {
    return <NoClient />;
  }

  const algorithm = dashboardData.algorithm ?? "—";

  const algorithmHint =
    algorithm.toLowerCase() === "fedprox"
      ? `μ = ${dashboardData.mu ?? "—"}`
      : "Weighted aggregation";

  const receivedGlobalModel =
    runtimeStatus.global_model_received === true;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My hospital"
        title="Global model"
        description="The shared model produced by aggregating updates from participating hospitals."
        actions={
          <StatusBadge
            tone={receivedGlobalModel ? "success" : "neutral"}
            dot
          >
            {receivedGlobalModel
              ? "Model received"
              : "Not received"}
          </StatusBadge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Latest server experiment"
          value={dashboardData.experiment_id ?? "—"}
          hint="Latest completed federated experiment"
        />

        <MetricCard
          label="Validation accuracy"
          value={
            dashboardData.validation_accuracy != null
              ? `${Number(
                  dashboardData.validation_accuracy
                ).toFixed(2)}%`
              : "—"
          }
          confirmed
        />

        <MetricCard
          label="Algorithm"
          value={algorithm}
          hint={algorithmHint}
        />

        <MetricCard
          label="Communication rounds"
          value={String(dashboardData.rounds ?? "—")}
        />
      </div>

      <ChartCard
        title="Hospital model state"
        subtitle={`${client.name} Docker worker`}
      >
        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-muted-foreground">
              Global model received by this worker
            </span>

            <StatusBadge
              tone={receivedGlobalModel ? "success" : "neutral"}
            >
              {receivedGlobalModel ? "Yes" : "No"}
            </StatusBadge>
          </div>

          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-muted-foreground">
              Worker status
            </span>

            <span className="font-medium text-foreground">
              {runtimeStatus.status
                ? runtimeStatus.status.toUpperCase()
                : "—"}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-muted-foreground">
              Completed training requests
            </span>

            <span className="font-medium text-foreground">
              {runtimeStatus.completed_training_requests ?? 0}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Latest local algorithm
            </span>

            <span className="font-medium text-foreground">
              {runtimeStatus.algorithm
                ? runtimeStatus.algorithm.toUpperCase()
                : "—"}
            </span>
          </div>
        </div>
      </ChartCard>

      <ChartCard title="What your hospital contributes">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {client.name} trains locally and shares model parameter
          updates with the federated server. The server weights this
          hospital&apos;s update according to its local sample count
          before aggregating it into the global model.
        </p>
      </ChartCard>
    </div>
  );
}