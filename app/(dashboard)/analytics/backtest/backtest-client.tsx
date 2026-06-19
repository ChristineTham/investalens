"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MetricCard } from "@/components/analytics/metric-card";
import { DateRangeSelector, type DateRange } from "@/components/analytics/date-range-selector";
import { BenchmarkSelector } from "@/components/analytics/benchmark-selector";

const GrowthChart = dynamic(
  () => import("@/components/charts/growth-chart").then((m) => m.GrowthChart),
  { ssr: false }
);

interface BacktestResult {
  annualizedReturn: number;
  annualizedVolatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  calmarRatio: number;
  sortinoRatio: number;
  equityCurve: number[];
  dates: string[];
  drawdownSeries: number[];
  weightsHistory: { date: string; weights: Record<string, number> }[];
  assets: string[];
}

const STRATEGIES = [
  { value: "equal_weighted", label: "Equal Weight" },
  { value: "min_variance", label: "Minimum Variance" },
  { value: "max_sharpe", label: "Maximum Sharpe" },
  { value: "risk_parity", label: "Risk Parity" },
  { value: "mean_variance", label: "Mean-Variance" },
];

const REBALANCE_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];

export function BacktestClient({
  portfolios,
}: {
  portfolios: { id: string; name: string }[];
}) {
  const [portfolioId, setPortfolioId] = useState(portfolios[0].id);
  const [strategy, setStrategy] = useState("equal_weighted");
  const [rebalanceFreq, setRebalanceFreq] = useState("quarterly");
  const [dateRange, setDateRange] = useState<DateRange>("5Y");
  const [benchmarkCode, setBenchmarkCode] = useState("^AXJO");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      // Fetch returns matrix from server
      const matrixRes = await fetch(
        `/api/v1/analytics/matrix?portfolio=${portfolioId}&range=${dateRange}`
      );
      if (!matrixRes.ok) throw new Error("Failed to load portfolio data");
      const matrix = await matrixRes.json();

      // Call Python backtest endpoint
      const res = await fetch("/api/analytics/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...matrix,
          config: { strategy, rebalanceFrequency: rebalanceFreq },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Backtest failed: ${res.status}`);
      }
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Backtesting</h1>
        <p className="text-sm text-muted-foreground">
          Walk-forward backtest with strategy comparison
        </p>
      </div>

      {/* Config Panel */}
      <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="text-sm font-medium">Portfolio</label>
          <select
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={portfolioId}
            onChange={(e) => setPortfolioId(e.target.value)}
          >
            {portfolios.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Strategy</label>
          <select
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
          >
            {STRATEGIES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Rebalancing</label>
          <select
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={rebalanceFreq}
            onChange={(e) => setRebalanceFreq(e.target.value)}
          >
            {REBALANCE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Date Range</label>
          <div className="mt-1">
            <DateRangeSelector selected={dateRange} onChange={setDateRange} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Benchmark</label>
          <div className="mt-1">
            <BenchmarkSelector selectedCode={benchmarkCode} onChange={setBenchmarkCode} />
          </div>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            onClick={handleRun}
            disabled={running}
          >
            {running ? "Running..." : "Run Backtest"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <MetricCard label="CAGR" value={result.annualizedReturn * 100} suffix="%" trend={result.annualizedReturn > 0 ? "up" : "down"} />
            <MetricCard label="Volatility" value={result.annualizedVolatility * 100} suffix="%" />
            <MetricCard label="Sharpe" value={result.sharpeRatio} />
            <MetricCard label="Max DD" value={result.maxDrawdown * 100} suffix="%" trend="down" />
            <MetricCard label="Calmar" value={result.calmarRatio} />
            <MetricCard label="Sortino" value={result.sortinoRatio} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">Equity Curve (rebased to 100)</h3>
            <GrowthChart
              dates={result.dates}
              portfolioValues={result.equityCurve.map((v) => v * 100)}
              portfolioLabel={STRATEGIES.find((s) => s.value === strategy)?.label || strategy}
            />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">Drawdown</h3>
            <GrowthChart
              dates={result.dates}
              portfolioValues={result.drawdownSeries.map((v) => v * 100)}
              portfolioLabel="Drawdown %"
            />
          </div>
        </div>
      )}
    </div>
  );
}
