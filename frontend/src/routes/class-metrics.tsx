import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/layout/AppLayout";
import RoleRoute from "@/components/common/RoleRoute";
import { ClassMetricsPage } from "@/pages/admin/EvaluationPages";

export const Route = createFileRoute("/class-metrics")({
  head: () => ({
    meta: [
      { title: "Class Metrics — FedRetina AI" },
      { name: "description", content: "Precision, recall and F1 for each diabetic retinopathy stage." },
      { property: "og:title", content: "Class Metrics — FedRetina AI" },
      { property: "og:description", content: "Precision, recall and F1 for each diabetic retinopathy stage." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <RoleRoute role="admin">
      <AppLayout title="Class Metrics — FedRetina AI">
        <ClassMetricsPage />
      </AppLayout>
    </RoleRoute>
  );
}
