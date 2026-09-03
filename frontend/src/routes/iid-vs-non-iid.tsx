import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/layout/AppLayout";
import RoleRoute from "@/components/common/RoleRoute";
import { IidVsNonIidPage } from "@/pages/admin/ComparisonPages";

export const Route = createFileRoute("/iid-vs-non-iid")({
  head: () => ({
    meta: [
      { title: "IID vs Non-IID — FedRetina AI" },
      { name: "description", content: "Side-by-side comparison of IID and Non-IID data partitions across clients." },
      { property: "og:title", content: "IID vs Non-IID — FedRetina AI" },
      { property: "og:description", content: "Side-by-side comparison of IID and Non-IID data partitions across clients." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <RoleRoute role="admin">
      <AppLayout title="IID vs Non-IID — FedRetina AI">
        <IidVsNonIidPage />
      </AppLayout>
    </RoleRoute>
  );
}
