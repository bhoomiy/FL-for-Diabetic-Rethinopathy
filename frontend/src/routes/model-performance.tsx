import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/layout/AppLayout";
import RoleRoute from "@/components/common/RoleRoute";
import { ModelPerformancePage } from "@/pages/admin/EvaluationPages";

export const Route = createFileRoute("/model-performance")({
  head: () => ({
    meta: [
      { title: "Model Performance — FedRetina AI" },
      { name: "description", content: "Aggregate performance metrics of the global federated retinopathy model." },
      { property: "og:title", content: "Model Performance — FedRetina AI" },
      { property: "og:description", content: "Aggregate performance metrics of the global federated retinopathy model." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <RoleRoute role="admin">
      <AppLayout title="Model Performance — FedRetina AI">
        <ModelPerformancePage />
      </AppLayout>
    </RoleRoute>
  );
}
