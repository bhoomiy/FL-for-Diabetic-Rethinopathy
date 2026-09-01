import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/layout/AppLayout";
import RoleRoute from "@/components/common/RoleRoute";
import { ModelImprovementPage } from "@/pages/admin/EvaluationPages";

export const Route = createFileRoute("/model-improvement")({
  head: () => ({
    meta: [
      { title: "Model Improvement — FedRetina AI" },
      { name: "description", content: "Prioritised next steps for improving minority-class sensitivity." },
      { property: "og:title", content: "Model Improvement — FedRetina AI" },
      { property: "og:description", content: "Prioritised next steps for improving minority-class sensitivity." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <RoleRoute role="admin">
      <AppLayout title="Model Improvement — FedRetina AI">
        <ModelImprovementPage />
      </AppLayout>
    </RoleRoute>
  );
}
