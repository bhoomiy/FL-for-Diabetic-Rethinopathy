import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/layout/AppLayout";
import RoleRoute from "@/components/common/RoleRoute";
import ClientsPage from "@/pages/admin/ClientsPage";

export const Route = createFileRoute("/clients")({
  head: () => ({
    meta: [
      { title: "Hospital Clients — FedRetina AI" },
      { name: "description", content: "Local datasets, training status and contribution weights for each hospital client." },
      { property: "og:title", content: "Hospital Clients — FedRetina AI" },
      { property: "og:description", content: "Local datasets, training status and contribution weights for each hospital client." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <RoleRoute role="admin">
      <AppLayout title="Hospital Clients — FedRetina AI">
        <ClientsPage />
      </AppLayout>
    </RoleRoute>
  );
}
