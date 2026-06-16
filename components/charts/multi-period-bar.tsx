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

interface MultiPeriodData {
  name: string;
  [period: string]: string | number;
}

interface MultiPeriodBarChartProps {
  data: MultiPeriodData[];
  periods: string[];
}

const PERIOD_COLORS = [
  "var(--rosely15)",
  "var(--rosely7)",
  "var(--rosely8)",
  "var(--rosely14)",
  "var(--rosely2)",
];

export function MultiPeriodBarChart({
  data,
  periods,
}: MultiPeriodBarChartProps) {
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
          unit="%"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
          formatter={(value, name) => [
            `${Number(value).toFixed(2)}%`,
            String(name),
          ]}
        />
        <Legend />
        {periods.map((period, i) => (
          <Bar
            key={period}
            dataKey={period}
            fill={PERIOD_COLORS[i % PERIOD_COLORS.length]}
            radius={[2, 2, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
