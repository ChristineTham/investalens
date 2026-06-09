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
  ReferenceLine,
} from "recharts";

interface AnnualReturnData {
  year: string;
  portfolio: number;
  benchmark?: number;
}

interface AnnualReturnsBarChartProps {
  data: AnnualReturnData[];
  showBenchmark?: boolean;
}

export function AnnualReturnsBarChart({
  data,
  showBenchmark = false,
}: AnnualReturnsBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="year" stroke="var(--muted-foreground)" fontSize={12} />
        <YAxis stroke="var(--muted-foreground)" fontSize={12} unit="%" />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
        />
        <Legend />
        <ReferenceLine y={0} stroke="var(--muted-foreground)" />
        <Bar dataKey="portfolio" fill="var(--primary)" name="Portfolio" radius={[4, 4, 0, 0]} />
        {showBenchmark && (
          <Bar dataKey="benchmark" fill="var(--muted)" name="Benchmark" radius={[4, 4, 0, 0]} />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
