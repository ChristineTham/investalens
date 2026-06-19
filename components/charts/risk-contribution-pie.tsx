"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface RiskContributionPieProps {
  data: { name: string; value: number }[];
}

const COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

export function RiskContributionPie({ data }: RiskContributionPieProps) {
  const total = data.reduce((s, d) => s + Math.abs(d.value), 0);
  const chartData = data.map((d) => ({
    name: d.name,
    value: total > 0 ? (Math.abs(d.value) / total) * 100 : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          dataKey="value"
          label={({ name, value }) => `${name} ${value.toFixed(1)}%`}
          labelLine={false}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, "Risk Share"]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
