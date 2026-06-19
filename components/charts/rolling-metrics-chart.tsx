"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface RollingMetricsChartProps {
  data: {
    dates: string[];
    values: number[];
    label: string;
  }[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(220, 70%, 50%)",
  "hsl(150, 60%, 40%)",
];

export function RollingMetricsChart({ data }: RollingMetricsChartProps) {
  if (data.length === 0 || data[0].dates.length === 0) return null;

  // Merge all series into chart data
  const chartData = data[0].dates.map((date, i) => {
    const point: Record<string, string | number> = { date };
    for (const series of data) {
      point[series.label] = series.values[i] ?? 0;
    }
    return point;
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => d.slice(0, 7)}
          className="text-xs"
        />
        <YAxis className="text-xs" />
        <Tooltip labelFormatter={(d) => String(d)} />
        <Legend />
        <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
        {data.map((series, i) => (
          <Line
            key={series.label}
            type="monotone"
            dataKey={series.label}
            stroke={COLORS[i % COLORS.length]}
            dot={false}
            strokeWidth={1.5}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
