"use client";

import { useState, useEffect } from "react";
import {
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

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const params = new URLSearchParams({ range });
      if (benchmark) params.set("benchmark", benchmark);

      try {
        const res = await fetch(`/api/v1/portfolios/performance?${params}`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          setChartData(data.chartData);
          setPortfolioNames(data.portfolioNames);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [range, benchmark]);

  const handleRangeChange = (value: string) => {
    setLoading(true);
    setRange(value);
  };

  const handleBenchmarkChange = (value: string) => {
    setLoading(true);
    setBenchmark(value);
  };

  const formatPercent = (value: number) =>
    `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

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
                onClick={() => handleRangeChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Benchmark Selector */}
          <select
            value={benchmark}
            onChange={(e) => handleBenchmarkChange(e.target.value)}
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
                tickFormatter={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`}
                className="text-xs"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelFormatter={(label) => String(label)}
                formatter={(value) => [formatPercent(Number(value))]}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
              />

              {/* Individual portfolio lines */}
              {portfolioNames.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={PORTFOLIO_COLORS[i % PORTFOLIO_COLORS.length]}
                  strokeWidth={1.5}
                  dot={false}
                />
              ))}

              {/* Total consolidated line */}
              <Line
                type="monotone"
                dataKey="Total"
                stroke="var(--primary)"
                strokeWidth={2.5}
                dot={false}
              />

              {/* Benchmark dotted line */}
              {benchmark && (
                <Line
                  type="monotone"
                  dataKey="Benchmark"
                  stroke="var(--muted-foreground)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  connectNulls
                />
              )}

              <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1.5} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
