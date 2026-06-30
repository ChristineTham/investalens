"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useChartRange } from "@/lib/stores/chart-range";
import { RangeSelector } from "@/components/charts/range-selector";
import { ChartCard } from "@/components/charts/chart-card";
import { HoldingPriceChart, ChartControls } from "@/components/charts/holding-price-chart";
import { PortfolioPerformanceDetailChart } from "@/components/charts/portfolio-performance-detail-chart";
import { HoldingMovementChart } from "@/components/charts/holding-movement-chart";
import { BENCHMARKS } from "@/lib/constants/benchmarks";

interface ModelInstrumentDetailClientProps {
  modelId: string;
  instrumentId: string;
  currency: string;
}

interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PerformancePoint {
  date: string;
  capitalGain: number;
  income: number;
  totalGain: number;
  Portfolio: number;
  Benchmark?: number;
}

interface MovementPoint {
  period: string;
  Amount: number;
}

interface DividendMarker {
  date: string;
  amount: number;
}

interface InstrumentDetailData {
  ohlcSeries: PricePoint[];
  performanceSeries: PerformancePoint[];
  movementSeries: MovementPoint[];
  dividends: DividendMarker[];
}

function ChartLoader() {
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}

export function ModelInstrumentDetailClient({
  modelId,
  instrumentId,
  currency,
}: ModelInstrumentDetailClientProps) {
  const [range, setRange] = useChartRange();
  const [benchmark, setBenchmark] = useState("");
  const [data, setData] = useState<InstrumentDetailData | null>(null);

  const requestKey = `${range}|${benchmark}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== requestKey;

  // OHLC controls
  const [showVolume, setShowVolume] = useState(true);
  const [showMA20, setShowMA20] = useState(false);
  const [showMA50, setShowMA50] = useState(true);
  const [showMA200, setShowMA200] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams({ range });
    if (benchmark) params.set("benchmark", benchmark);

    fetch(
      `/api/v1/models/${modelId}/instruments/${instrumentId}/detail?${params}`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((d: InstrumentDetailData | null) => {
        if (!cancelled && d) setData(d);
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(requestKey);
      });

    return () => {
      cancelled = true;
    };
  }, [modelId, instrumentId, range, benchmark, requestKey]);

  const benchmarkName = benchmark
    ? BENCHMARKS[benchmark as keyof typeof BENCHMARKS]?.name
    : undefined;

  const benchmarkSelector = (
    <select
      value={benchmark}
      onChange={(e) => setBenchmark(e.target.value)}
      className="rounded-md border border-border bg-background px-2 py-1 text-xs"
      aria-label="Select benchmark"
    >
      <option value="">No benchmark</option>
      {Object.entries(BENCHMARKS).map(([code, info]) => (
        <option key={code} value={code}>
          {info.name}
        </option>
      ))}
    </select>
  );

  const withLoader = (node: ReactNode) => (loading ? <ChartLoader /> : node);

  // Price stats calculation for the OHLC chart
  const stats = (() => {
    if (!data || data.ohlcSeries.length < 2) return null;
    const filtered = data.ohlcSeries;
    const first = filtered[0].close;
    const last = filtered[filtered.length - 1].close;
    const high = Math.max(...filtered.map((p) => p.high || p.close));
    const low = Math.min(...filtered.map((p) => p.low || p.close));
    const change = last - first;
    const changePercent = first > 0 ? (change / first) * 100 : 0;
    const avgVolume =
      filtered.reduce((s, p) => s + p.volume, 0) / filtered.length;

    return { first, last, high, low, change, changePercent, avgVolume };
  })();

  const ohlcControls = (
    <ChartControls
      showVolume={showVolume}
      showMA20={showMA20}
      showMA50={showMA50}
      showMA200={showMA200}
      onToggleVolume={() => setShowVolume(!showVolume)}
      onToggleMA20={() => setShowMA20(!showMA20)}
      onToggleMA50={() => setShowMA50(!showMA50)}
      onToggleMA200={() => setShowMA200(!showMA200)}
    />
  );

  return (
    <div className="space-y-4">
      {/* Timescale Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">
          Charts &amp; analysis
        </p>
        <RangeSelector value={range} onChange={setRange} label="Timescale" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* OHLC / Price Chart */}
        <ChartCard
          title="Price &amp; Volume"
          description="Open, High, Low, Close chart"
          className="lg:col-span-2"
          actions={ohlcControls}
          height={380}
        >
          {() =>
            withLoader(
              <div className="space-y-4 mt-2">
                {stats && (
                  <div className="flex flex-wrap items-center gap-4 text-sm px-6">
                    <span className="text-muted-foreground">
                      Period:{" "}
                      <span className="font-medium text-foreground">
                        ${stats.first.toFixed(2)} &rarr; ${stats.last.toFixed(2)}
                      </span>
                    </span>
                    <span
                      className={
                        stats.change >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"
                      }
                    >
                      {stats.change >= 0 ? "+" : ""}${stats.change.toFixed(2)} (
                      {stats.change >= 0 ? "+" : ""}
                      {stats.changePercent.toFixed(2)}%)
                    </span>
                    <span className="text-muted-foreground">
                      H: ${stats.high.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">
                      L: ${stats.low.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">
                      Avg Vol: {Math.round(stats.avgVolume).toLocaleString()}
                    </span>
                  </div>
                )}
                {data && (
                  <HoldingPriceChart
                    prices={data.ohlcSeries}
                    dividends={data.dividends}
                    showVolume={showVolume}
                    showMA20={showMA20}
                    showMA50={showMA50}
                    showMA200={showMA200}
                  />
                )}
              </div>
            )
          }
        </ChartCard>

        {/* Performance Comparison Chart */}
        <ChartCard
          title="Performance"
          description="Cumulative return vs. benchmark"
          actions={benchmarkSelector}
          height={280}
        >
          {(h) =>
            withLoader(
              data ? (
                <PortfolioPerformanceDetailChart
                  data={data.performanceSeries}
                  currency={currency}
                  range={range}
                  benchmarkName={benchmarkName}
                  height={h}
                  lineLabel="Instrument"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No data
                </div>
              )
            )
          }
        </ChartCard>

        {/* Cashflow / Movement Chart */}
        <ChartCard
          title="Monthly Cashflow"
          description="Net cash flow per month (buys, sells, distributions)"
          height={280}
        >
          {(h) =>
            withLoader(
              data ? (
                <HoldingMovementChart
                  data={data.movementSeries}
                  currency={currency}
                  height={h}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No data
                </div>
              )
            )
          }
        </ChartCard>
      </div>
    </div>
  );
}
