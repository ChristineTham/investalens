"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface WeightComparisonProps {
  current: Record<string, number>;
  recommended: Record<string, number>;
  height?: number;
}

export function WeightComparison({ current, recommended, height }: WeightComparisonProps) {
  const assets = [...new Set([...Object.keys(current), ...Object.keys(recommended)])].sort();

  const data = assets.map((asset) => ({
    asset,
    current: (current[asset] || 0) * 100,
    recommended: (recommended[asset] || 0) * 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={height ?? Math.max(200, assets.length * 40)}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis type="number" unit="%" className="text-xs" />
        <YAxis dataKey="asset" type="category" width={80} className="text-xs" />
        <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`]} />
        <Legend />
        <Bar dataKey="current" name="Current" fill="hsl(var(--muted-foreground))" />
        <Bar dataKey="recommended" name="Recommended" fill="hsl(var(--primary))" />
      </BarChart>
    </ResponsiveContainer>
  );
}
