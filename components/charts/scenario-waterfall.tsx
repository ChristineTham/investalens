"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

interface WaterfallItem {
  name: string;
  value: number;
}

interface ScenarioWaterfallProps {
  data: WaterfallItem[];
  totalLabel?: string;
  height?: number;
}

export function ScenarioWaterfall({ data, totalLabel = "Total", height }: ScenarioWaterfallProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  const chartData = [
    ...data.map((d) => ({
      name: d.name,
      value: d.value * 100,
      fill: d.value < 0 ? "hsl(var(--destructive))" : "hsl(var(--primary))",
    })),
    {
      name: totalLabel,
      value: total * 100,
      fill: total < 0 ? "hsl(var(--destructive))" : "hsl(var(--primary))",
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={height ?? Math.max(200, chartData.length * 35)}>
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis type="number" tickFormatter={(v) => `${Number(v).toFixed(1)}%`} className="text-xs" />
        <YAxis dataKey="name" type="category" width={80} className="text-xs" />
        <Tooltip formatter={(v) => [`${Number(v).toFixed(2)}%`, "Impact"]} />
        <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" />
        <Bar dataKey="value">
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
