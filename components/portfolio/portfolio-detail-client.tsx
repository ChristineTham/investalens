"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { ChartCard } from "@/components/charts/chart-card";
import { RangeSelector } from "@/components/charts/range-selector";
import { AllocationPie } from "@/components/charts/allocation-pie";
import { PortfolioAreaChart } from "@/components/charts/portfolio-area-chart";
import { PortfolioPerformanceDetailChart } from "@/components/charts/portfolio-performance-detail-chart";
import { PortfolioMovementChart } from "@/components/charts/portfolio-movement-chart";
import { HoldingsTable } from "@/components/portfolio/holdings-table";
import { HoldingTooltipBody } from "@/components/charts/holding-tooltip";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { BENCHMARKS } from "@/lib/constants/benchmarks";
import type {
  PortfolioDetail,
  HoldingMetric,
} from "@/lib/services/portfolio-detail";
import type { ChartRange } from "@/lib/constants/chart-ranges";
import type { PortfolioDetailSeries } from "@/components/charts/portfolio-chart-utils";

function ChartLoader() {
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}

function PerformerItem({ h }: { h: HoldingMetric }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <li className="flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent" />
        }
      >
        <span
          className={`h-3 w-1 shrink-0 rounded-sm ${h.colorSwatch}`}
          aria-hidden
        />
        <span className="font-medium">{h.code}</span>
        <span className="truncate text-xs text-muted-foreground">{h.name}</span>
        <span
          className={`ml-auto shrink-0 text-sm font-semibold tabular-nums ${
            h.totalGainPercent >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {h.totalGainPercent >= 0 ? "+" : ""}
          {h.totalGainPercent.toFixed(1)}%
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm border border-border bg-card p-2.5 text-card-foreground">
        <HoldingTooltipBody h={h} />
      </TooltipContent>
    </Tooltip>
  );
}

export function PortfolioDetailClient({ detail }: { detail: PortfolioDetail }) {
  const [range, setRange] = useState<ChartRange>("1Y");
  const [benchmark, setBenchmark] = useState("");
  const [series, setSeries] = useState<PortfolioDetailSeries | null>(null);
  const requestKey = `${range}|${benchmark}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams({ range });
    if (benchmark) params.set("benchmark", benchmark);

    fetch(`/api/v1/portfolios/${detail.id}/detail?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: PortfolioDetailSeries | null) => {
        if (!cancelled && d) setSeries(d);
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(requestKey);
      });

    return () => {
      cancelled = true;
    };
  }, [detail.id, range, benchmark, requestKey]);

  const benchmarkName = benchmark
    ? BENCHMARKS[benchmark as keyof typeof BENCHMARKS]?.name
    : undefined;

  const holdingsMeta = series?.series ?? [];
  const valueSeries = series?.valueSeries ?? [];
  const performanceSeries = series?.performanceSeries ?? [];
  const movementSeries = series?.movementSeries ?? [];

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

  return (
    <div className="space-y-4">
      {/* Universal timescale selector — affects every chart below. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">
          Charts &amp; analysis
        </p>
        <RangeSelector value={range} onChange={setRange} label="Timescale" />
      </div>

      {/* Responsive chart grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Portfolio value over time"
          description="Stacked by holding · total in bold"
          className="lg:col-span-2"
          height={300}
        >
          {(h) =>
            withLoader(
              <PortfolioAreaChart
                data={valueSeries}
                series={holdingsMeta}
                currency={detail.currency}
                range={range}
                height={h}
              />
            )
          }
        </ChartCard>

        <ChartCard
          title="Performance (gain / loss)"
          description="Total gain % vs. benchmark"
          actions={benchmarkSelector}
          height={280}
        >
          {(h) =>
            withLoader(
              <PortfolioPerformanceDetailChart
                data={performanceSeries}
                currency={detail.currency}
                range={range}
                benchmarkName={benchmarkName}
                height={h}
              />
            )
          }
        </ChartCard>

        <ChartCard
          title="Allocation by holding"
          description="Share of current value · grouped by sector"
          height={280}
        >
          {(h) => (
            <AllocationPie
              holdings={detail.holdings}
              sectors={detail.sectorAllocation}
              currency={detail.currency}
              height={h}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Portfolio movement"
          description="Net cash flow per month (buys / sells / distributions), stacked by holding"
          className="lg:col-span-2"
          height={280}
        >
          {(h) =>
            withLoader(
              <PortfolioMovementChart
                data={movementSeries}
                series={holdingsMeta}
                currency={detail.currency}
                height={h}
              />
            )
          }
        </ChartCard>
      </div>

      {/* Top / bottom performers */}
      {(detail.topPerformers.length > 0 ||
        detail.bottomPerformers.length > 0) && (
        <TooltipProvider delay={150}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-2 font-medium">Top performers</h3>
              <ul className="space-y-0.5">
                {detail.topPerformers.map((h) => (
                  <PerformerItem key={h.id} h={h} />
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-2 font-medium">Bottom performers</h3>
              <ul className="space-y-0.5">
                {detail.bottomPerformers.map((h) => (
                  <PerformerItem key={h.id} h={h} />
                ))}
              </ul>
            </div>
          </div>
        </TooltipProvider>
      )}

      {/* Holdings table */}
      <div>
        <h2 className="mb-2 font-serif text-lg font-semibold">Holdings</h2>
        <HoldingsTable
          portfolioId={detail.id}
          holdings={detail.holdings}
          sparklines={series?.sparklines ?? {}}
          loadingSparklines={loading}
        />
      </div>
    </div>
  );
}
