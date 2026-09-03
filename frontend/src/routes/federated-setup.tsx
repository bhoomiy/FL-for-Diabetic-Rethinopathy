import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/layout/AppLayout";
import RoleRoute from "@/components/common/RoleRoute";
import FederatedSetupPage from "@/pages/admin/FederatedSetupPage";

export const Route = createFileRoute("/federated-setup")({
  head: () => ({
    meta: [
      { title: "Federated Setup — FedRetina AI" },
      { name: "description", content: "Network topology and communication rounds of the federated learning setup." },
      { property: "og:title", content: "Federated Setup — FedRetina AI" },
      { property: "og:description", content: "Network topology and communication rounds of the federated learning setup." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <RoleRoute role="admin">
      <AppLayout title="Federated Setup — FedRetina AI">
        <FederatedSetupPage />
      </AppLayout>
    </RoleRoute>
  );
}
