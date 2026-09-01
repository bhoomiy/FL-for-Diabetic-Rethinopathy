import { Inbox } from "lucide-react";

export default function EmptyState({ title = "Nothing to show yet", description, icon: Icon = Inbox, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <span className="rounded-full bg-muted p-3 text-muted-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
