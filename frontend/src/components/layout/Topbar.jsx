import { useEffect, useState } from "react";
import { LogOut, Menu, Search } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { fetchDashboard } from "@/services/federatedService";
import StatusBadge from "@/components/common/StatusBadge";

export default function Topbar({ onMenuClick, title }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const [globalModel, setGlobalModel] = useState(null);

    useEffect(() => {
      fetchDashboard()
        .then((data) => {
          setGlobalModel(data);
        })
        .catch((error) => {
          console.error("Failed to load global model status:", error);
        });
    }, []);

  const handleLogout = () => {
    signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur lg:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation"
        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <p className="truncate text-sm font-semibold text-foreground lg:text-base">{title}</p>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <label className="relative hidden md:block">
          <span className="sr-only">Search experiments and clients</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search experiments, clients…"
            className="h-9 w-56 rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none lg:w-64"
          />
        </label>

        <StatusBadge tone="success" dot className="hidden sm:inline-flex">
        {globalModel
          ? `${globalModel.algorithm} · ${Number(
              globalModel.validation_accuracy
            ).toFixed(2)}%`
          : "Loading global model"}
      </StatusBadge>

    

        <div className="hidden text-right sm:block">
          <p className="text-xs font-semibold text-foreground">{user?.name}</p>
          <p className="text-[11px] text-muted-foreground">{user?.roleLabel}</p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
