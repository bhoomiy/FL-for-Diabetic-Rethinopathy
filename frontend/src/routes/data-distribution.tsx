import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/layout/AppLayout";
import RoleRoute from "@/components/common/RoleRoute";
import DataDistributionPage from "@/pages/admin/DataDistributionPage";

export const Route = createFileRoute("/data-distribution")({
  head: () => ({
    meta: [
      { title: "Data Distribution — FedRetina AI" },
      { name: "description", content: "IID and Non-IID class distribution analysis across federated clients." },
      { property: "og:title", content: "Data Distribution — FedRetina AI" },
      { property: "og:description", content: "IID and Non-IID class distribution analysis across federated clients." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <RoleRoute role="admin">
      <AppLayout title="Data Distribution — FedRetina AI">
        <DataDistributionPage />
      </AppLayout>
    </RoleRoute>
  );
}
