"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type {
  HoldingMetric,
  SectorAlloc,
} from "@/lib/services/portfolio-detail";
import { HoldingTooltipCard } from "@/components/charts/holding-tooltip";
import { formatCurrency } from "@/lib/utils";

interface AllocationPieProps {
  holdings: HoldingMetric[];
  sectors: SectorAlloc[];
  currency: string;
  height: number;
}

interface SliceDatum {
  holding: HoldingMetric;
  value: number;
}

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: SliceDatum }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  return <HoldingTooltipCard h={payload[0].payload.holding} />;
}

/**
 * Allocation pie: one slice per holding (consistent colours), with a rich
 * per-holding hover tooltip and a sector breakdown legend.
 */
export function AllocationPie({
  holdings,
  sectors,
  currency,
  height,
}: AllocationPieProps) {
  const data: SliceDatum[] = holdings
    .filter((h) => h.currentValue > 0)
    .map((h) => ({ holding: h, value: h.currentValue }));

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No valued holdings to allocate.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 sm:flex-row">
      <div className="min-w-0 flex-1">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="holding.code"
              cx="50%"
              cy="50%"
              innerRadius="45%"
              outerRadius="80%"
              paddingAngle={1}
              stroke="var(--background)"
              strokeWidth={1}
            >
              {data.map((d) => (
                <Cell key={d.holding.id} fill={d.holding.colorVar} />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Sector breakdown */}
      <ul className="flex max-h-full min-w-40 flex-col gap-1 overflow-y-auto text-xs sm:w-2/5">
        <li className="mb-0.5 font-medium text-muted-foreground">By sector</li>
        {sectors.map((s) => (
          <li key={s.sector} className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-sm ${s.colorSwatch}`}
              aria-hidden
            />
            <span className="truncate">{s.sector}</span>
            <span className="ml-auto shrink-0 text-muted-foreground tabular-nums">
              {s.percent.toFixed(0)}%
            </span>
            <span className="w-20 shrink-0 text-right tabular-nums">
              {formatCurrency(s.value, currency)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
