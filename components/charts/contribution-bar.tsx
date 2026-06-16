"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

interface ContributionData {
  name: string;
  contribution: number;
}

interface ContributionBarChartProps {
  data: ContributionData[];
}

export function ContributionBarChart({ data }: ContributionBarChartProps) {
  const sorted = [...data].sort((a, b) => b.contribution - a.contribution);

  return (
    <ResponsiveContainer width="100%" height={Math.max(300, sorted.length * 36)}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis
          type="number"
          stroke="var(--muted-foreground)"
          fontSize={12}
          unit="%"
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke="var(--muted-foreground)"
          fontSize={12}
          width={50}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
          formatter={(value: number) => [`${value.toFixed(2)}%`, "Contribution"]}
        />
        <ReferenceLine x={0} stroke="var(--muted-foreground)" />
        <Bar dataKey="contribution" radius={[0, 4, 4, 0]}>
          {sorted.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.contribution >= 0 ? "var(--rosely14)" : "var(--rosely11)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
