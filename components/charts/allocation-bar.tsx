"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ALLOCATION_COLORS } from "./allocation-donut";

interface AllocationBarProps {
  data: { name: string; value: number }[];
  height?: number;
}

/** A single stacked horizontal bar — one segment per item, width ∝ value. */
export function AllocationBar({ data, height = 26 }: AllocationBarProps) {
  if (data.length === 0) return null;

  // Single data row with one numeric key per segment (avoids name collisions).
  const row: Record<string, number | string> = { name: "allocation" };
  data.forEach((d, i) => {
    row[`s${i}`] = d.value;
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={[row]}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        barCategoryGap={0}
      >
        <XAxis type="number" hide domain={[0, "dataMax"]} />
        <YAxis type="category" dataKey="name" hide />
        {data.map((d, i) => {
          const first = i === 0;
          const last = i === data.length - 1;
          const radius: [number, number, number, number] =
            first && last
              ? [5, 5, 5, 5]
              : first
                ? [5, 0, 0, 5]
                : last
                  ? [0, 5, 5, 0]
                  : [0, 0, 0, 0];
          return (
            <Bar
              key={d.name}
              dataKey={`s${i}`}
              stackId="a"
              fill={ALLOCATION_COLORS[i % ALLOCATION_COLORS.length]}
              stroke="var(--background)"
              strokeWidth={1}
              radius={radius}
              isAnimationActive={false}
            />
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}
