"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

export interface MultiLineSeries {
  key: string;
  colorVar: string;
  colorSwatch: string;
  values: number[];
}

interface MultiLineChartProps {
  dates: string[];
  series: MultiLineSeries[];
  height?: number;
}

function MultiTooltip({
  active,
  payload,
  label,
  swatchByKey,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number }[];
  label?: string;
  swatchByKey: Record<string, string>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-border bg-card p-2.5 text-xs shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      <ul className="space-y-0.5">
        {payload
          .filter((p) => p.value != null)
          .map((p) => (
            <li key={String(p.dataKey)} className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-sm",
                  swatchByKey[String(p.dataKey)]
                )}
                aria-hidden
              />
              <span className="truncate">{String(p.dataKey)}</span>
              <span className="ml-auto tabular-nums">
                {Number(p.value).toFixed(2)}
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}

/** Generic multi-line chart keyed by a shared date axis. */
export function MultiLineChart({
  dates,
  series,
  height = 340,
}: MultiLineChartProps) {
  if (dates.length === 0 || series.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        No data to display.
      </div>
    );
  }

  const data = dates.map((date, i) => {
    const row: Record<string, string | number> = { date };
    for (const s of series) {
      const v = s.values[i];
      if (v != null) row[s.key] = v;
    }
    return row;
  });

  const swatchByKey = Object.fromEntries(
    series.map((s) => [s.key, s.colorSwatch])
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="date"
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickFormatter={(d: string) => String(d).slice(0, 7)}
          minTickGap={28}
        />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={11}
          width={48}
          tickFormatter={(v) => Number(v).toFixed(0)}
        />
        <Tooltip content={<MultiTooltip swatchByKey={swatchByKey} />} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.key}
            stroke={s.colorVar}
            dot={false}
            strokeWidth={1.75}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
