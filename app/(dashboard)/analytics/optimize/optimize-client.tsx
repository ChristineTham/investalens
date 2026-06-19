"use client";

import { useState } from "react";
import { MetricCard } from "@/components/analytics/metric-card";
import { DateRangeSelector, type DateRange } from "@/components/analytics/date-range-selector";
import { WeightComparison } from "@/components/charts/weight-comparison";

interface OptimizeResult {
  weights: Record<string, number>;
  expectedReturn: number;
  expectedRisk: number;
  sharpeRatio: number;
  metrics: { cvar95: number; maxDrawdown: number };
}

const STRATEGIES = [
  { value: "mean_variance", label: "Mean-Variance", endpoint: "/api/analytics/optimize" },
  { value: "hrp", label: "Hierarchical Risk Parity", endpoint: "/api/analytics/optimize/hrp" },
  { value: "risk_parity", label: "Risk Parity", endpoint: "/api/analytics/optimize/risk-parity" },
];

const OBJECTIVES = [
  { value: "max_sharpe", label: "Max Sharpe Ratio" },
  { value: "min_risk", label: "Min Risk" },
  { value: "max_return", label: "Max Return" },
];

const RISK_MEASURES = [
  { value: "variance", label: "Variance" },
  { value: "cvar", label: "CVaR (5%)" },
  { value: "semi_variance", label: "Semi-Variance" },
];

export function OptimizeClient({
  portfolios,
}: {
  portfolios: { id: string; name: string }[];
}) {
  const [portfolioId, setPortfolioId] = useState(portfolios[0].id);
  const [strategy, setStrategy] = useState("mean_variance");
  const [objective, setObjective] = useState("max_sharpe");
  const [riskMeasure, setRiskMeasure] = useState("variance");
  const [dateRange, setDateRange] = useState<DateRange>("3Y");
  const [minWeight] = useState(0);
  const [maxWeight] = useState(100);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedStrategy = STRATEGIES.find((s) => s.value === strategy)!;

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      const matrixRes = await fetch(
        `/api/v1/analytics/matrix?portfolio=${portfolioId}&range=${dateRange}`
      );
      if (!matrixRes.ok) throw new Error("Failed to load portfolio data");
      const matrix = await matrixRes.json();

      const res = await fetch(selectedStrategy.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...matrix,
          config: {
            objective,
            riskMeasure,
            minWeight: minWeight / 100,
            maxWeight: maxWeight / 100,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Optimization failed: ${res.status}`);
      }
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setRunning(false);
    }
  }

  // Current equal weights as baseline
  const currentWeights: Record<string, number> = {};
  if (result) {
    const n = Object.keys(result.weights).length;
    for (const key of Object.keys(result.weights)) {
      currentWeights[key] = 1 / n;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Portfolio Optimisation</h1>
        <p className="text-sm text-muted-foreground">
          Find optimal portfolio weights using quantitative methods
        </p>
      </div>

      {/* Config */}
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
        {strategy === "mean_variance" && (
          <>
            <div>
              <label className="text-sm font-medium">Objective</label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
              >
                {OBJECTIVES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Risk Measure</label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={riskMeasure}
                onChange={(e) => setRiskMeasure(e.target.value)}
              >
                {RISK_MEASURES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </>
        )}
        <div>
          <label className="text-sm font-medium">Date Range</label>
          <div className="mt-1">
            <DateRangeSelector selected={dateRange} onChange={setDateRange} />
          </div>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            onClick={handleRun}
            disabled={running}
          >
            {running ? "Optimising..." : "Run Optimisation"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard label="Expected Return" value={result.expectedReturn * 100} suffix="%" trend={result.expectedReturn > 0 ? "up" : "down"} />
            <MetricCard label="Expected Risk" value={result.expectedRisk * 100} suffix="%" />
            <MetricCard label="Sharpe Ratio" value={result.sharpeRatio} />
            <MetricCard label="Max Drawdown" value={result.metrics.maxDrawdown * 100} suffix="%" trend="down" />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">Current vs Recommended Weights</h3>
            <WeightComparison current={currentWeights} recommended={result.weights} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">Recommended Allocation</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-2">Asset</th>
                    <th className="p-2 text-right">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.weights)
                    .sort(([, a], [, b]) => b - a)
                    .map(([asset, weight]) => (
                      <tr key={asset} className="border-b">
                        <td className="p-2 font-medium">{asset}</td>
                        <td className="p-2 text-right">{(weight * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
