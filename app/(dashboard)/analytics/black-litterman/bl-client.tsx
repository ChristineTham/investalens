"use client";

import { useState } from "react";
import { MetricCard } from "@/components/analytics/metric-card";

interface View {
  type: "absolute" | "relative";
  asset?: string;
  longAsset?: string;
  shortAsset?: string;
  value: number;
  confidence: number;
}

interface BLResult {
  priorReturns: Record<string, number>;
  posteriorReturns: Record<string, number>;
  weights: Record<string, number>;
}

export function BlackLittermanClient({
  portfolios,
  assets,
}: {
  portfolios: { id: string; name: string }[];
  assets: { code: string; name: string }[];
}) {
  const [portfolioId, setPortfolioId] = useState(portfolios[0].id);
  const [views, setViews] = useState<View[]>([]);
  const [tau, setTau] = useState(0.05);
  const [riskAversion, setRiskAversion] = useState(2.5);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BLResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function addAbsoluteView() {
    setViews([...views, { type: "absolute", asset: assets[0]?.code, value: 0.1, confidence: 0.5 }]);
  }

  function addRelativeView() {
    setViews([
      ...views,
      { type: "relative", longAsset: assets[0]?.code, shortAsset: assets[1]?.code || assets[0]?.code, value: 0.05, confidence: 0.5 },
    ]);
  }

  function updateView(idx: number, update: Partial<View>) {
    const next = [...views];
    next[idx] = { ...next[idx], ...update };
    setViews(next);
  }

  function removeView(idx: number) {
    setViews(views.filter((_, i) => i !== idx));
  }

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      const matrixRes = await fetch(
        `/api/v1/analytics/matrix?portfolio=${portfolioId}&range=3Y`
      );
      if (!matrixRes.ok) throw new Error("Failed to load portfolio data");
      const matrix = await matrixRes.json();

      const res = await fetch("/api/analytics/black-litterman", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...matrix,
          config: { views, tau, riskAversion },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `BL failed: ${res.status}`);
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
        <h1 className="font-serif text-2xl font-bold">Black-Litterman Model</h1>
        <p className="text-sm text-muted-foreground">
          Combine market equilibrium with your investment views
        </p>
      </div>

      {/* Parameters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="text-sm font-medium">Portfolio</label>
          <select
            className="mt-1 block rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={portfolioId}
            onChange={(e) => setPortfolioId(e.target.value)}
          >
            {portfolios.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Tau</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max="0.5"
            className="mt-1 block w-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={tau}
            onChange={(e) => setTau(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Risk Aversion</label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            max="10"
            className="mt-1 block w-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={riskAversion}
            onChange={(e) => setRiskAversion(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Views */}
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Investment Views</h3>
          <div className="flex gap-2">
            <button type="button" className="rounded bg-muted px-3 py-1 text-xs" onClick={addAbsoluteView}>
              + Absolute
            </button>
            <button type="button" className="rounded bg-muted px-3 py-1 text-xs" onClick={addRelativeView}>
              + Relative
            </button>
          </div>
        </div>

        {views.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            No views added. Results will show equilibrium (CAPM) weights.
          </p>
        )}

        <div className="mt-3 space-y-3">
          {views.map((view, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded border p-2">
              {view.type === "absolute" ? (
                <>
                  <select
                    className="rounded border px-2 py-1 text-xs"
                    value={view.asset}
                    onChange={(e) => updateView(i, { asset: e.target.value })}
                  >
                    {assets.map((a) => (
                      <option key={a.code} value={a.code}>{a.code}</option>
                    ))}
                  </select>
                  <span className="text-xs">returns</span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-20 rounded border px-2 py-1 text-xs"
                    value={view.value}
                    onChange={(e) => updateView(i, { value: Number(e.target.value) })}
                  />
                </>
              ) : (
                <>
                  <select
                    className="rounded border px-2 py-1 text-xs"
                    value={view.longAsset}
                    onChange={(e) => updateView(i, { longAsset: e.target.value })}
                  >
                    {assets.map((a) => (
                      <option key={a.code} value={a.code}>{a.code}</option>
                    ))}
                  </select>
                  <span className="text-xs">outperforms</span>
                  <select
                    className="rounded border px-2 py-1 text-xs"
                    value={view.shortAsset}
                    onChange={(e) => updateView(i, { shortAsset: e.target.value })}
                  >
                    {assets.map((a) => (
                      <option key={a.code} value={a.code}>{a.code}</option>
                    ))}
                  </select>
                  <span className="text-xs">by</span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-20 rounded border px-2 py-1 text-xs"
                    value={view.value}
                    onChange={(e) => updateView(i, { value: Number(e.target.value) })}
                  />
                </>
              )}
              <span className="text-xs text-muted-foreground">conf:</span>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                className="w-20"
                value={view.confidence}
                onChange={(e) => updateView(i, { confidence: Number(e.target.value) })}
              />
              <span className="text-xs">{(view.confidence * 100).toFixed(0)}%</span>
              <button type="button" className="text-xs text-red-500" onClick={() => removeView(i)}>✕</button>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        onClick={handleRun}
        disabled={running}
      >
        {running ? "Computing..." : "Run Black-Litterman"}
      </button>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {Object.entries(result.weights)
              .sort(([, a], [, b]) => b - a)
              .map(([asset, w]) => (
                <MetricCard key={asset} label={asset} value={w * 100} suffix="%" />
              ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2">Asset</th>
                  <th className="p-2 text-right">Prior Return</th>
                  <th className="p-2 text-right">Posterior Return</th>
                  <th className="p-2 text-right">Weight</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(result.weights).map((asset) => (
                  <tr key={asset} className="border-b">
                    <td className="p-2 font-medium">{asset}</td>
                    <td className="p-2 text-right">{((result.priorReturns[asset] || 0) * 100).toFixed(2)}%</td>
                    <td className="p-2 text-right">{((result.posteriorReturns[asset] || 0) * 100).toFixed(2)}%</td>
                    <td className="p-2 text-right">{((result.weights[asset] || 0) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
