import { useEffect, useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import ChartCard from "@/components/common/ChartCard";
import Modal from "@/components/common/Modal";
import StatusBadge from "@/components/common/StatusBadge";
import ClientCard from "@/components/federated/ClientCard";
import DistributionChart from "@/components/charts/DistributionChart";
import { DR_CLASSES } from "@/constants/drClasses";
import {
  fetchClients,
  fetchDashboard,
  fetchDataDistribution,
} from "@/services/federatedService";


export default function ClientsPage() {
  const [clients, setClients] = useState([]);
const [dashboardData, setDashboardData] = useState(null);
const [distributionRows, setDistributionRows] = useState([]);
  const [selected, setSelected] = useState(null);
  useEffect(() => {
  fetchClients()
    .then((data) => {
      setClients(data);
    })
    .catch((error) => {
      console.error("Failed to fetch clients:", error);
    });
}, []);

useEffect(() => {
  fetchDashboard()
    .then((data) => {
      setDashboardData(data);
    })
    .catch((error) => {
      console.error("Failed to fetch dashboard data:", error);
    });
}, []);

useEffect(() => {
  if (!dashboardData?.distribution) return;

  fetchDataDistribution()
    .then((data) => {
      const distributionKey =
        dashboardData.distribution === "non_iid" ? "non_iid" : "iid";

      const currentClients = data[distributionKey];

      const rows = currentClients.map((client) => {
        const distribution = {};

        client.classes.forEach((item) => {
          if (item.className === "No DR") distribution.no_dr = item.count;
          if (item.className === "Mild") distribution.mild = item.count;
          if (item.className === "Moderate") distribution.moderate = item.count;
          if (item.className === "Severe") distribution.severe = item.count;
          if (item.className === "Proliferative DR") {
            distribution.proliferative = item.count;
          }
        });

        return {
          client: client.name,
          ...distribution,
        };
      });

      setDistributionRows(rows);
    })
    .catch((error) => {
      console.error("Failed to fetch data distribution:", error);
    });
}, [dashboardData]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Participants"
        title="Hospital clients"
        description="Local dataset size, training status and contribution weight for every participating hospital."
        actions={
  <StatusBadge tone="info">
    {clients.filter((c) => c.status === "online").length} of {clients.length} online
  </StatusBadge>
}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {clients.map((c) => (
          <ClientCard
            key={c.id}
            client={c}
            localEpochs={dashboardData?.local_epochs ?? 1}
            onSelect={() => {
              const distribution = distributionRows.find(
                (row) => row.client === c.name
              );

              setSelected({
                ...c,
                distribution,
              });
            }}
          />
        ))}
      </div>

      <ChartCard
        title="Local class distribution per client"
        subtitle={
  dashboardData?.distribution === "non_iid"
    ? "Non-IID split — each hospital sees a different mix of DR stages"
    : "IID split — DR stages are distributed approximately evenly across hospitals"
}
        footer={`Sample counts loaded from the real ${
  dashboardData?.distribution === "non_iid" ? "Non-IID" : "IID"
} client partition.`}
      >
        <DistributionChart data={distributionRows} />
      </ChartCard>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name ?? ""}>
        {selected ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground">Federated client</p>
                <p className="mt-0.5 font-medium text-foreground">
                  Client {selected.id}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="mt-0.5 font-medium text-foreground">
                  {selected.status === "online" ? "Online" : "Offline"}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">Local samples</p>
                <p className="mt-0.5 font-medium tabular-nums text-foreground">
                  {selected.samples}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">Contribution weight</p>
                <p className="mt-0.5 font-medium tabular-nums text-foreground">
                  {(selected.contributionWeight * 100).toFixed(2)}%
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class distribution</h3>
              <ul className="mt-2 space-y-1.5">
                {DR_CLASSES.map((c) => (
                  <li key={c.key} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-foreground">
                      <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} aria-hidden="true" />
                      {c.label}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{selected.distribution?.[c.key] ?? 0} samples</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
