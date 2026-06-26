"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { holdingColor } from "@/lib/constants/chart-colors";

interface RiskContributionPieProps {
  data: { name: string; value: number }[];
  height?: number;
}

export function RiskContributionPie({ data, height = 300 }: RiskContributionPieProps) {
  const total = data.reduce((s, d) => s + Math.abs(d.value), 0);
  const chartData = data.map((d) => ({
    name: d.name,
    value: total > 0 ? (Math.abs(d.value) / total) * 100 : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
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
            <Cell key={i} fill={holdingColor(i).var} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, "Risk Share"]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
