import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/layout/AppLayout";
import RoleRoute from "@/components/common/RoleRoute";
import { ClassImbalancePage } from "@/pages/admin/EvaluationPages";

export const Route = createFileRoute("/class-imbalance")({
  head: () => ({
    meta: [
      { title: "Class Imbalance — FedRetina AI" },
      { name: "description", content: "Class weighting strategy for under-represented diabetic retinopathy stages." },
      { property: "og:title", content: "Class Imbalance — FedRetina AI" },
      { property: "og:description", content: "Class weighting strategy for under-represented diabetic retinopathy stages." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <RoleRoute role="admin">
      <AppLayout title="Class Imbalance — FedRetina AI">
        <ClassImbalancePage />
      </AppLayout>
    </RoleRoute>
  );
}
