"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DrawdownData {
  date: string;
  drawdown: number;
}

interface DrawdownChartProps {
  data: DrawdownData[];
}

export function DrawdownChart({ data }: DrawdownChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={12}
          unit="%"
          domain={["dataMin", 0]}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
        />
        <Area
          type="monotone"
          dataKey="drawdown"
          stroke="var(--destructive)"
          fill="var(--destructive)"
          fillOpacity={0.2}
          name="Drawdown"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
