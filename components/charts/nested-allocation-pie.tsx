"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type {
  HoldingMetric,
  SectorAlloc,
} from "@/lib/services/portfolio-detail";
import { HoldingTooltipCard } from "@/components/charts/holding-tooltip";
import { formatCurrency } from "@/lib/utils";

interface NestedAllocationPieProps {
  holdings: HoldingMetric[];
  sectors: SectorAlloc[];
  currency: string;
  height: number;
}

interface SectorSlice {
  kind: "sector";
  sector: SectorAlloc;
}
interface HoldingSlice {
  kind: "holding";
  holding: HoldingMetric;
  value: number;
}

function NestedTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: { payload: SectorSlice | HoldingSlice }[];
  currency: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0].payload;
  if (datum.kind === "holding") {
    return <HoldingTooltipCard h={datum.holding} />;
  }
  const s = datum.sector;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="flex items-center gap-2 font-medium">
        <span className={`h-2.5 w-2.5 rounded-sm ${s.colorSwatch}`} aria-hidden />
        {s.sector}
      </div>
      <div className="mt-1 tabular-nums text-muted-foreground">
        {formatCurrency(s.value, currency)} · {s.percent.toFixed(1)}%
      </div>
    </div>
  );
}

/**
 * Two-level (nested) allocation pie: inner ring = sectors, outer ring =
 * individual holdings grouped by sector so the rings line up. Hovering the
 * outer ring shows the rich per-holding card; the inner ring shows the sector
 * total. A "sunburst-like" nested view without the Sunburst component's limits.
 */
export function NestedAllocationPie({
  holdings,
  sectors,
  currency,
  height,
}: NestedAllocationPieProps) {
  // Order holdings by their sector's position so outer slices align with the
  // inner ring segment they belong to.
  const sectorOrder = new Map(sectors.map((s, i) => [s.sector, i]));
  const holdingData: HoldingSlice[] = holdings
    .filter((h) => h.currentValue > 0)
    .map((h) => ({ kind: "holding" as const, holding: h, value: h.currentValue }))
    .sort(
      (a, b) =>
        (sectorOrder.get(a.holding.sector) ?? 999) -
        (sectorOrder.get(b.holding.sector) ?? 999)
    );

  const sectorData: SectorSlice[] = sectors
    .filter((s) => s.value > 0)
    .map((s) => ({ kind: "sector" as const, sector: s }));

  if (holdingData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No valued holdings to allocate.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        {/* Inner ring — sectors */}
        <Pie
          data={sectorData}
          dataKey={(d: SectorSlice) => d.sector.value}
          nameKey={(d: SectorSlice) => d.sector.sector}
          cx="50%"
          cy="50%"
          outerRadius="55%"
          stroke="var(--background)"
          strokeWidth={1}
        >
          {sectorData.map((d) => (
            <Cell key={d.sector.sector} fill={d.sector.colorVar} />
          ))}
        </Pie>
        {/* Outer ring — holdings */}
        <Pie
          data={holdingData}
          dataKey="value"
          nameKey={(d: HoldingSlice) => d.holding.code}
          cx="50%"
          cy="50%"
          innerRadius="60%"
          outerRadius="80%"
          paddingAngle={1}
          stroke="var(--background)"
          strokeWidth={1}
        >
          {holdingData.map((d) => (
            <Cell key={d.holding.id} fill={d.holding.colorVar} />
          ))}
        </Pie>
        <Tooltip content={<NestedTooltip currency={currency} />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
