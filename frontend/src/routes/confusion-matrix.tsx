import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/layout/AppLayout";
import RoleRoute from "@/components/common/RoleRoute";
import { ConfusionMatrixPage } from "@/pages/admin/EvaluationPages";

export const Route = createFileRoute("/confusion-matrix")({
  head: () => ({
    meta: [
      { title: "Confusion Matrix — FedRetina AI" },
      { name: "description", content: "Actual versus predicted diabetic retinopathy stages for the global model." },
      { property: "og:title", content: "Confusion Matrix — FedRetina AI" },
      { property: "og:description", content: "Actual versus predicted diabetic retinopathy stages for the global model." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <RoleRoute role="admin">
      <AppLayout title="Confusion Matrix — FedRetina AI">
        <ConfusionMatrixPage />
      </AppLayout>
    </RoleRoute>
  );
}
