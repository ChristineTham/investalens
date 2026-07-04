"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import type { RiskMetrics } from "@/lib/calculations/risk-metrics";
import type { DrawdownEpisode } from "@/lib/calculations/drawdown";
import { MetricCard } from "@/components/analytics/metric-card";
import { ChartCard } from "@/components/charts/chart-card";
import { DateRangeSelector, type DateRange } from "@/components/analytics/date-range-selector";
import { BenchmarkSelector } from "@/components/analytics/benchmark-selector";

const GrowthChart = dynamic(
  () => import("@/components/charts/growth-chart").then((m) => m.GrowthChart),
  { ssr: false }
);
const ReturnHistogram = dynamic(
  () => import("@/components/charts/return-histogram").then((m) => m.ReturnHistogram),
  { ssr: false }
);
const RollingMetricsChart = dynamic(
  () => import("@/components/charts/rolling-metrics-chart").then((m) => m.RollingMetricsChart),
  { ssr: false }
);
const RiskContributionPie = dynamic(
  () => import("@/components/charts/risk-contribution-pie").then((m) => m.RiskContributionPie),
  { ssr: false }
);
const MetricRadarChart = dynamic(
  () => import("@/components/charts/metric-radar-chart").then((m) => m.MetricRadarChart),
  { ssr: false }
);

const clampNorm = (v: number, min: number, max: number) =>
  ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * 100;

interface Props {
  portfolios: { id: string; name: string }[];
  selectedPortfolioId: string;
  dateRange: DateRange;
  benchmarkCode: string;
  metrics: RiskMetrics;
  portfolioTs: { dates: string[]; values: number[]; returns: number[]; cumReturns: number[] };
  benchmarkTs: { dates: string[]; values: number[]; returns: number[]; cumReturns: number[] };
  drawdownSeries: number[];
  drawdownEpisodes: DrawdownEpisode[];
  rollingSharpe: { dates: string[]; values: number[] };
  rollingSortino: { dates: string[]; values: number[] };
  rollingBeta: { dates: string[]; values: number[] };
  riskContribution: { name: string; value: number }[];
}

const TABS = ["Overview", "Drawdowns", "Distribution", "Rolling", "Decomposition"] as const;

export function RiskDashboardClient({
  portfolios,
  selectedPortfolioId,
  dateRange,
  benchmarkCode,
  metrics,
  portfolioTs,
  benchmarkTs,
  drawdownSeries,
  drawdownEpisodes,
  rollingSharpe,
  rollingSortino,
  rollingBeta,
  riskContribution,
}: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`/analytics/risk?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">Risk Metrics</h1>
          <p className="text-sm text-muted-foreground">
            Comprehensive risk analysis
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            value={selectedPortfolioId}
            onChange={(e) => updateParams("portfolio", e.target.value)}
            aria-label="Portfolio"
          >
            {portfolios.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <DateRangeSelector selected={dateRange} onChange={(r) => updateParams("range", r)} />
          <BenchmarkSelector selectedCode={benchmarkCode} onChange={(c) => updateParams("benchmark", c)} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Return" value={metrics.annualisedReturn} suffix="%" trend={metrics.annualisedReturn >= 0 ? "up" : "down"} />
        <MetricCard label="Volatility" value={metrics.volatility} suffix="%" />
        <MetricCard label="Sharpe" value={metrics.sharpeRatio} trend={metrics.sharpeRatio > 1 ? "up" : metrics.sharpeRatio < 0 ? "down" : "neutral"} />
        <MetricCard label="Max Drawdown" value={-metrics.maxDrawdown} suffix="%" trend="down" />
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === "Overview" && (
        <div className="space-y-6">
          <ChartCard
            title="Growth vs benchmark"
            description="Rebased to 100 at the period start"
            height={320}
          >
            {(h) => (
              <GrowthChart
                height={h}
                dates={portfolioTs.dates}
                portfolioValues={portfolioTs.values}
                benchmarkValues={benchmarkTs.values.length > 0 ? benchmarkTs.values : undefined}
              />
            )}
          </ChartCard>
          <ChartCard
            title="Risk profile"
            description="Key metrics normalised to 0–100 (higher = better)"
            height={300}
          >
            {(h) => (
              <MetricRadarChart
                height={h}
                showLegend={false}
                data={[
                  { axis: "Return", value: clampNorm(metrics.annualisedReturn, -20, 30) },
                  { axis: "Sharpe", value: clampNorm(metrics.sharpeRatio, 0, 3) },
                  { axis: "Sortino", value: clampNorm(metrics.sortinoRatio, 0, 4) },
                  { axis: "Low volatility", value: 100 - clampNorm(metrics.volatility, 0, 40) },
                  { axis: "Low drawdown", value: 100 - clampNorm(metrics.maxDrawdown, 0, 60) },
                  { axis: "Alpha", value: clampNorm(metrics.alpha, -10, 10) },
                ]}
                series={[
                  { key: "value", label: "Profile", colorVar: "var(--rosely8)" },
                ]}
              />
            )}
          </ChartCard>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
            <MetricCard label="Calmar Ratio" value={metrics.calmarRatio} />
            <MetricCard label="Treynor Ratio" value={metrics.treynorRatio} />
            <MetricCard label="Omega Ratio" value={metrics.omegaRatio} />
            <MetricCard label="Beta" value={metrics.beta} />
            <MetricCard label="Alpha" value={metrics.alpha} suffix="%" trend={metrics.alpha > 0 ? "up" : "down"} />
            <MetricCard label="VaR (5%)" value={metrics.var5} suffix="%" />
            <MetricCard label="CVaR (5%)" value={metrics.cvar5} suffix="%" />
            <MetricCard label="Upside Capture" value={metrics.upsideCapture} suffix="%" />
            <MetricCard label="Downside Capture" value={metrics.downsideCapture} suffix="%" />
            <MetricCard label="R²" value={metrics.rSquared} />
            <MetricCard label="Info Ratio" value={metrics.informationRatio} />
            <MetricCard label="Tracking Error" value={metrics.trackingError} suffix="%" />
            <MetricCard label="Skewness" value={metrics.skewness} />
            <MetricCard label="Kurtosis" value={metrics.kurtosis} />
            <MetricCard label="Sortino" value={metrics.sortinoRatio} />
          </div>
        </div>
      )}

      {tab === "Drawdowns" && (
        <div className="space-y-6">
          <ChartCard
            title="Drawdown over time"
            description="Decline from the running peak (%)"
            height={320}
          >
            {(h) => (
              <GrowthChart
                height={h}
                dates={portfolioTs.dates}
                portfolioValues={drawdownSeries.map((d) => d * 100)}
                portfolioLabel="Drawdown %"
              />
            )}
          </ChartCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2">Start</th>
                  <th className="p-2">Trough</th>
                  <th className="p-2">Recovery</th>
                  <th className="p-2">Depth</th>
                  <th className="p-2">Duration (days)</th>
                </tr>
              </thead>
              <tbody>
                {drawdownEpisodes.slice(0, 10).map((ep, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2">{ep.start}</td>
                    <td className="p-2">{ep.trough}</td>
                    <td className="p-2">{ep.recovery ?? "Ongoing"}</td>
                    <td className="p-2 text-loss">{(ep.depth * 100).toFixed(2)}%</td>
                    <td className="p-2">{ep.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "Distribution" && (
        <div className="space-y-6">
          <ChartCard
            title="Daily return distribution"
            description="Histogram of daily returns"
            height={320}
          >
            {(h) => <ReturnHistogram returns={portfolioTs.returns} height={h} />}
          </ChartCard>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard label="Skewness" value={metrics.skewness} description={metrics.skewness < 0 ? "Left-skewed (more downside tail)" : "Right-skewed"} />
            <MetricCard label="Excess Kurtosis" value={metrics.kurtosis} description={metrics.kurtosis > 0 ? "Fat tails (more extreme events)" : "Thin tails"} />
            <MetricCard label="VaR (95%)" value={metrics.var5} suffix="%" description="Max daily loss at 5% probability" />
            <MetricCard label="CVaR (95%)" value={metrics.cvar5} suffix="%" description="Expected loss beyond VaR" />
          </div>
        </div>
      )}

      {tab === "Rolling" && (
        <div className="space-y-6">
          <ChartCard
            title="Rolling Sharpe & Sortino"
            description="Risk-adjusted return over a rolling window"
            height={300}
          >
            {(h) => (
              <RollingMetricsChart
                height={h}
                data={[
                  { dates: rollingSharpe.dates, values: rollingSharpe.values, label: "Sharpe" },
                  { dates: rollingSortino.dates, values: rollingSortino.values, label: "Sortino" },
                ]}
              />
            )}
          </ChartCard>
          <ChartCard
            title="Rolling Beta"
            description="Sensitivity to the benchmark over time"
            height={300}
          >
            {(h) => (
              <RollingMetricsChart
                height={h}
                data={[
                  { dates: rollingBeta.dates, values: rollingBeta.values, label: "Beta" },
                ]}
              />
            )}
          </ChartCard>
        </div>
      )}

      {tab === "Decomposition" && (
        <div className="space-y-6">
          <ChartCard
            title="Risk contribution by holding"
            description="Each holding's share of total portfolio volatility"
            height={300}
          >
            {(h) => <RiskContributionPie data={riskContribution} height={h} />}
          </ChartCard>
        </div>
      )}
    </div>
  );
}
