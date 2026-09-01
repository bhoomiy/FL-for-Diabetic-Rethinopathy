import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/layout/AppLayout";
import PredictionPage from "@/pages/PredictionPage";

export const Route = createFileRoute("/prediction")({
  head: () => ({
    meta: [
      { title: "Retinal Prediction — FedRetina AI" },
      { name: "description", content: "Analyse a retinal fundus image with the global federated diabetic retinopathy model." },
      { property: "og:title", content: "Retinal Prediction — FedRetina AI" },
      { property: "og:description", content: "Analyse a retinal fundus image with the global federated diabetic retinopathy model." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppLayout title="Retinal image prediction">
      <PredictionPage />
    </AppLayout>
  );
}
