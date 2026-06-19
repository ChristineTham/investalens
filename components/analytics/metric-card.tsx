import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  description?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function MetricCard({
  label,
  value,
  suffix,
  description,
  trend,
  className,
}: MetricCardProps) {
  const trendColor =
    trend === "up"
      ? "text-gain"
      : trend === "down"
        ? "text-loss"
        : "text-foreground";

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 shadow-sm",
        className
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", trendColor)}>
        {typeof value === "number" ? value.toFixed(2) : value}
        {suffix && (
          <span className="ml-0.5 text-sm font-normal text-muted-foreground">
            {suffix}
          </span>
        )}
      </p>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
