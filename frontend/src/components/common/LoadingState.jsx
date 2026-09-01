import { Loader2 } from "lucide-react";

export default function LoadingState({ label = "Loading data…", className = "" }) {
  return (
    <div className={`flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground ${className}`} role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
