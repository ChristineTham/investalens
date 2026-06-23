"use client";

import { PieChart, Pie, Cell } from "recharts";

/** Rosely palette for the donut cells (Recharts `fill` prop). */
export const ALLOCATION_COLORS = [
  "var(--rosely2)",
  "var(--rosely7)",
  "var(--rosely8)",
  "var(--rosely14)",
  "var(--rosely15)",
  "var(--rosely10)",
  "var(--rosely13)",
  "var(--rosely3)",
];

/** Matching Tailwind background classes for legend swatches. */
export const ALLOCATION_SWATCH = [
  "bg-[var(--rosely2)]",
  "bg-[var(--rosely7)]",
  "bg-[var(--rosely8)]",
  "bg-[var(--rosely14)]",
  "bg-[var(--rosely15)]",
  "bg-[var(--rosely10)]",
  "bg-[var(--rosely13)]",
  "bg-[var(--rosely3)]",
];

const SIZE = 104;

interface AllocationDonutProps {
  data: { name: string; value: number }[];
}

export function AllocationDonut({ data }: AllocationDonutProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[104px] w-[104px] items-center justify-center text-xs text-muted-foreground">
        —
      </div>
    );
  }

  return (
    <PieChart width={SIZE} height={SIZE}>
      <Pie
        data={data}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        innerRadius={SIZE * 0.3}
        outerRadius={SIZE * 0.48}
        paddingAngle={1}
        stroke="var(--background)"
        strokeWidth={1}
        isAnimationActive={false}
      >
        {data.map((_, i) => (
          <Cell key={i} fill={ALLOCATION_COLORS[i % ALLOCATION_COLORS.length]} />
        ))}
      </Pie>
    </PieChart>
  );
}
