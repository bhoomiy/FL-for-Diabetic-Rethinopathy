import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/layout/AppLayout";
import RoleRoute from "@/components/common/RoleRoute";
import ExperimentsPage from "@/pages/admin/ExperimentsPage";

export const Route = createFileRoute("/experiments")({
  head: () => ({
    meta: [
      { title: "Experiments — FedRetina AI" },
      { name: "description", content: "Federated experiment matrix with algorithms, distributions and recorded accuracy." },
      { property: "og:title", content: "Experiments — FedRetina AI" },
      { property: "og:description", content: "Federated experiment matrix with algorithms, distributions and recorded accuracy." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <RoleRoute role="admin">
      <AppLayout title="Experiments — FedRetina AI">
        <ExperimentsPage />
      </AppLayout>
    </RoleRoute>
  );
}
