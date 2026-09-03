import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/layout/AppLayout";
import RoleRoute from "@/components/common/RoleRoute";
import { FedAvgVsFedProxPage } from "@/pages/admin/ComparisonPages";

export const Route = createFileRoute("/fedavg-vs-fedprox")({
  head: () => ({
    meta: [
      { title: "FedAvg vs FedProx — FedRetina AI" },
      { name: "description", content: "Convergence comparison between FedAvg and FedProx on heterogeneous hospital data." },
      { property: "og:title", content: "FedAvg vs FedProx — FedRetina AI" },
      { property: "og:description", content: "Convergence comparison between FedAvg and FedProx on heterogeneous hospital data." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <RoleRoute role="admin">
      <AppLayout title="FedAvg vs FedProx — FedRetina AI">
        <FedAvgVsFedProxPage />
      </AppLayout>
    </RoleRoute>
  );
}
