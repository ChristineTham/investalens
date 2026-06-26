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

interface DataPoint {
  date: string;
  portfolio: number;
  benchmark?: number;
}

interface PortfolioGrowthChartProps {
  data: DataPoint[];
  showBenchmark?: boolean;
  height?: number;
}

export function PortfolioGrowthChart({
  data,
  showBenchmark = false,
  height = 400,
}: PortfolioGrowthChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
        <YAxis stroke="var(--muted-foreground)" fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="portfolio"
          stroke="var(--primary)"
          strokeWidth={2}
          dot={false}
          name="Portfolio"
        />
        {showBenchmark && (
          <Line
            type="monotone"
            dataKey="benchmark"
            stroke="var(--muted-foreground)"
            strokeWidth={1}
            strokeDasharray="5 5"
            dot={false}
            name="Benchmark"
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
