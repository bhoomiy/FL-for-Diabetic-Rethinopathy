import { Eye } from "lucide-react";

export default function Logo({ compact = false, onDark = false }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground ring-1 ring-primary/40">
        <Eye className="size-5" aria-hidden="true" />
      </span>
      {!compact ? (
        <span className="min-w-0">
          <span
            className={`block truncate text-sm font-semibold tracking-tight ${
              onDark ? "text-sidebar-foreground" : "text-foreground"
            }`}
          >
            FedRetina AI
          </span>
          <span className={`block truncate text-[11px] ${onDark ? "text-sidebar-muted" : "text-muted-foreground"}`}>
            Federated Research Network
          </span>
        </span>
      ) : null}
    </span>
  );
}
