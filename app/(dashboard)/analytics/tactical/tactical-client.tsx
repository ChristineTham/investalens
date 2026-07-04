"use client";

import { useState } from "react";
import { DateRangeSelector, type DateRange } from "@/components/analytics/date-range-selector";
import { WeightComparison } from "@/components/charts/weight-comparison";
import { ChartCard } from "@/components/charts/chart-card";

const STRATEGIES = [
  { value: "momentum", label: "Momentum", description: "Overweight recent winners" },
  { value: "mean_reversion", label: "Mean Reversion", description: "Overweight recent losers" },
  { value: "risk_adjusted_momentum", label: "Risk-Adj. Momentum", description: "Return / volatility ranking" },
  { value: "volatility_target", label: "Volatility Target", description: "Inverse volatility weighting" },
  { value: "ma_crossover", label: "MA Crossover", description: "50d vs 200d moving average" },
  { value: "dual_momentum", label: "Dual Momentum", description: "Absolute + relative momentum" },
];

interface TacticalResult {
  strategy: string;
  description: string;
  signals: Record<string, number>;
  weights: Record<string, number>;
}

export function TacticalClient({
  portfolios,
}: {
  portfolios: { id: string; name: string }[];
}) {
  const [portfolioId, setPortfolioId] = useState(portfolios[0].id);
  const [strategy, setStrategy] = useState("momentum");
  const [dateRange, setDateRange] = useState<DateRange>("3Y");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TacticalResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      const matrixRes = await fetch(`/api/v1/analytics/matrix?portfolio=${portfolioId}&range=${dateRange}`);
      if (!matrixRes.ok) throw new Error("Failed to load portfolio data");
      const matrix = await matrixRes.json();

      const res = await fetch("/api/analytics/tactical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...matrix, config: { strategy } }),
      });
      if (!res.ok) throw new Error("Tactical analysis failed");
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setRunning(false);
    }
  }

  // Equal weights as baseline
  const currentWeights: Record<string, number> = {};
  if (result) {
    const n = Object.keys(result.weights).length;
    for (const key of Object.keys(result.weights)) currentWeights[key] = 1 / n;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Tactical Allocation</h1>
        <p className="text-sm text-muted-foreground">Signal-based dynamic weighting strategies</p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="text-sm font-medium">Portfolio</label>
          <select aria-label="Portfolio" className="mt-1 block rounded-md border border-input bg-background px-3 py-2 text-sm" value={portfolioId} onChange={(e) => setPortfolioId(e.target.value)}>
            {portfolios.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Strategy</label>
          <select aria-label="Strategy" className="mt-1 block rounded-md border border-input bg-background px-3 py-2 text-sm" value={strategy} onChange={(e) => setStrategy(e.target.value)}>
            {STRATEGIES.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
          </select>
        </div>
        <DateRangeSelector selected={dateRange} onChange={setDateRange} />
        <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50" onClick={handleRun} disabled={running}>
          {running ? "Computing..." : "Generate Signals"}
        </button>
      </div>

      {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

      {result && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">{result.description}</p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2">Asset</th>
                  <th className="p-2 text-right">Signal</th>
                  <th className="p-2 text-right">Weight</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(result.weights)
                  .sort(([, a], [, b]) => b - a)
                  .map(([asset, weight]) => (
                    <tr key={asset} className="border-b">
                      <td className="p-2 font-medium">{asset}</td>
                      <td className="p-2 text-right">{result.signals[asset]?.toFixed(4)}</td>
                      <td className="p-2 text-right font-medium">{(weight * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">Current vs Tactical Weights</h3>
            <ChartCard title="Current vs tactical weights" height={Math.max(220, Object.keys(result.weights).length * 40)}>
              {(h) => (
                <WeightComparison current={currentWeights} recommended={result.weights} height={h} />
              )}
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}
