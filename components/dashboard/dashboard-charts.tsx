"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { ChartCard } from "@/components/charts/chart-card";
import { RangeSelector } from "@/components/charts/range-selector";
import { useChartRange } from "@/lib/stores/chart-range";
import { PortfolioAreaChart } from "@/components/charts/portfolio-area-chart";
import { PortfolioMovementChart } from "@/components/charts/portfolio-movement-chart";
import { PortfolioPerformanceChart } from "@/components/charts/portfolio-performance-chart";
import {
  PortfolioValueTreemap,
  type PortfolioTreemapData,
} from "@/components/charts/portfolio-value-treemap";
import type { ChartRange } from "@/lib/constants/chart-ranges";
import type {
  SeriesMeta,
  ValuePoint,
  MovementPoint,
} from "@/components/charts/portfolio-chart-utils";

interface DashboardSeries {
  range: ChartRange;
  series: SeriesMeta[];
  valueSeries: ValuePoint[];
  movementSeries: MovementPoint[];
}

interface DashboardChartsProps {
  currency: string;
  treemapData: PortfolioTreemapData[];
}

function ChartLoader() {
  return (
    <div
      role="status"
      className="flex h-full min-h-[200px] items-center justify-center text-muted-foreground"
    >
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/**
 * Consolidated dashboard charts, broken down by portfolio, sharing the chart
 * components and the universal timescale selector with the portfolio-detail
 * page. Retains the existing performance chart and allocation treemap.
 */
export function DashboardCharts({ currency, treemapData }: DashboardChartsProps) {
  const [range, setRange] = useChartRange();
  const [data, setData] = useState<DashboardSeries | null>(null);
  const [loadedRange, setLoadedRange] = useState<ChartRange | null>(null);
  const loading = loadedRange !== range;

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/v1/dashboard/detail?range=${range}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: DashboardSeries | null) => {
        if (!cancelled && d) setData(d);
      })
      .finally(() => {
        if (!cancelled) setLoadedRange(range);
      });

    return () => {
      cancelled = true;
    };
  }, [range]);

  const series = data?.series ?? [];
  const valueSeries = data?.valueSeries ?? [];
  const movementSeries = data?.movementSeries ?? [];

  const withLoader = (node: ReactNode) => (loading ? <ChartLoader /> : node);

  return (
    <div className="space-y-4">
      {/* Universal timescale selector — drives every chart below. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-medium">Consolidated charts</h2>
        <RangeSelector value={range} onChange={setRange} label="Timescale" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Existing performance chart — controlled by the universal selector. */}
        <div className="lg:col-span-2">
          <PortfolioPerformanceChart range={range} />
        </div>

        {/* New: portfolio value over time, stacked by portfolio. */}
        <ChartCard
          title="Total value over time"
          description="Stacked by portfolio · total in bold"
          className="lg:col-span-2"
          height={300}
        >
          {(h) =>
            withLoader(
              <PortfolioAreaChart
                data={valueSeries}
                series={series}
                currency={currency}
                range={range}
                height={h}
              />
            )
          }
        </ChartCard>

        {/* Existing allocation treemap (breaks down by portfolio → holding). */}
        <div className="lg:col-span-2">
          <PortfolioValueTreemap data={treemapData} />
        </div>

        {/* New: movement, stacked by portfolio. */}
        <ChartCard
          title="Movement"
          description="Net cash flow per month (buys / sells / distributions), stacked by portfolio"
          className="lg:col-span-2"
          height={300}
        >
          {(h) =>
            withLoader(
              <PortfolioMovementChart
                data={movementSeries}
                series={series}
                currency={currency}
                height={h}
              />
            )
          }
        </ChartCard>
      </div>
    </div>
  );
}
