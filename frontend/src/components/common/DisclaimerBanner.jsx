import { ShieldAlert } from "lucide-react";
import { RESEARCH_DISCLAIMER } from "@/constants/drClasses";

export default function DisclaimerBanner({ text = RESEARCH_DISCLAIMER, tone = "muted" }) {
  const toneClass =
    tone === "warning"
      ? "border-warning/30 bg-warning/10 text-warning"
      : "border-border bg-surface text-muted-foreground";

  return (
    <p className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-xs leading-relaxed ${toneClass}`}>
      <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{text}</span>
    </p>
  );
}
