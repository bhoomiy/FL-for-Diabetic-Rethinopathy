import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import LoadingState from "./LoadingState";

// Restricts a page to a single role. Hospital users can never open admin pages.
export default function RoleRoute({ role, children }) {
  const { user, initializing } = useAuth();
  const navigate = useNavigate();
  const allowed = user?.role === role;

  useEffect(() => {
    if (initializing || !user) return;
    if (!allowed) navigate({ to: user.role === "admin" ? "/dashboard" : "/hospital" });
  }, [initializing, user, allowed, navigate]);

  if (initializing || !user || !allowed) return <LoadingState label="Checking access…" className="min-h-screen" />;
  return children;
}
