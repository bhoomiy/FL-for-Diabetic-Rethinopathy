import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/layout/AppLayout";
import DifferentialPrivacyPage from "@/pages/admin/DifferentialPrivacyPage";

export const Route = createFileRoute("/dp-vs-non-dp")({
  component: DPComparisonRoute,
});

function DPComparisonRoute() {
  return (
    <AppLayout title="DP vs Non-DP">
      <DifferentialPrivacyPage />
    </AppLayout>
  );
}