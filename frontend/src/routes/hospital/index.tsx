import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/layout/AppLayout";
import RoleRoute from "@/components/common/RoleRoute";
import { HospitalDashboardPage } from "@/pages/hospital/HospitalPages";

export const Route = createFileRoute("/hospital/")({
  head: () => ({
    meta: [
      { title: "Hospital Dashboard — FedRetina AI" },
      { name: "description", content: "Your hospital contribution to the federated retinopathy network." },
      { property: "og:title", content: "Hospital Dashboard — FedRetina AI" },
      { property: "og:description", content: "Your hospital contribution to the federated retinopathy network." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <RoleRoute role="hospital">
      <AppLayout title="Hospital Dashboard — FedRetina AI">
        <HospitalDashboardPage />
      </AppLayout>
    </RoleRoute>
  );
}
