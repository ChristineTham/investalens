"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface RadarSeries {
  /** Key into each datum's values. */
  key: string;
  label: string;
  /** CSS var, e.g. "var(--rosely8)". */
  colorVar: string;
}

export interface RadarDatum {
  axis: string;
  [seriesKey: string]: string | number;
}

/**
 * Generic radar/spider chart for multi-metric profiles and comparisons — risk
 * profile (volatility, Sharpe, Sortino, beta, drawdown), factor exposure, or
 * diversification scores. Values should be pre-normalised to a comparable scale
 * (e.g. 0–100) so the axes are visually meaningful.
 */
export function MetricRadarChart({
  data,
  series,
  height,
  domain = [0, 100],
  showLegend = true,
}: {
  data: RadarDatum[];
  series: RadarSeries[];
  height: number;
  domain?: [number, number];
  showLegend?: boolean;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Not enough data for a profile.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <PolarRadiusAxis
          domain={domain}
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          axisLine={false}
        />
        {series.map((s) => (
          <Radar
            key={s.key}
            name={s.label}
            dataKey={s.key}
            stroke={s.colorVar}
            fill={s.colorVar}
            fillOpacity={0.25}
          />
        ))}
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--popover)",
          }}
        />
        {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
      </RadarChart>
    </ResponsiveContainer>
  );
}
