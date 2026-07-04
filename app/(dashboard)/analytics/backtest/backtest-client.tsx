"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import {
  DateRangeSelector,
  type DateRange,
} from "@/components/analytics/date-range-selector";
import { BenchmarkSelector } from "@/components/analytics/benchmark-selector";
import {
  collapseToReturnSeries,
  type ReturnsMatrixLike,
} from "@/lib/calculations/returns-matrix";
import { holdingColor } from "@/lib/constants/chart-colors";
import { cn } from "@/lib/utils";

const MultiLineChart = dynamic(
  () =>
    import("@/components/charts/multi-line-chart").then((m) => m.MultiLineChart),
  { ssr: false }
);

interface PortfoliosResult {
  dates: string[];
  labels: string[];
  equityCurves: Record<string, number[]>;
  metrics: Record<
    string,
    {
      annualizedReturn: number;
      annualizedVolatility: number;
      sharpeRatio: number;
      maxDrawdown: number;
      calmarRatio: number;
      sortinoRatio: number;
      drawdownSeries: number[];
    }
  >;
}

type SelectionType = "portfolio" | "model";

interface Selection {
  type: SelectionType;
  id: string;
  label: string;
}

export function BacktestClient({
  portfolios,
  models,
}: {
  portfolios: { id: string; name: string }[];
  models: { id: string; name: string; category: string }[];
}) {
  const searchParams = useSearchParams();

  // Pre-populate from deep links (?model= / ?portfolio=).
  const initialSelections: Selection[] = useMemo(() => {
    const out: Selection[] = [];
    const dpModel = searchParams.get("model");
    const dpPortfolio = searchParams.get("portfolio");
    const m = dpModel && models.find((x) => x.id === dpModel);
    if (m) out.push({ type: "model", id: m.id, label: m.name });
    const p = dpPortfolio && portfolios.find((x) => x.id === dpPortfolio);
    if (p) out.push({ type: "portfolio", id: p.id, label: p.name });
    if (out.length === 0 && portfolios[0]) {
      out.push({
        type: "portfolio",
        id: portfolios[0].id,
        label: portfolios[0].name,
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selections, setSelections] = useState<Selection[]>(initialSelections);
  const [benchmarkCode, setBenchmarkCode] = useState("^AXJO");
  const [dateRange, setDateRange] = useState<DateRange>("5Y");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PortfoliosResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);

  function isSelected(type: SelectionType, id: string) {
    return selections.some((s) => s.type === type && s.id === id);
  }

  function toggle(type: SelectionType, id: string, label: string) {
    setSelections((prev) =>
      isSelected(type, id)
        ? prev.filter((s) => !(s.type === type && s.id === id))
        : [...prev, { type, id, label }]
    );
  }

  async function fetchSeries(sel: Selection) {
    const qs =
      sel.type === "model"
        ? `?source=model&model=${sel.id}&range=${dateRange}`
        : `?portfolio=${sel.id}&range=${dateRange}`;
    const res = await fetch(`/api/v1/analytics/matrix${qs}`);
    if (!res.ok) throw new Error(`Failed to load ${sel.label}`);
    const matrix = (await res.json()) as ReturnsMatrixLike;
    const collapsed = collapseToReturnSeries(matrix);
    const suffix = sel.type === "model" ? " (model)" : "";
    return { label: `${sel.label}${suffix}`, ...collapsed };
  }

  async function handleRun() {
    if (selections.length === 0) return;
    setRunning(true);
    setError(null);
    try {
      const series = await Promise.all(selections.map(fetchSeries));

      let benchmark:
        | { label: string; dates: string[]; returns: number[] }
        | undefined;
      if (benchmarkCode) {
        const res = await fetch(
          `/api/v1/analytics/matrix?source=benchmark&code=${encodeURIComponent(
            benchmarkCode
          )}&range=${dateRange}`
        );
        if (res.ok) {
          const matrix = (await res.json()) as ReturnsMatrixLike;
          const collapsed = collapseToReturnSeries(matrix);
          benchmark = { label: benchmarkCode, ...collapsed };
        }
      }

      const res = await fetch("/api/analytics/backtest/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ series, benchmark }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Comparison failed: ${res.status}`);
      }
      const data = (await res.json()) as PortfoliosResult;
      setResult(data);
      setHighlight(data.labels[0] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setResult(null);
    } finally {
      setRunning(false);
    }
  }

  // Build equity-curve chart series (one line per label) from the result.
  const equitySeries = useMemo(() => {
    if (!result) return [];
    return result.labels.map((label, i) => {
      const c = holdingColor(i);
      return {
        key: label,
        colorVar: c.var,
        colorSwatch: c.swatch,
        values: result.equityCurves[label] ?? [],
      };
    });
  }, [result]);

  const drawdownSeries = useMemo(() => {
    if (!result || !highlight) return [];
    const dd = result.metrics[highlight]?.drawdownSeries ?? [];
    return [
      {
        key: `${highlight} drawdown`,
        colorVar: "var(--rosely7)",
        colorSwatch: "bg-[var(--rosely7)]",
        values: dd.map((v) => v * 100),
      },
    ];
  }, [result, highlight]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Backtesting</h1>
        <p className="text-sm text-muted-foreground">
          Compare real and model portfolios against a benchmark
        </p>
      </div>

      {/* Config */}
      <div className="space-y-4 rounded-lg border p-4">
        <div>
          <span className="text-sm font-medium">Portfolios</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {portfolios.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle("portfolio", p.id, p.name)}
                aria-pressed={isSelected("portfolio", p.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  isSelected("portfolio", p.id)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-sm font-medium">Models</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {models.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggle("model", m.id, m.name)}
                aria-pressed={isSelected("model", m.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  isSelected("model", m.id)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                {m.name}
              </button>
            ))}
            {models.length === 0 && (
              <span className="text-xs text-muted-foreground">
                No models available.
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <span className="text-sm font-medium">Benchmark</span>
            <div className="mt-1">
              <BenchmarkSelector
                selectedCode={benchmarkCode}
                onChange={setBenchmarkCode}
              />
            </div>
          </div>
          <div>
            <span className="text-sm font-medium">Date Range</span>
            <div className="mt-1">
              <DateRangeSelector
                selected={dateRange}
                onChange={setDateRange}
              />
            </div>
          </div>
          <button
            type="button"
            className="ml-auto rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            onClick={handleRun}
            disabled={running || selections.length === 0}
          >
            {running ? "Running..." : "Compare"}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-medium">
              Equity Curves (rebased to 100)
            </h3>
            <MultiLineChart dates={result.dates} series={equitySeries} />
          </div>

          {/* Metrics table */}
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Portfolio</th>
                  <th className="px-3 py-2 text-right font-medium">CAGR</th>
                  <th className="px-3 py-2 text-right font-medium">Vol</th>
                  <th className="px-3 py-2 text-right font-medium">Sharpe</th>
                  <th className="px-3 py-2 text-right font-medium">Max DD</th>
                  <th className="px-3 py-2 text-right font-medium">Calmar</th>
                  <th className="px-3 py-2 text-right font-medium">Sortino</th>
                </tr>
              </thead>
              <tbody>
                {result.labels.map((label) => {
                  const m = result.metrics[label];
                  return (
                    <tr
                      key={label}
                      onClick={() => setHighlight(label)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          if (e.key === " ") e.preventDefault();
                          setHighlight(label);
                        }
                      }}
                      aria-current={highlight === label ? "true" : undefined}
                      className={cn(
                        "cursor-pointer border-t border-border hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        highlight === label && "bg-accent/40"
                      )}
                    >
                      <td className="px-3 py-2 font-medium">{label}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {(m.annualizedReturn * 100).toFixed(2)}%
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {(m.annualizedVolatility * 100).toFixed(2)}%
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {m.sharpeRatio.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {(m.maxDrawdown * 100).toFixed(2)}%
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {m.calmarRatio.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {m.sortinoRatio.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {highlight && (
            <div>
              <h3 className="mb-2 text-sm font-medium">
                Drawdown — {highlight}
              </h3>
              <MultiLineChart dates={result.dates} series={drawdownSeries} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
