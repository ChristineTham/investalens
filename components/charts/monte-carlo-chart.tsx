"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface MonteCarloData {
  month: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  mean: number;
}

interface MonteCarloChartProps {
  data: MonteCarloData[];
  height?: number;
}

export function MonteCarloChart({ data, height = 400 }: MonteCarloChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="month"
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickFormatter={(m) =>
            m % 12 === 0 ? `Y${m / 12}` : ""
          }
        />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickFormatter={(v) =>
            v >= 1_000_000
              ? `$${(v / 1_000_000).toFixed(1)}M`
              : `$${(v / 1_000).toFixed(0)}K`
          }
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontSize: "12px",
          }}
          formatter={(value) => [`$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, ""]}
          labelFormatter={(m) => `Month ${m} (Year ${(Number(m) / 12).toFixed(1)})`}
        />
        <Legend />

        {/* 5th-95th percentile band */}
        <Area
          type="monotone"
          dataKey="p95"
          stroke="none"
          fill="var(--rosely14)"
          fillOpacity={0.1}
          name="95th %ile"
        />
        <Area
          type="monotone"
          dataKey="p5"
          stroke="none"
          fill="var(--background)"
          fillOpacity={1}
          name="5th %ile"
        />

        {/* 25th-75th percentile band */}
        <Area
          type="monotone"
          dataKey="p75"
          stroke="none"
          fill="var(--rosely7)"
          fillOpacity={0.2}
          name="75th %ile"
        />
        <Area
          type="monotone"
          dataKey="p25"
          stroke="none"
          fill="var(--background)"
          fillOpacity={1}
          name="25th %ile"
        />

        {/* Median line */}
        <Area
          type="monotone"
          dataKey="p50"
          stroke="var(--rosely2)"
          strokeWidth={2}
          fill="none"
          name="Median"
        />

        {/* Mean line */}
        <Area
          type="monotone"
          dataKey="mean"
          stroke="var(--rosely14)"
          strokeWidth={1}
          strokeDasharray="5 5"
          fill="none"
          name="Mean"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
