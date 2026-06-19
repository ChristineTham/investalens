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

interface FanChartProps {
  dates: number[] | string[];
  p5: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p95: number[];
  xLabel?: string;
  yLabel?: string;
}

export function FanChart({
  dates,
  p5,
  p25,
  p50,
  p75,
  p95,
  xLabel = "Day",
}: FanChartProps) {
  const data = dates.map((d, i) => ({
    date: typeof d === "string" ? d : d,
    p5: p5[i],
    p25_band: p25[i] - p5[i],
    p50_band: p50[i] - p25[i],
    p75_band: p75[i] - p50[i],
    p95_band: p95[i] - p75[i],
    p50: p50[i],
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" className="text-xs" label={{ value: xLabel, position: "bottom", offset: 0 }} />
        <YAxis className="text-xs" tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(v) => [`$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`]}
          labelFormatter={(l) => `${xLabel}: ${l}`}
        />
        {/* Stack bands from bottom: p5 base, then bands to p95 */}
        <Area type="monotone" dataKey="p5" stackId="1" fill="transparent" stroke="transparent" />
        <Area type="monotone" dataKey="p25_band" stackId="1" fill="hsl(var(--primary))" fillOpacity={0.1} stroke="transparent" name="5th-25th" />
        <Area type="monotone" dataKey="p50_band" stackId="1" fill="hsl(var(--primary))" fillOpacity={0.2} stroke="transparent" name="25th-50th" />
        <Area type="monotone" dataKey="p75_band" stackId="1" fill="hsl(var(--primary))" fillOpacity={0.2} stroke="transparent" name="50th-75th" />
        <Area type="monotone" dataKey="p95_band" stackId="1" fill="hsl(var(--primary))" fillOpacity={0.1} stroke="transparent" name="75th-95th" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
