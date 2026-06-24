"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import {
  type ChartRange,
  type SeriesMeta,
  type ValuePoint,
  compactCurrency,
  formatAxisDate,
} from "@/components/charts/portfolio-chart-utils";

interface PortfolioAreaChartProps {
  data: ValuePoint[];
  series: SeriesMeta[];
  currency: string;
  range: ChartRange;
  height: number;
}

interface TooltipEntry {
  dataKey?: string | number;
  value?: number;
  color?: string;
}

function AreaTooltip({
  active,
  payload,
  label,
  currency,
  series,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  currency: string;
  series: SeriesMeta[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const total = payload.find((p) => p.dataKey === "Total")?.value ?? 0;
  const rows = series
    .map((h) => ({
      code: h.code,
      swatch: h.colorSwatch,
      value: Number(payload.find((p) => p.dataKey === h.code)?.value ?? 0),
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="rounded-md border border-border bg-card p-2.5 text-xs shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      <div className="mb-1 flex items-center justify-between gap-6 border-b border-border pb-1">
        <span className="text-muted-foreground">Total</span>
        <span className="font-semibold tabular-nums">
          {formatCurrency(Number(total), currency)}
        </span>
      </div>
      <ul className="max-h-56 space-y-0.5 overflow-y-auto">
        {rows.map((r) => (
          <li key={r.code} className="flex items-center gap-2">
            <span
              className={`h-2 w-2 shrink-0 rounded-sm ${r.swatch}`}
              aria-hidden
            />
            <span className="truncate">{r.code}</span>
            <span className="ml-auto tabular-nums">
              {formatCurrency(r.value, currency)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Stacked area of each holding's value over time, with the overall portfolio
 * value drawn as a thicker line on top.
 */
export function PortfolioAreaChart({
  data,
  series,
  currency,
  range,
  height,
}: PortfolioAreaChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No price history in this range.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="date"
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickFormatter={(d) => formatAxisDate(String(d), range)}
          minTickGap={28}
        />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickFormatter={(v) => compactCurrency(Number(v))}
          width={56}
        />
        <Tooltip
          content={
            <AreaTooltip currency={currency} series={series} />
          }
        />
        {series.map((h) => (
          <Area
            key={h.id}
            type="monotone"
            dataKey={h.code}
            stackId="value"
            stroke={h.colorVar}
            fill={h.colorVar}
            fillOpacity={0.55}
            strokeWidth={0.5}
            isAnimationActive={false}
            dot={false}
          />
        ))}
        <Line
          type="monotone"
          dataKey="Total"
          stroke="var(--foreground)"
          strokeWidth={2.5}
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
