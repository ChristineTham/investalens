"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface ReturnHistogramProps {
  returns: number[];
  bins?: number;
  height?: number;
}

export function ReturnHistogram({ returns, bins = 40, height = 300 }: ReturnHistogramProps) {
  if (returns.length === 0) return null;

  const min = Math.min(...returns);
  const max = Math.max(...returns);
  const binWidth = (max - min) / bins;

  // Build histogram
  const histogram = Array.from({ length: bins }, (_, i) => {
    const lower = min + i * binWidth;
    const upper = lower + binWidth;
    const count = returns.filter((r) => r >= lower && r < upper).length;
    return {
      range: `${(lower * 100).toFixed(1)}%`,
      count,
      midpoint: ((lower + upper) / 2) * 100,
    };
  });

  // Stats
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const std = Math.sqrt(
    returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1)
  );

  return (
    <div>
      <div className="mb-3 flex gap-4 text-xs text-muted-foreground">
        <span>Mean: {(mean * 100).toFixed(3)}%</span>
        <span>Std: {(std * 100).toFixed(3)}%</span>
        <span>N: {returns.length}</span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={histogram}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="midpoint"
            tickFormatter={(v: number) => `${v.toFixed(1)}%`}
            className="text-xs"
          />
          <YAxis className="text-xs" />
          <Tooltip
            labelFormatter={(v) => `${Number(v).toFixed(2)}%`}
            formatter={(v) => [Number(v), "Count"]}
          />
          <ReferenceLine x={mean * 100} stroke="red" strokeDasharray="3 3" />
          <Bar dataKey="count" fill="hsl(var(--primary))" opacity={0.8} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
