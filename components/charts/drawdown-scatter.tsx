"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ZAxis,
} from "recharts";

interface ScatterData {
  name: string;
  maxDrawdown: number;
  totalReturn: number;
}

interface DrawdownScatterProps {
  data: ScatterData[];
}

export function DrawdownScatter({ data }: DrawdownScatterProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          type="number"
          dataKey="maxDrawdown"
          name="Max Drawdown"
          unit="%"
          stroke="var(--muted-foreground)"
          fontSize={12}
          label={{
            value: "Max Drawdown (%)",
            position: "bottom",
            fontSize: 12,
          }}
        />
        <YAxis
          type="number"
          dataKey="totalReturn"
          name="Return"
          unit="%"
          stroke="var(--muted-foreground)"
          fontSize={12}
          label={{
            value: "Return (%)",
            angle: -90,
            position: "left",
            fontSize: 12,
          }}
        />
        <ZAxis range={[50, 200]} />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
          formatter={(value, name) => [
            `${Number(value).toFixed(1)}%`,
            String(name),
          ]}
        />
        <ReferenceLine
          y={0}
          stroke="var(--muted-foreground)"
          strokeDasharray="3 3"
        />
        <ReferenceLine
          x={0}
          stroke="var(--muted-foreground)"
          strokeDasharray="3 3"
        />
        <Scatter name="Holdings" data={data} fill="var(--primary)" />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
