"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { compactCurrency } from "@/components/charts/portfolio-chart-utils";

interface HoldingMovementPoint {
  period: string;
  Amount: number;
}

interface HoldingMovementChartProps {
  data: HoldingMovementPoint[];
  currency: string;
  height: number;
}

export function HoldingMovementChart({
  data,
  currency,
  height,
}: HoldingMovementChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No transactions in this range.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="period"
          stroke="var(--muted-foreground)"
          fontSize={11}
          minTickGap={20}
        />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickFormatter={(v) => compactCurrency(Number(v))}
          width={56}
        />
        <Tooltip
          cursor={{ fill: "var(--accent)", opacity: 0.3 }}
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontSize: "12px",
          }}
          formatter={(value) => [
            formatCurrency(Number(value), currency),
            "Net flow",
          ]}
        />
        <ReferenceLine y={0} stroke="var(--muted-foreground)" />
        <Bar
          dataKey="Amount"
          fill="var(--rosely14)"
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
