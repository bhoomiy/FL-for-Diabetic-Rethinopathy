
import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/layout/AppLayout";
import RoleRoute from "@/components/common/RoleRoute";
import AsyncMonitoringPage from "@/pages/admin/AsyncMonitoringPage";

export const Route = createFileRoute("/async-monitoring")({
  head: () => ({
    meta: [
      {
        title: "Async FL Monitoring — FedRetina AI",
      },
      {
        name: "description",
        content:
          "Monitor asynchronous federated learning, hospital submissions, and global model updates.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <RoleRoute role="admin">
      <AppLayout title="Async FL Monitoring — FedRetina AI">
        <AsyncMonitoringPage />
      </AppLayout>
    </RoleRoute>
  );
}
