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

interface HistoricalCostData {
  name: string;
  opening: number;
  purchases: number;
  sales: number;
  closing: number;
}

interface HistoricalCostChartProps {
  data: HistoricalCostData[];
}

export function HistoricalCostChart({ data }: HistoricalCostChartProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="name"
          stroke="var(--muted-foreground)"
          fontSize={12}
        />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={12}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
          formatter={(value, name) => [
            `$${Number(value).toFixed(2)}`,
            String(name),
          ]}
        />
        <Legend />
        <Bar dataKey="opening" fill="var(--rosely7)" name="Opening" stackId="a" />
        <Bar dataKey="purchases" fill="var(--rosely14)" name="Purchases" stackId="a" />
        <Bar dataKey="sales" fill="var(--rosely11)" name="Sales" stackId="b" />
        <Bar dataKey="closing" fill="var(--rosely2)" name="Closing" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
