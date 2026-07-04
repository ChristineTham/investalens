"use client";

import { useState } from "react";
import { DateRangeSelector, type DateRange } from "@/components/analytics/date-range-selector";
import { EfficientFrontierChart } from "@/components/charts/efficient-frontier";
import { ChartCard } from "@/components/charts/chart-card";
import { SourcePicker, type SourceValue } from "@/components/analytics/source-picker";
import { fetchAnalyticsMatrix } from "@/lib/hooks/use-analytics-matrix";
import {
  collapseToReturnSeries,
  type ReturnsMatrixLike,
} from "@/lib/calculations/returns-matrix";
import { cn } from "@/lib/utils";

interface FrontierPoint {
  return: number;
  risk: number;
  sharpe: number;
  weights: Record<string, number>;
}

interface FrontierResult {
  frontier: FrontierPoint[];
  assets: { name: string; return: number; risk: number }[];
  maxSharpe: FrontierPoint | null;
  minRisk: FrontierPoint | null;
}

interface ModelPoint {
  name: string;
  return: number;
  risk: number;
}

/** Annualised (return, risk) from a daily return series. */
function annualise(returns: number[]): { return: number; risk: number } {
  if (returns.length < 2) return { return: 0, risk: 0 };
  const mean = returns.reduce((a, r) => a + r, 0) / returns.length;
  const variance =
    returns.reduce((a, r) => a + (r - mean) ** 2, 0) / (returns.length - 1);
  return { return: mean * 252, risk: Math.sqrt(variance) * Math.sqrt(252) };
}

export function FrontierClient({
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
  const [compareModelIds, setCompareModelIds] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<FrontierResult | null>(null);
  const [modelPoints, setModelPoints] = useState<ModelPoint[]>([]);
  const [currentPoint, setCurrentPoint] = useState<{
    return: number;
    risk: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleCompare(id: string) {
    setCompareModelIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      const matrix = (await fetchAnalyticsMatrix(
        src,
        dateRange
      )) as ReturnsMatrixLike;

      // The source's own (risk, return) point.
      setCurrentPoint(annualise(collapseToReturnSeries(matrix).returns));

      const res = await fetch("/api/analytics/frontier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...matrix, config: { nPoints: 50 } }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Frontier failed: ${res.status}`);
      }
      setResult(await res.json());

      // Plot each selected comparison model as a labelled point.
      const points = await Promise.all(
        compareModelIds.map(async (id) => {
          const m = models.find((x) => x.id === id)!;
          const mMatrix = (await fetchAnalyticsMatrix(
            { source: "model", id },
            dateRange
          )) as ReturnsMatrixLike;
          const { return: ret, risk } = annualise(
            collapseToReturnSeries(mMatrix).returns
          );
          return { name: m.name, return: ret, risk };
        })
      );
      setModelPoints(points);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Efficient Frontier</h1>
        <p className="text-sm text-muted-foreground">
          Risk-return tradeoff curve for your portfolio assets
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <SourcePicker
          portfolios={portfolios}
          models={models}
          value={src}
          onChange={setSrc}
        />
        <div>
          <span className="text-sm font-medium">Date Range</span>
          <div className="mt-1">
            <DateRangeSelector selected={dateRange} onChange={setDateRange} />
          </div>
        </div>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          onClick={handleRun}
          disabled={running}
        >
          {running ? "Calculating..." : "Generate Frontier"}
        </button>
      </div>

      {models.length > 0 && (
        <div>
          <span className="text-sm font-medium">Compare models</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {models.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleCompare(m.id)}
                aria-pressed={compareModelIds.includes(m.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  compareModelIds.includes(m.id)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <ChartCard
            title="Efficient frontier"
            description="Risk vs return · max-Sharpe, min-risk, your portfolio and models"
            height={380}
          >
            {(h) => (
              <EfficientFrontierChart
                frontier={result.frontier}
                assets={result.assets}
                maxSharpe={result.maxSharpe}
                minRisk={result.minRisk}
                currentPortfolio={currentPoint}
                modelPoints={modelPoints}
                height={h}
              />
            )}
          </ChartCard>

          {result.maxSharpe && (
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-medium">Max Sharpe Portfolio</h3>
              <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Return:</span>{" "}
                  {(result.maxSharpe.return * 100).toFixed(2)}%
                </div>
                <div>
                  <span className="text-muted-foreground">Risk:</span>{" "}
                  {(result.maxSharpe.risk * 100).toFixed(2)}%
                </div>
                <div>
                  <span className="text-muted-foreground">Sharpe:</span>{" "}
                  {result.maxSharpe.sharpe.toFixed(2)}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(result.maxSharpe.weights)
                  .filter(([, w]) => w > 0.01)
                  .sort(([, a], [, b]) => b - a)
                  .map(([asset, w]) => (
                    <span key={asset} className="rounded bg-muted px-2 py-0.5 text-xs">
                      {asset}: {(w * 100).toFixed(1)}%
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
