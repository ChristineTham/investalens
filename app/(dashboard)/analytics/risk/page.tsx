import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import {
  getPortfolioTimeSeries,
  getBenchmarkTimeSeries,
  getPortfolioReturnsMatrix,
} from "@/lib/services/analytics-data";
import {
  calculateRiskMetrics,
} from "@/lib/calculations/risk-metrics";
import { rollingMetric } from "@/lib/calculations/rolling-metrics";
import { detectDrawdowns, drawdownSeries } from "@/lib/calculations/drawdown";
import { RiskDashboardClient } from "./risk-client";

const MAX_CHART_POINTS = 500;

/** Downsample arrays to max points for chart rendering (keeps first and last). */
function downsample<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr;
  const step = (arr.length - 1) / (maxPoints - 1);
  const result: T[] = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(arr[Math.round(i * step)]);
  }
  return result;
}

type DateRange = "1Y" | "3Y" | "5Y" | "10Y" | "MAX";

export const metadata = {
  title: "Risk",
};

export default async function RiskMetricsPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolio?: string; range?: string; benchmark?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;

  const portfolios = await db.portfolio.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
  });

  if (portfolios.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-bold">Risk Metrics</h1>
        <p className="text-muted-foreground">Create a portfolio first.</p>
      </div>
    );
  }

  const selectedPortfolioId = params.portfolio || portfolios[0].id;
  const dateRange = (params.range as DateRange) || "1Y";
  const benchmarkCode = params.benchmark || "^AXJO";

  const [portfolioTs, benchmarkTs, matrix] = await Promise.all([
    getPortfolioTimeSeries(selectedPortfolioId, dateRange),
    getBenchmarkTimeSeries(benchmarkCode, dateRange),
    getPortfolioReturnsMatrix(selectedPortfolioId, dateRange),
  ]);

  if (portfolioTs.dates.length < 20) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-bold">Risk Metrics</h1>
        <p className="text-muted-foreground">
          Insufficient data ({portfolioTs.dates.length} days). Need at least 20 trading days.
        </p>
      </div>
    );
  }

  // Align benchmark returns to portfolio dates
  const alignedBenchReturns = portfolioTs.dates.map((d) => {
    const benchIdx = benchmarkTs.dates.indexOf(d);
    return benchIdx >= 0 ? benchmarkTs.returns[benchIdx] : 0;
  });

  const metrics = calculateRiskMetrics(
    portfolioTs.returns,
    alignedBenchReturns,
    portfolioTs.values
  );

  const ddSeries = drawdownSeries(portfolioTs.cumReturns);
  const ddEpisodes = detectDrawdowns(portfolioTs.cumReturns, portfolioTs.dates);

  const windowSize = Math.min(252, Math.floor(portfolioTs.returns.length / 2));
  const rollingSharpe = windowSize >= 20
    ? rollingMetric(portfolioTs.returns, alignedBenchReturns, windowSize, "sharpe", portfolioTs.dates)
    : { dates: [], values: [] };
  const rollingSortino = windowSize >= 20
    ? rollingMetric(portfolioTs.returns, alignedBenchReturns, windowSize, "sortino", portfolioTs.dates)
    : { dates: [], values: [] };
  const rollingBeta = windowSize >= 20
    ? rollingMetric(portfolioTs.returns, alignedBenchReturns, windowSize, "beta", portfolioTs.dates)
    : { dates: [], values: [] };

  const riskContribution = matrix.assets.map((asset, i) => {
    const assetReturns = matrix.returns.map((row) => row[i]);
    const vol = assetReturns.length > 1
      ? Math.sqrt(assetReturns.reduce((s, r) => s + r * r, 0) / assetReturns.length)
      : 0;
    return { name: asset, value: vol * matrix.weights[i] };
  });

  return (
    <RiskDashboardClient
      portfolios={portfolios}
      selectedPortfolioId={selectedPortfolioId}
      dateRange={dateRange}
      benchmarkCode={benchmarkCode}
      metrics={metrics}
      portfolioTs={{
        dates: downsample(portfolioTs.dates, MAX_CHART_POINTS),
        values: downsample(portfolioTs.values, MAX_CHART_POINTS),
        returns: downsample(portfolioTs.returns, MAX_CHART_POINTS),
        cumReturns: downsample(portfolioTs.cumReturns, MAX_CHART_POINTS),
      }}
      benchmarkTs={{
        dates: downsample(benchmarkTs.dates, MAX_CHART_POINTS),
        values: downsample(benchmarkTs.values, MAX_CHART_POINTS),
        returns: downsample(benchmarkTs.returns, MAX_CHART_POINTS),
        cumReturns: downsample(benchmarkTs.cumReturns, MAX_CHART_POINTS),
      }}
      drawdownSeries={downsample(ddSeries, MAX_CHART_POINTS)}
      drawdownEpisodes={ddEpisodes}
      rollingSharpe={{ dates: downsample(rollingSharpe.dates, MAX_CHART_POINTS), values: downsample(rollingSharpe.values, MAX_CHART_POINTS) }}
      rollingSortino={{ dates: downsample(rollingSortino.dates, MAX_CHART_POINTS), values: downsample(rollingSortino.values, MAX_CHART_POINTS) }}
      rollingBeta={{ dates: downsample(rollingBeta.dates, MAX_CHART_POINTS), values: downsample(rollingBeta.values, MAX_CHART_POINTS) }}
      riskContribution={riskContribution}
    />
  );
}
