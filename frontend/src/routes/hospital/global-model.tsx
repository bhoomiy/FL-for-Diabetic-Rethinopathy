import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/layout/AppLayout";
import RoleRoute from "@/components/common/RoleRoute";
import { HospitalGlobalModelPage } from "@/pages/hospital/HospitalPages";

export const Route = createFileRoute("/hospital/global-model")({
  head: () => ({
    meta: [
      { title: "Global Model — FedRetina AI" },
      { name: "description", content: "The shared model aggregated from all participating hospitals." },
      { property: "og:title", content: "Global Model — FedRetina AI" },
      { property: "og:description", content: "The shared model aggregated from all participating hospitals." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <RoleRoute role="hospital">
      <AppLayout title="Global Model — FedRetina AI">
        <HospitalGlobalModelPage />
      </AppLayout>
    </RoleRoute>
  );
}
