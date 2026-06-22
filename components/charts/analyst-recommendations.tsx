"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { RecommendationRow } from "@/lib/services/stock-info";

interface AnalystRecommendationsChartProps {
  data: RecommendationRow[];
}

const CATEGORIES = [
  { key: "strongBuy", label: "Strong Buy", color: "var(--rosely8)" },
  { key: "buy", label: "Buy", color: "var(--rosely7)" },
  { key: "hold", label: "Hold", color: "var(--rosely14)" },
  { key: "sell", label: "Sell", color: "var(--rosely3)" },
  { key: "strongSell", label: "Strong Sell", color: "var(--rosely2)" },
] as const;

/** Map period codes (e.g. "0m", "-1m") to friendly labels. */
function periodLabel(period: string | null): string {
  if (!period) return "—";
  const map: Record<string, string> = {
    "0m": "Current",
    "-1m": "1 mo ago",
    "-2m": "2 mo ago",
    "-3m": "3 mo ago",
  };
  return map[period] ?? period;
}

export function AnalystRecommendationsChart({
  data,
}: AnalystRecommendationsChartProps) {
  const chartData = [...data]
    .reverse()
    .map((r) => ({ ...r, label: periodLabel(r.period) }));

  if (chartData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No analyst recommendation data available.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Legend wrapperStyle={{ fontSize: "11px" }} />
        {CATEGORIES.map((c) => (
          <Bar
            key={c.key}
            dataKey={c.key}
            name={c.label}
            stackId="rec"
            fill={c.color}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
