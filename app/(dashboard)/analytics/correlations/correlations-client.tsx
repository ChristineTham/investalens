"use client";

import { useState } from "react";
import { DateRangeSelector, type DateRange } from "@/components/analytics/date-range-selector";
import { CorrelationHeatmap } from "@/components/charts/correlation-heatmap";
import { SourcePicker, type SourceValue } from "@/components/analytics/source-picker";
import { fetchAnalyticsMatrix } from "@/lib/hooks/use-analytics-matrix";

interface CorrelationResult {
  correlation: { matrix: number[][]; labels: string[] };
  dendrogram?: { linkage: number[][]; labels: string[] };
}

export function CorrelationsClient({
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
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CorrelationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      const matrix = await fetchAnalyticsMatrix(src, dateRange);

      const res = await fetch("/api/analytics/correlations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(matrix),
      });
      if (!res.ok) throw new Error("Correlation analysis failed");
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
        <h1 className="font-serif text-2xl font-bold">Correlation Analysis</h1>
        <p className="text-sm text-muted-foreground">Asset correlation matrix and clustering</p>
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
          {running ? "Computing..." : "Compute Correlations"}
        </button>
      </div>

      {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

      {result && (
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-sm font-medium">Correlation Matrix</h3>
            <CorrelationHeatmap matrix={result.correlation.matrix} labels={result.correlation.labels} />
          </div>
          <div className="text-xs text-muted-foreground">
            <p>Blue = positive correlation, Red = negative correlation, White = uncorrelated</p>
            <p>Low correlations between holdings indicate better diversification.</p>
          </div>
        </div>
      )}
    </div>
  );
}
