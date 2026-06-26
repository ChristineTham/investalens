"use client";

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface Bucket {
  name: string;
  value: number;
  fill: string;
}

function CgtTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: Bucket }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const b = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium">{b.name}</div>
      <div className="tabular-nums text-muted-foreground">
        {formatCurrency(b.value)}
      </div>
    </div>
  );
}

/**
 * CGT composition — how gross gains net down to the assessable amount: gains
 * (positive), discount + losses (reductions), and the resulting net gain.
 */
export function CgtCompositionChart({
  shortTerm,
  longTerm,
  discount,
  losses,
  indexation,
  net,
  height,
}: {
  shortTerm: number;
  longTerm: number;
  discount: number;
  losses: number;
  indexation: number;
  net: number;
  height: number;
}) {
  const data: Bucket[] = [
    { name: "Short-term gains", value: shortTerm, fill: "var(--gain)" },
    { name: "Long-term gains", value: longTerm, fill: "var(--gain)" },
    { name: "50% discount", value: -discount, fill: "var(--loss)" },
    ...(indexation > 0
      ? [{ name: "Indexation relief", value: -indexation, fill: "var(--loss)" }]
      : []),
    { name: "Capital losses", value: -losses, fill: "var(--loss)" },
    { name: "Net capital gain", value: net, fill: "var(--primary)" },
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
        accessibilityLayer
      >
        <XAxis
          type="number"
          tickFormatter={(v) => formatCurrency(v)}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <Tooltip content={<CgtTooltip />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="value" radius={3}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
