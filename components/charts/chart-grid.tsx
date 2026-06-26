import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Standard responsive chart grid — mirrors the `/portfolio` and `/accounts`
 * card grids so every page lays charts out the same way. Two columns from `lg`,
 * items stretch to equal height.
 */
export function ChartGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid items-stretch gap-4 lg:grid-cols-2", className)}>
      {children}
    </div>
  );
}

/**
 * A grid cell. `span={2}` makes a chart span the full width (both columns).
 */
export function ChartGridItem({
  children,
  span = 1,
  className,
}: {
  children: ReactNode;
  span?: 1 | 2;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", span === 2 && "lg:col-span-2", className)}>
      {children}
    </div>
  );
}
