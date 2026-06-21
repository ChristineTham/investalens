"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";
import { BENCHMARKS } from "@/lib/constants/benchmarks";

const RANGE_OPTIONS = [
  { value: "1Y", label: "1Y" },
  { value: "3Y", label: "3Y" },
  { value: "5Y", label: "5Y" },
  { value: "10Y", label: "10Y" },
  { value: "MAX", label: "All" },
] as const;

const PORTFOLIO_COLORS = [
  "var(--rosely14)",
  "var(--rosely7)",
  "var(--rosely8)",
  "var(--rosely2)",
  "var(--rosely12)",
  "var(--rosely3)",
  "var(--rosely15)",
  "var(--rosely5)",
];

interface ChartDataPoint {
  date: string;
  Total: number;
  Benchmark?: number;
  [key: string]: string | number | undefined;
}

export function PortfolioPerformanceChart() {
  const [range, setRange] = useState<string>("1Y");
  const [benchmark, setBenchmark] = useState<string>("");
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [portfolioNames, setPortfolioNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ range });
      if (benchmark) params.set("benchmark", benchmark);

      const res = await fetch(`/api/v1/portfolios/performance?${params}`);
      if (res.ok) {
        const data = await res.json();
        setChartData(data.chartData);
        setPortfolioNames(data.portfolioNames);
      }
    } finally {
      setLoading(false);
    }
  }, [range, benchmark]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (value: number) =>
    `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const formatDate = (date: string) => {
    if (range === "1Y") return date.slice(5); // MM-DD
    return date.slice(0, 7); // YYYY-MM
  };

  return (
    <div className="rounded-lg border border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <h2 className="font-medium">Portfolio Performance</h2>
        <div className="flex flex-wrap items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex rounded-md border border-border">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  range === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                } ${opt.value === "1Y" ? "rounded-l-md" : ""} ${opt.value === "MAX" ? "rounded-r-md" : ""}`}
                onClick={() => setRange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Benchmark Selector */}
          <select
            value={benchmark}
            onChange={(e) => setBenchmark(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs"
            aria-label="Select benchmark"
          >
            <option value="">No Benchmark</option>
            {Object.entries(BENCHMARKS).map(([code, info]) => (
              <option key={code} value={code}>
                {info.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
            Loading chart data...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
            No price data available for this time range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                className="text-xs"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                tickFormatter={formatCurrency}
                className="text-xs"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelFormatter={(label) => String(label)}
                formatter={(value: number) => [formatCurrency(value)]}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
              />

              {/* Individual portfolio areas (stacked) */}
              {portfolioNames.map((name, i) => (
                <Area
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stackId="portfolios"
                  stroke={PORTFOLIO_COLORS[i % PORTFOLIO_COLORS.length]}
                  fill={PORTFOLIO_COLORS[i % PORTFOLIO_COLORS.length]}
                  fillOpacity={0.3}
                  strokeWidth={1.5}
                />
              ))}

              {/* Total consolidated line on top */}
              <Line
                type="monotone"
                dataKey="Total"
                stroke="var(--primary)"
                strokeWidth={2.5}
                dot={false}
                strokeDasharray=""
              />

              {/* Benchmark reference line */}
              {benchmark && (
                <Line
                  type="monotone"
                  dataKey="Benchmark"
                  stroke="var(--muted-foreground)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  connectNulls
                />
              )}

              <ReferenceLine y={0} stroke="var(--border)" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
