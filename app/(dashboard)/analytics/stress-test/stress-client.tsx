"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MetricCard } from "@/components/analytics/metric-card";
import { ChartCard } from "@/components/charts/chart-card";
import { DateRangeSelector, type DateRange } from "@/components/analytics/date-range-selector";
import { SourcePicker, type SourceValue } from "@/components/analytics/source-picker";
import { fetchAnalyticsMatrix } from "@/lib/hooks/use-analytics-matrix";

const ScenarioWaterfall = dynamic(
  () => import("@/components/charts/scenario-waterfall").then((m) => m.ScenarioWaterfall),
  { ssr: false }
);

interface HistoricalScenario {
  name: string;
  description: string;
  durationDays: number;
  marketReturn: number;
  portfolioImpact: number;
  assetContributions: Record<string, number>;
}

const TABS = ["Historical", "Custom", "Factor"] as const;

export function StressTestClient({
  portfolios,
  models,
}: {
  portfolios: { id: string; name: string }[];
  models: { id: string; name: string }[];
}) {
  const [src, setSrc] = useState<SourceValue>(
    portfolios.length > 0
      ? { source: "portfolio", id: portfolios[0].id }
      : { source: "model", id: models[0]?.id ?? "" }
  );
  const [dateRange, setDateRange] = useState<DateRange>("3Y");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Historical");
  const [running, setRunning] = useState(false);
  const [historicalResults, setHistoricalResults] = useState<HistoricalScenario[] | null>(null);
  const [factorResult, setFactorResult] = useState<{ factorShock: number; portfolioImpact: number; assetImpacts: Record<string, { beta: number; conditionalReturn: number; contribution: number }> } | null>(null);
  const [factorShock, setFactorShock] = useState(-10);
  const [error, setError] = useState<string | null>(null);

  async function fetchMatrix() {
    return fetchAnalyticsMatrix(src, dateRange);
  }

  async function runHistorical() {
    setRunning(true);
    setError(null);
    try {
      const matrix = await fetchMatrix();
      const res = await fetch("/api/analytics/stress-test/historical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(matrix),
      });
      if (!res.ok) throw new Error("Stress test failed");
      const data = await res.json();
      setHistoricalResults(data.scenarios);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setRunning(false);
    }
  }

  async function runFactor() {
    setRunning(true);
    setError(null);
    try {
      const matrix = await fetchMatrix();
      const res = await fetch("/api/analytics/stress-test/factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...matrix, config: { factorShock: factorShock / 100 } }),
      });
      if (!res.ok) throw new Error("Factor stress failed");
      setFactorResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">Stress Testing</h1>
          <p className="text-sm text-muted-foreground">Historical scenarios, custom shocks, and factor stress</p>
        </div>
        <div className="flex items-center gap-3">
          <SourcePicker
            portfolios={portfolios}
            models={models}
            value={src}
            onChange={setSrc}
          />
          <DateRangeSelector selected={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              className={`border-b-2 px-4 py-2 text-sm font-medium ${
                tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>
      )}

      {tab === "Historical" && (
        <div className="space-y-4">
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            onClick={runHistorical}
            disabled={running}
          >
            {running ? "Analyzing..." : "Run Historical Stress Test"}
          </button>
          {historicalResults && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-2">Scenario</th>
                    <th className="p-2">Duration</th>
                    <th className="p-2 text-right">Market</th>
                    <th className="p-2 text-right">Portfolio Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {historicalResults.map((s) => (
                    <tr key={s.name} className="border-b">
                      <td className="p-2">
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.description}</div>
                      </td>
                      <td className="p-2">{s.durationDays}d</td>
                      <td className="p-2 text-right text-loss">{(s.marketReturn * 100).toFixed(1)}%</td>
                      <td className="p-2 text-right font-medium text-loss">{(s.portfolioImpact * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {historicalResults && historicalResults[0] && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Worst Scenario Breakdown: {historicalResults[0].name}</h3>
              <ChartCard title="Worst scenario breakdown" height={Math.max(220, Object.keys(historicalResults[0].assetContributions).length * 35)}>
                {(h) => (
                  <ScenarioWaterfall
                    height={h}
                    data={Object.entries(historicalResults[0].assetContributions).map(([name, value]) => ({ name, value }))}
                  />
                )}
              </ChartCard>
            </div>
          )}
        </div>
      )}

      {tab === "Factor" && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium" htmlFor="factor-shock">If market drops:</label>
            <input
              id="factor-shock"
              type="range"
              min="-50"
              max="0"
              value={factorShock}
              onChange={(e) => setFactorShock(Number(e.target.value))}
              className="w-48"
              aria-label="Market shock percentage"
            />
            <span className="text-sm font-bold">{factorShock}%</span>
            <button
              type="button"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              onClick={runFactor}
              disabled={running}
            >
              {running ? "..." : "Analyze"}
            </button>
          </div>
          {factorResult && (
            <div className="space-y-4">
              <MetricCard
                label="Portfolio Impact"
                value={(factorResult.portfolioImpact * 100).toFixed(2)}
                suffix="%"
                trend="down"
              />
              <ChartCard title="Per-asset impact" height={Math.max(220, Object.keys(factorResult.assetImpacts).length * 35)}>
                {(h) => (
                  <ScenarioWaterfall
                    height={h}
                    data={Object.entries(factorResult.assetImpacts).map(([name, d]) => ({ name, value: d.contribution }))}
                  />
                )}
              </ChartCard>
            </div>
          )}
        </div>
      )}

      {tab === "Custom" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use the <a href="/analytics/what-if" className="underline">What-If Scenarios</a> page
            for custom per-asset shock analysis.
          </p>
        </div>
      )}
    </div>
  );
}
