import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/layout/AppLayout";
import RoleRoute from "@/components/common/RoleRoute";
import ConfigureExperimentPage from "@/pages/admin/ConfigureExperimentPage";

export const Route = createFileRoute("/configure-experiment")({
  head: () => ({
    meta: [
      { title: "Configure Experiment — FedRetina AI" },
      { name: "description", content: "Assemble and queue a new federated training configuration." },
      { property: "og:title", content: "Configure Experiment — FedRetina AI" },
      { property: "og:description", content: "Assemble and queue a new federated training configuration." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <RoleRoute role="admin">
      <AppLayout title="Configure Experiment — FedRetina AI">
        <ConfigureExperimentPage />
      </AppLayout>
    </RoleRoute>
  );
}
