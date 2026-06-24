"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import {
  type HoldingMeta,
  type MovementPoint,
  compactCurrency,
} from "@/components/charts/portfolio-chart-utils";

interface MovementChartProps {
  data: MovementPoint[];
  holdings: HoldingMeta[];
  currency: string;
  height: number;
}

interface TooltipEntry {
  dataKey?: string | number;
  value?: number;
}

function MovementTooltip({
  active,
  payload,
  label,
  currency,
  holdings,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  currency: string;
  holdings: HoldingMeta[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const rows = holdings
    .map((h) => ({
      code: h.code,
      swatch: h.colorSwatch,
      value: Number(payload.find((p) => p.dataKey === h.code)?.value ?? 0),
    }))
    .filter((r) => r.value !== 0)
    .sort((a, b) => b.value - a.value);
  const net = rows.reduce((s, r) => s + r.value, 0);

  return (
    <div className="rounded-md border border-border bg-card p-2.5 text-xs shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      <ul className="max-h-56 space-y-0.5 overflow-y-auto">
        {rows.map((r) => (
          <li key={r.code} className="flex items-center gap-2">
            <span
              className={`h-2 w-2 shrink-0 rounded-sm ${r.swatch}`}
              aria-hidden
            />
            <span className="truncate">{r.code}</span>
            <span
              className={`ml-auto tabular-nums ${r.value >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatCurrency(r.value, currency)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-1 flex items-center justify-between gap-6 border-t border-border pt-1">
        <span className="text-muted-foreground">Net flow</span>
        <span
          className={`font-semibold tabular-nums ${net >= 0 ? "text-green-600" : "text-red-600"}`}
        >
          {formatCurrency(net, currency)}
        </span>
      </div>
    </div>
  );
}

/**
 * Portfolio movement: net cash flow per month, stacked by holding. Inflows
 * (buys + distributions) sit above zero; outflows (sells) below.
 */
export function PortfolioMovementChart({
  data,
  holdings,
  currency,
  height,
}: MovementChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No transactions in this range.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="period"
          stroke="var(--muted-foreground)"
          fontSize={11}
          minTickGap={20}
        />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickFormatter={(v) => compactCurrency(Number(v))}
          width={56}
        />
        <Tooltip
          cursor={{ fill: "var(--accent)", opacity: 0.3 }}
          content={<MovementTooltip currency={currency} holdings={holdings} />}
        />
        <ReferenceLine y={0} stroke="var(--muted-foreground)" />
        {holdings.map((h) => (
          <Bar
            key={h.id}
            dataKey={h.code}
            stackId="flow"
            fill={h.colorVar}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
