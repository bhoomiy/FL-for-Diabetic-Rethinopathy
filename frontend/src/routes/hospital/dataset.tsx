import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/layout/AppLayout";
import RoleRoute from "@/components/common/RoleRoute";
import { HospitalDatasetPage } from "@/pages/hospital/HospitalPages";

export const Route = createFileRoute("/hospital/dataset")({
  head: () => ({
    meta: [
      { title: "Local Dataset — FedRetina AI" },
      { name: "description", content: "Retinal fundus images stored on your hospital infrastructure." },
      { property: "og:title", content: "Local Dataset — FedRetina AI" },
      { property: "og:description", content: "Retinal fundus images stored on your hospital infrastructure." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <RoleRoute role="hospital">
      <AppLayout title="Local Dataset — FedRetina AI">
        <HospitalDatasetPage />
      </AppLayout>
    </RoleRoute>
  );
}
