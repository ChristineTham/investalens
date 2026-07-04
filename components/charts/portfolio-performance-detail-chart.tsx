"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import {
  type ChartRange,
  type PerformancePoint,
  formatAxisDate,
} from "@/components/charts/portfolio-chart-utils";

interface PerformanceChartProps {
  data: PerformancePoint[];
  currency: string;
  range: ChartRange;
  benchmarkName?: string;
  height: number;
  lineLabel?: string;
}

interface TooltipEntry {
  dataKey?: string | number;
  value?: number;
  payload?: PerformancePoint;
}

function PerfTooltip({
  active,
  payload,
  label,
  currency,
  benchmarkName,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  currency: string;
  benchmarkName?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  const benchEntry = payload.find((p) => p.dataKey === "Benchmark");

  return (
    <div className="rounded-md border border-border bg-card p-2.5 text-xs shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      <div className="space-y-0.5">
        {((point.capitalGain ?? 0) !== 0 || (point.income ?? 0) !== 0) ? (
          <>
            <div className="flex items-center justify-between gap-6">
              <span className="text-muted-foreground">Capital gain (Price)</span>
              <span
                className={`font-medium tabular-nums ${point.capitalGain >= 0 ? "text-gain" : "text-loss"}`}
              >
                {formatCurrency(point.capitalGain, currency)} ({point.priceGain != null ? (point.priceGain >= 0 ? "+" : "") + point.priceGain.toFixed(1) + "%" : "—"})
              </span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span className="text-muted-foreground">+ Income (Dividends)</span>
              <span className="font-medium tabular-nums text-gain">
                {formatCurrency(point.income, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-6 border-t border-border pt-0.5">
              <span className="text-muted-foreground">= Total return</span>
              <span
                className={`font-semibold tabular-nums ${point.totalGain >= 0 ? "text-gain" : "text-loss"}`}
              >
                {formatCurrency(point.totalGain, currency)} ({point.Portfolio >= 0 ? "+" : ""}{point.Portfolio.toFixed(1)}%)
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-6">
              <span className="text-muted-foreground">Price return</span>
              <span
                className={`font-medium tabular-nums ${point.priceGain != null && point.priceGain >= 0 ? "text-gain" : "text-loss"}`}
              >
                {point.priceGain != null ? (point.priceGain >= 0 ? "+" : "") + point.priceGain.toFixed(1) + "%" : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-6 border-t border-border pt-0.5">
              <span className="text-muted-foreground">Total return</span>
              <span
                className={`font-semibold tabular-nums ${point.Portfolio >= 0 ? "text-gain" : "text-loss"}`}
              >
                {point.Portfolio >= 0 ? "+" : ""}{point.Portfolio.toFixed(1)}%
              </span>
            </div>
          </>
        )}
        {benchEntry?.value != null && (
          <div className="flex items-center justify-between gap-6 border-t border-border pt-0.5">
            <span className="text-muted-foreground">
              {benchmarkName ?? "Benchmark"}
            </span>
            <span className="font-medium tabular-nums">
              {Number(benchEntry.value) >= 0 ? "+" : ""}
              {Number(benchEntry.value).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Portfolio performance (% gain/loss) over the selected range, with optional
 * benchmark comparison. The tooltip breaks the gain down as
 * capital gain + income = total gain.
 */
export function PortfolioPerformanceDetailChart({
  data,
  currency,
  range,
  benchmarkName,
  height,
  lineLabel,
}: PerformanceChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No performance history in this range.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
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
          tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
          width={44}
        />
        <Tooltip
          content={
            <PerfTooltip
              currency={currency}
              benchmarkName={benchmarkName}
            />
          }
        />
        <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="2 2" />
        <Line
          type="monotone"
          dataKey="Portfolio"
          stroke="var(--rosely14)"
          strokeWidth={2.5}
          dot={false}
          name={`${lineLabel ?? "Portfolio"} (Total)`}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="priceGain"
          stroke="var(--rosely7)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
          dot={false}
          name={`${lineLabel ?? "Portfolio"} (Price)`}
          isAnimationActive={false}
        />
        {benchmarkName && (
          <Line
            type="monotone"
            dataKey="Benchmark"
            stroke="var(--rosely11)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
