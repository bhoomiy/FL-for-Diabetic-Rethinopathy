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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHospitalData() {
      try {
        const [clientsData, dashboard, distributionData] =
          await Promise.all([
            fetchClients(),
            fetchDashboard(),
            fetchDataDistribution(),
          ]);

        const clientId = Number(
          String(user?.clientId).replace("client-", "")
        );

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
          <StatusBadge tone="success" dot>
            Participating
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTrainingData() {
      try {
        const [dashboard, clientsData] = await Promise.all([
          fetchDashboard(),
          fetchClients(),
        ]);

        const clientId = Number(
          String(user?.clientId).replace("client-", "")
        );

        const currentClient = clientsData.find(
          (item) => Number(item.id) === clientId
        );

        setDashboardData(dashboard);
        setClient(currentClient ?? null);
      } catch (error) {
        console.error("Failed to load hospital training data:", error);
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
        description="Loading the latest federated experiment."
      />
    );
  }

  if (!client || !dashboardData) return <NoClient />;

  const rounds = Number(dashboardData.rounds ?? 0);

  const participation = Array.from(
    { length: rounds },
    (_, index) => ({
      round: index + 1,
      participated: true,
    })
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My hospital"
        title="Local training"
        description="Participation of this hospital in the latest federated experiment."
        actions={
          <StatusBadge tone="success" dot>
            Completed
          </StatusBadge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Local epochs per round"
          value={String(dashboardData.local_epochs ?? "—")}
        />

        <MetricCard
          label="Communication rounds"
          value={String(dashboardData.rounds ?? "—")}
        />

        <MetricCard
          label="Latest experiment"
          value={dashboardData.experiment_id ?? "—"}
          hint={`${dashboardData.distribution?.toUpperCase() ?? "—"} · ${
            dashboardData.algorithm ?? "—"
          }`}
        />
      </div>

      <ChartCard
        title="Participation history"
        subtitle={`${client.name} participated in the latest completed experiment`}
      >
        <ul className="space-y-3">
          {participation.map((item) => (
            <li
              key={item.round}
              className="flex items-center justify-between border-b border-border pb-3 text-xs last:border-b-0 last:pb-0"
            >
              <span className="font-medium text-foreground">
                Round {item.round}
              </span>

              <StatusBadge tone="success">
                Participated
              </StatusBadge>
            </li>
          ))}
        </ul>
      </ChartCard>
    </div>
  );
}

export function HospitalGlobalModelPage() {
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGlobalModel() {
      try {
        const [dashboard, clientsData] = await Promise.all([
          fetchDashboard(),
          fetchClients(),
        ]);

        const clientId = Number(
          String(user?.clientId).replace("client-", "")
        );

        const currentClient = clientsData.find(
          (item) => Number(item.id) === clientId
        );

        setDashboardData(dashboard);
        setClient(currentClient ?? null);
      } catch (error) {
        console.error("Failed to load global model data:", error);
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
        description="Loading the latest federated model."
      />
    );
  }

  if (!client || !dashboardData) return <NoClient />;

  const algorithm = dashboardData.algorithm ?? "—";

  const algorithmHint =
    algorithm.toLowerCase() === "fedprox"
      ? `μ = ${dashboardData.mu ?? "—"}`
      : "Weighted aggregation";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My hospital"
        title="Global model"
        description="The shared model produced by aggregating updates from all participating hospitals."
        actions={
          <StatusBadge tone="success" dot>
            Latest model
          </StatusBadge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Experiment"
          value={dashboardData.experiment_id ?? "—"}
          hint="Latest completed experiment"
        />

        <MetricCard
          label="Validation accuracy"
          value={
            dashboardData.validation_accuracy != null
              ? `${Number(dashboardData.validation_accuracy).toFixed(2)}%`
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

      <ChartCard title="What your hospital contributes">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {client.name} trains locally for{" "}
          {dashboardData.local_epochs ?? "—"} epoch
          {Number(dashboardData.local_epochs) === 1 ? "" : "s"} per round
          and shares only model parameter updates with the federated server.
          The server weights this hospital's update according to its local
          sample count before aggregating it into the global model.
        </p>
      </ChartCard>
    </div>
  );
}