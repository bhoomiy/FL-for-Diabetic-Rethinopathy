import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/layout/AppLayout";
import RoleRoute from "@/components/common/RoleRoute";
import { HospitalTrainingPage } from "@/pages/hospital/HospitalPages";

export const Route = createFileRoute("/hospital/training")({
  head: () => ({
    meta: [
      { title: "Local Training — FedRetina AI" },
      { name: "description", content: "Round-by-round local training participation for your hospital client." },
      { property: "og:title", content: "Local Training — FedRetina AI" },
      { property: "og:description", content: "Round-by-round local training participation for your hospital client." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <RoleRoute role="hospital">
      <AppLayout title="Local Training — FedRetina AI">
        <HospitalTrainingPage />
      </AppLayout>
    </RoleRoute>
  );
}
