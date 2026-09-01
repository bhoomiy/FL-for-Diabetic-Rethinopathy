import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/layout/AppLayout";
import RoleRoute from "@/components/common/RoleRoute";
import { ExperimentHistoryPage } from "@/pages/admin/EvaluationPages";

export const Route = createFileRoute("/experiment-history")({
  head: () => ({
    meta: [
      { title: "Experiment History — FedRetina AI" },
      { name: "description", content: "Chronological record of every federated training run in the project." },
      { property: "og:title", content: "Experiment History — FedRetina AI" },
      { property: "og:description", content: "Chronological record of every federated training run in the project." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <RoleRoute role="admin">
      <AppLayout title="Experiment History — FedRetina AI">
        <ExperimentHistoryPage />
      </AppLayout>
    </RoleRoute>
  );
}
