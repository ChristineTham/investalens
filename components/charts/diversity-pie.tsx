"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DiversityData {
  label: string;
  value: number;
  percent: number;
}

interface DiversityPieChartProps {
  data: DiversityData[];
}

const COLORS = [
  "var(--rosely2)",
  "var(--rosely7)",
  "var(--rosely8)",
  "var(--rosely14)",
  "var(--rosely15)",
  "var(--rosely10)",
  "var(--rosely13)",
  "var(--rosely12)",
  "var(--rosely9)",
  "var(--rosely3)",
];

export function DiversityPieChart({ data }: DiversityPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius={120}
          innerRadius={60}
          paddingAngle={2}
          label={({ label, percent }) => `${label} (${percent.toFixed(1)}%)`}
          labelLine={false}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
