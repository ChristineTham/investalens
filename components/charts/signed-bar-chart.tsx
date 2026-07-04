"use client";

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface SignedDatum {
  name: string;
  value: number;
}

/**
 * Reusable horizontal bar for signed magnitudes — gains green, losses red.
 * Used for unrealised/realised gain-by-holding and sector performance.
 */
export function SignedBarChart({
  data,
  height,
  unit = "currency",
}: {
  data: SignedDatum[];
  height: number;
  unit?: "currency" | "percent";
}) {
  const sorted = [...data].filter((d) => d.value !== 0).sort((a, b) => b.value - a.value);
  const fmt = (v: number) =>
    unit === "percent"
      ? `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`
      : formatCurrency(v);

  if (sorted.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No data to display.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
        accessibilityLayer
      >
        <XAxis
          type="number"
          tickFormatter={fmt}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={72}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          formatter={(v) => [fmt(Number(v)), ""]}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--popover)",
          }}
        />
        <ReferenceLine x={0} stroke="var(--border)" />
        <Bar dataKey="value" radius={3}>
          {sorted.map((d, i) => (
            <Cell
              key={`cell-${i}`}
              fill={d.value >= 0 ? "var(--gain)" : "var(--loss)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
