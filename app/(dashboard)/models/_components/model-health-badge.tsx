import { cn } from "@/lib/utils";
import type { ModelHealth } from "@/lib/services/share-checker";

const STYLES: Record<ModelHealth, string> = {
  green:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/30",
  amber:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-amber-500/30",
  red: "bg-destructive/10 text-destructive ring-destructive/30",
};

const LABELS: Record<ModelHealth, string> = {
  green: "Healthy",
  amber: "Review",
  red: "At risk",
};

export function ModelHealthBadge({
  level,
  reasons,
}: {
  level: ModelHealth;
  reasons?: string[];
}) {
  return (
    <span
      title={reasons?.join("; ")}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        STYLES[level]
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          level === "green"
            ? "bg-emerald-500"
            : level === "amber"
              ? "bg-amber-500"
              : "bg-destructive"
        )}
        aria-hidden
      />
      {LABELS[level]}
    </span>
  );
}
