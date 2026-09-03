import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import LoadingState from "./LoadingState";

// Redirects unauthenticated visitors to the login page.
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, initializing } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!initializing && !isAuthenticated) navigate({ to: "/" });
  }, [initializing, isAuthenticated, navigate]);

  if (initializing || !isAuthenticated) return <LoadingState label="Checking your session…" className="min-h-screen" />;
  return children;
}
