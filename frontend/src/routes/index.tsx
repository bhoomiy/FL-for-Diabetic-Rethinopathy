import { createFileRoute } from "@tanstack/react-router";
import LoginPage from "@/pages/auth/LoginPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — FedRetina AI Federated Retinopathy Research" },
      { name: "description", content: "Secure sign-in for the FedRetina AI federated diabetic retinopathy research network." },
      { property: "og:title", content: "FedRetina AI — Federated Diabetic Retinopathy Detection" },
      { property: "og:description", content: "Privacy-preserving federated learning across four hospitals for diabetic retinopathy screening." },
    ],
  }),
  component: LoginPage,
});
