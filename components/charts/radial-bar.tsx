"use client";

import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

/**
 * Single-value radial gauge (0–100 by default) — fear/greed index, FIRE or goal
 * progress, discount-eligible proportion, drift. The track is a muted ring; the
 * value arc uses `colorVar`. A centred label shows the value + caption.
 */
export function RadialGauge({
  value,
  height,
  max = 100,
  colorVar = "var(--rosely8)",
  label,
  caption,
}: {
  value: number;
  height: number;
  max?: number;
  colorVar?: string;
  /** Big centred text. Defaults to the rounded value. */
  label?: string;
  caption?: string;
}) {
  const clamped = Math.max(0, Math.min(max, value));
  const data = [{ name: "value", value: clamped, fill: colorVar }];

  return (
    <div className="relative h-full">
      <ResponsiveContainer width="100%" height={height}>
        <RadialBarChart
          data={data}
          innerRadius="68%"
          outerRadius="100%"
          startAngle={210}
          endAngle={-30}
        >
          <PolarAngleAxis type="number" domain={[0, max]} tick={false} />
          <RadialBar
            background={{ fill: "var(--muted)" }}
            dataKey="value"
            cornerRadius={8}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums">
          {label ?? Math.round(clamped)}
        </span>
        {caption && (
          <span className="text-xs text-muted-foreground">{caption}</span>
        )}
      </div>
    </div>
  );
}

export interface RadialDatum {
  name: string;
  value: number;
  /** CSS var fill. */
  fill: string;
}

/**
 * Multi-segment radial bar — compare a handful of category proportions (e.g.
 * current vs target weights, allocation by group) as concentric arcs.
 */
export function RadialBars({
  data,
  height,
  max = 100,
}: {
  data: RadialDatum[];
  height: number;
  max?: number;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No data to display.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadialBarChart
        data={data}
        innerRadius="30%"
        outerRadius="100%"
        startAngle={90}
        endAngle={-270}
      >
        <PolarAngleAxis type="number" domain={[0, max]} tick={false} />
        <RadialBar background={{ fill: "var(--muted)" }} dataKey="value" cornerRadius={6} />
      </RadialBarChart>
    </ResponsiveContainer>
  );
}
