"use client";

import { useState } from "react";
import { DateRangeSelector, type DateRange } from "@/components/analytics/date-range-selector";
import { MetricCard } from "@/components/analytics/metric-card";
import { SourcePicker, type SourceValue } from "@/components/analytics/source-picker";
import { fetchAnalyticsMatrix } from "@/lib/hooks/use-analytics-matrix";

interface PCAResult {
  type: "pca";
  explainedVariance: number[];
  cumulativeVariance: number[];
  loadings: number[][];
  assets: string[];
}

export function FactorsClient({
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
  const [modelType] = useState("pca");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PCAResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      const matrix = await fetchAnalyticsMatrix(src, dateRange);

      const res = await fetch("/api/analytics/factor-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...matrix, config: { type: modelType, nFactors: 5 } }),
      });
      if (!res.ok) throw new Error("Factor analysis failed");
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Factor Analysis</h1>
        <p className="text-sm text-muted-foreground">Principal Component Analysis of portfolio returns</p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <SourcePicker
          portfolios={portfolios}
          models={models}
          value={src}
          onChange={setSrc}
        />
        <DateRangeSelector selected={dateRange} onChange={setDateRange} />
        <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50" onClick={handleRun} disabled={running}>
          {running ? "Analyzing..." : "Run Analysis"}
        </button>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

      {result?.type === "pca" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {result.explainedVariance.map((v, i) => (
              <MetricCard key={i} label={`PC${i + 1}`} value={v * 100} suffix="%" description={`Cumulative: ${(result.cumulativeVariance[i] * 100).toFixed(1)}%`} />
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2">Asset</th>
                  {result.explainedVariance.map((_, i) => (<th key={i} className="p-2 text-right">PC{i + 1}</th>))}
                </tr>
              </thead>
              <tbody>
                {result.assets.map((asset, ai) => (
                  <tr key={asset} className="border-b">
                    <td className="p-2 font-medium">{asset}</td>
                    {result.loadings.map((pc, pi) => (
                      <td key={pi} className={`p-2 text-right ${Math.abs(pc[ai]) > 0.3 ? "font-bold" : "text-muted-foreground"}`}>
                        {pc[ai].toFixed(3)}
                      </td>
                    ))}
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
