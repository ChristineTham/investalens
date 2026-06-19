"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useState } from "react";

interface GrowthChartProps {
  dates: string[];
  portfolioValues: number[];
  benchmarkValues?: number[];
  portfolioLabel?: string;
  benchmarkLabel?: string;
}

export function GrowthChart({
  dates,
  portfolioValues,
  benchmarkValues,
  portfolioLabel = "Portfolio",
  benchmarkLabel = "Benchmark",
}: GrowthChartProps) {
  const [logScale, setLogScale] = useState(false);

  // Rebase to 100
  const basePort = portfolioValues[0] || 1;
  const baseBench = benchmarkValues?.[0] || 1;

  const data = dates.map((date, i) => ({
    date,
    portfolio: (portfolioValues[i] / basePort) * 100,
    benchmark: benchmarkValues
      ? (benchmarkValues[i] / baseBench) * 100
      : undefined,
  }));

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          className={`rounded px-2 py-1 text-xs ${logScale ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          onClick={() => setLogScale(!logScale)}
        >
          Log Scale
        </button>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => d.slice(0, 7)}
            className="text-xs"
          />
          <YAxis
            scale={logScale ? "log" : "auto"}
            domain={logScale ? ["auto", "auto"] : undefined}
            className="text-xs"
          />
          <Tooltip
            labelFormatter={(d) => String(d)}
            formatter={(v) => [Number(v).toFixed(2), ""]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="portfolio"
            name={portfolioLabel}
            stroke="hsl(var(--primary))"
            dot={false}
            strokeWidth={2}
          />
          {benchmarkValues && (
            <Line
              type="monotone"
              dataKey="benchmark"
              name={benchmarkLabel}
              stroke="hsl(var(--muted-foreground))"
              dot={false}
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
