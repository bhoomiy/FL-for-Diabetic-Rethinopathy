import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/layout/AppLayout";
import RoleRoute from "@/components/common/RoleRoute";
import DashboardPage from "@/pages/admin/DashboardPage";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Research Dashboard — FedRetina AI" },
      { name: "description", content: "Global federated diabetic retinopathy dashboard across four participating hospitals." },
      { property: "og:title", content: "Research Dashboard — FedRetina AI" },
      { property: "og:description", content: "Global federated diabetic retinopathy dashboard across four participating hospitals." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <RoleRoute role="admin">
      <AppLayout title="Research Dashboard — FedRetina AI">
        <DashboardPage />
      </AppLayout>
    </RoleRoute>
  );
}
