"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MetricCard } from "@/components/analytics/metric-card";
import {
  DateRangeSelector,
  type DateRange,
} from "@/components/analytics/date-range-selector";
import { WeightComparison } from "@/components/charts/weight-comparison";
import { ChartCard } from "@/components/charts/chart-card";
import { createModelFromWeights } from "@/lib/actions/model";

interface OptimizeResult {
  weights: Record<string, number>;
  // Present for mean-variance (/optimize); HRP and risk-parity return weights only.
  expectedReturn?: number;
  expectedRisk?: number;
  sharpeRatio?: number;
  metrics?: { cvar95: number; maxDrawdown: number };
}

interface StrategySpec {
  id: string;
  label: string;
  endpoint: string;
  config: Record<string, unknown>;
}

const STRATEGY_SPECS: StrategySpec[] = [
  {
    id: "max_sharpe",
    label: "Max Sharpe",
    endpoint: "/api/analytics/optimize",
    config: { objective: "max_sharpe", riskMeasure: "variance" },
  },
  {
    id: "min_risk",
    label: "Min Risk",
    endpoint: "/api/analytics/optimize",
    config: { objective: "min_risk", riskMeasure: "variance" },
  },
  {
    id: "hrp",
    label: "Hierarchical Risk Parity",
    endpoint: "/api/analytics/optimize/hrp",
    config: {},
  },
  {
    id: "risk_parity",
    label: "Risk Parity",
    endpoint: "/api/analytics/optimize/risk-parity",
    config: {},
  },
];

type Source = "portfolio" | "model";

export function OptimizeClient({
  portfolios,
  models,
}: {
  portfolios: { id: string; name: string }[];
  models: { id: string; name: string; category: string }[];
}) {
  const searchParams = useSearchParams();
  const deepModel = searchParams.get("model");
  const deepPortfolio = searchParams.get("portfolio");

  const initialSource: Source =
    deepModel && models.some((m) => m.id === deepModel) ? "model" : "portfolio";
  const [source, setSource] = useState<Source>(initialSource);
  const [portfolioId, setPortfolioId] = useState(
    deepPortfolio && portfolios.some((p) => p.id === deepPortfolio)
      ? deepPortfolio
      : (portfolios[0]?.id ?? "")
  );
  const [modelId, setModelId] = useState(
    deepModel && models.some((m) => m.id === deepModel)
      ? deepModel
      : (models[0]?.id ?? "")
  );

  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([
    "max_sharpe",
  ]);
  const [dateRange, setDateRange] = useState<DateRange>("3Y");
  const [minWeight] = useState(0);
  const [maxWeight] = useState(100);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<string, OptimizeResult>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedLinks, setSavedLinks] = useState<
    { strategyId: string; modelId: string; name: string }[]
  >([]);

  const selectedId = source === "model" ? modelId : portfolioId;
  const sourceLabel =
    source === "model"
      ? (models.find((m) => m.id === modelId)?.name ?? "Model")
      : (portfolios.find((p) => p.id === portfolioId)?.name ?? "Portfolio");

  function toggleStrategy(id: string) {
    setSelectedStrategies((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleRun() {
    if (!selectedId || selectedStrategies.length === 0) return;
    setRunning(true);
    setError(null);
    setSavedLinks([]);
    try {
      const qs =
        source === "model"
          ? `?source=model&model=${selectedId}&range=${dateRange}`
          : `?portfolio=${selectedId}&range=${dateRange}`;
      const matrixRes = await fetch(`/api/v1/analytics/matrix${qs}`);
      if (!matrixRes.ok) throw new Error("Failed to load source data");
      const matrix = await matrixRes.json();

      const specs = STRATEGY_SPECS.filter((s) =>
        selectedStrategies.includes(s.id)
      );
      const settled = await Promise.all(
        specs.map(async (spec) => {
          const res = await fetch(spec.endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...matrix,
              config: {
                ...spec.config,
                minWeight: minWeight / 100,
                maxWeight: maxWeight / 100,
              },
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `${spec.label} failed: ${res.status}`);
          }
          return [spec.id, (await res.json()) as OptimizeResult] as const;
        })
      );
      setResults(Object.fromEntries(settled));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setResults({});
    } finally {
      setRunning(false);
    }
  }

  async function saveAsModel(strategyId: string) {
    const result = results[strategyId];
    if (!result) return;
    const spec = STRATEGY_SPECS.find((s) => s.id === strategyId)!;
    setSaving(strategyId);
    try {
      const model = await createModelFromWeights({
        name: `${sourceLabel} — ${spec.label}`,
        weights: result.weights,
        sourceLabel: `Optimised: ${spec.label} from ${sourceLabel}`,
        category: "growth",
      });
      setSavedLinks((prev) => [
        ...prev.filter((s) => s.strategyId !== strategyId),
        { strategyId, modelId: model.id, name: model.name },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save model");
    } finally {
      setSaving(null);
    }
  }

  async function saveAll() {
    for (const id of Object.keys(results)) {
      // Sequential to keep instrument upserts from racing on the same code.
      await saveAsModel(id);
    }
  }

  const resultEntries = Object.entries(results);
  const firstTwo = resultEntries.slice(0, 2);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Portfolio Optimisation</h1>
        <p className="text-sm text-muted-foreground">
          Optimise a real or model portfolio, then save the result as a new
          model
        </p>
      </div>

      {/* Config */}
      <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <span className="text-sm font-medium">Source</span>
          <div className="mt-1 flex rounded-md border border-input">
            <button
              type="button"
              onClick={() => setSource("portfolio")}
              className={`flex-1 rounded-l-md px-3 py-2 text-sm font-medium ${
                source === "portfolio"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              Portfolio
            </button>
            <button
              type="button"
              onClick={() => setSource("model")}
              className={`flex-1 rounded-r-md px-3 py-2 text-sm font-medium ${
                source === "model"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              Model
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">
            {source === "model" ? "Model" : "Portfolio"}
          </label>
          {source === "model" ? (
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              aria-label="Model"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          ) : (
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={portfolioId}
              onChange={(e) => setPortfolioId(e.target.value)}
              aria-label="Portfolio"
            >
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <span className="text-sm font-medium">Date Range</span>
          <div className="mt-1">
            <DateRangeSelector selected={dateRange} onChange={setDateRange} />
          </div>
        </div>

        <div className="lg:col-span-3">
          <span className="text-sm font-medium">Strategies</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {STRATEGY_SPECS.map((s) => {
              const active = selectedStrategies.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleStrategy(s.id)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-end lg:col-span-3">
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            onClick={handleRun}
            disabled={running || !selectedId || selectedStrategies.length === 0}
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

      {/* Results */}
      {resultEntries.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Results</h2>
            {resultEntries.length > 1 && (
              <button
                type="button"
                onClick={saveAll}
                disabled={saving != null}
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
              >
                Save all as models
              </button>
            )}
          </div>

          {/* Metrics table — one column per strategy */}
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Metric</th>
                  {resultEntries.map(([id]) => (
                    <th key={id} className="px-3 py-2 text-right font-medium">
                      {STRATEGY_SPECS.find((s) => s.id === id)?.label ?? id}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    [
                      "Expected return",
                      (r: OptimizeResult) => r.expectedReturn,
                    ],
                    ["Expected risk", (r: OptimizeResult) => r.expectedRisk],
                    ["Sharpe", (r: OptimizeResult) => r.sharpeRatio, true],
                    ["CVaR (95%)", (r: OptimizeResult) => r.metrics?.cvar95],
                    [
                      "Max drawdown",
                      (r: OptimizeResult) => r.metrics?.maxDrawdown,
                    ],
                  ] as [
                    string,
                    (r: OptimizeResult) => number | undefined,
                    boolean?,
                  ][]
                ).map(([label, accessor, raw]) => (
                  <tr key={label} className="border-t border-border">
                    <td className="px-3 py-2 text-muted-foreground">{label}</td>
                    {resultEntries.map(([id, r]) => {
                      const value = accessor(r);
                      return (
                        <td
                          key={id}
                          className="px-3 py-2 text-right tabular-nums"
                        >
                          {value == null
                            ? "—"
                            : raw
                              ? value.toFixed(2)
                              : `${(value * 100).toFixed(2)}%`}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-t border-border">
                  <td className="px-3 py-2 text-muted-foreground">
                    Save as model
                  </td>
                  {resultEntries.map(([id]) => {
                    const saved = savedLinks.find((s) => s.strategyId === id);
                    return (
                      <td key={id} className="px-3 py-2 text-right">
                        {saved ? (
                          <Link
                            href={`/models/${saved.modelId}`}
                            className="text-primary underline"
                          >
                            View model
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => saveAsModel(id)}
                            disabled={saving === id}
                            className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-accent disabled:opacity-50"
                          >
                            {saving === id ? "Saving..." : "Save"}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Headline metric cards for the first result */}
          {resultEntries[0] && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricCard
                label="Expected Return"
                value={(resultEntries[0][1].expectedReturn ?? 0) * 100}
                suffix="%"
                trend={
                  (resultEntries[0][1].expectedReturn ?? 0) > 0 ? "up" : "down"
                }
              />
              <MetricCard
                label="Expected Risk"
                value={(resultEntries[0][1].expectedRisk ?? 0) * 100}
                suffix="%"
              />
              <MetricCard
                label="Sharpe"
                value={resultEntries[0][1].sharpeRatio ?? 0}
              />
              <MetricCard
                label="Max DD"
                value={(resultEntries[0][1].metrics?.maxDrawdown ?? 0) * 100}
                suffix="%"
                trend="down"
              />
            </div>
          )}

          {/* Weight comparison between the first two selected strategies */}
          {firstTwo.length === 2 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">
                Weights:{" "}
                {STRATEGY_SPECS.find((s) => s.id === firstTwo[0][0])?.label} vs{" "}
                {STRATEGY_SPECS.find((s) => s.id === firstTwo[1][0])?.label}
              </h3>
              <ChartCard title="Strategy weights" height={Math.max(220, Object.keys(firstTwo[0][1].weights).length * 40)}>
                {(h) => (
                  <WeightComparison
                    current={firstTwo[0][1].weights}
                    recommended={firstTwo[1][1].weights}
                    height={h}
                  />
                )}
              </ChartCard>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
