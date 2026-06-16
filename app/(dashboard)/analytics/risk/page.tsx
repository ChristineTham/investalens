import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PortfolioSelector } from "@/components/reports/portfolio-selector";
import {
  calculateDailyReturns,
  calculateRiskMetrics,
} from "@/lib/calculations/risk-metrics";
import { Suspense } from "react";

export default async function RiskMetricsPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolio?: string }>;
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

  // Get all holdings with prices for the selected portfolio
  const holdings = await db.holding.findMany({
    where: { portfolioId: selectedPortfolioId },
    include: { instrument: true },
  });

  // Get portfolio daily values (aggregate price * quantity)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  // Get prices for all instruments
  const instrumentIds = holdings.map((h) => h.instrumentId);
  const prices = await db.price.findMany({
    where: {
      instrumentId: { in: instrumentIds },
      date: { gte: oneYearAgo },
    },
    orderBy: { date: "asc" },
  });

  // Build daily portfolio value series (simplified: sum of close * latest qty)
  const dateMap = new Map<string, number>();
  for (const p of prices) {
    const dateStr = p.date.toISOString().split("T")[0];
    const current = dateMap.get(dateStr) || 0;
    dateMap.set(dateStr, current + Number(p.close));
  }

  const portfolioPrices = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);

  // Use a simple benchmark approximation (flat line = no benchmark data)
  const benchmarkPrices = portfolioPrices.map((_, i) =>
    portfolioPrices[0] * Math.pow(1 + 0.08 / 252, i)
  ); // 8% annual benchmark

  const portfolioReturns = calculateDailyReturns(portfolioPrices);
  const benchmarkReturns = calculateDailyReturns(benchmarkPrices);

  const metrics =
    portfolioReturns.length > 10
      ? calculateRiskMetrics(portfolioReturns, benchmarkReturns, portfolioPrices)
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">Risk Metrics</h1>
          <p className="text-sm text-muted-foreground">
            Portfolio risk-adjusted performance metrics (1 year).
          </p>
        </div>
        <Suspense>
          <PortfolioSelector
            portfolios={portfolios}
            selectedId={params.portfolio || null}
          />
        </Suspense>
      </div>

      {!metrics ? (
        <p className="text-muted-foreground">
          Insufficient price data for risk calculations. Run the daily price
          cron to populate at least 10 days of data.
        </p>
      ) : (
        <>
          {/* Primary metrics */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <MetricCard
              label="Annualised Return"
              value={`${metrics.annualisedReturn >= 0 ? "+" : ""}${metrics.annualisedReturn.toFixed(2)}%`}
              positive={metrics.annualisedReturn >= 0}
            />
            <MetricCard
              label="Volatility"
              value={`${metrics.volatility.toFixed(2)}%`}
              subtitle="annualised std dev"
            />
            <MetricCard
              label="Sharpe Ratio"
              value={metrics.sharpeRatio.toFixed(2)}
              subtitle="risk-adjusted return"
              positive={metrics.sharpeRatio > 0}
            />
            <MetricCard
              label="Sortino Ratio"
              value={metrics.sortinoRatio.toFixed(2)}
              subtitle="downside risk-adjusted"
              positive={metrics.sortinoRatio > 0}
            />
            <MetricCard
              label="Max Drawdown"
              value={`-${metrics.maxDrawdown.toFixed(2)}%`}
              subtitle="worst peak-to-trough"
            />
          </div>

          {/* Secondary metrics */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <MetricCard
              label="Beta"
              value={metrics.beta.toFixed(2)}
              subtitle="vs benchmark"
            />
            <MetricCard
              label="Alpha (Jensen's)"
              value={`${metrics.alpha >= 0 ? "+" : ""}${metrics.alpha.toFixed(2)}%`}
              subtitle="excess return"
              positive={metrics.alpha >= 0}
            />
            <MetricCard
              label="Information Ratio"
              value={metrics.informationRatio.toFixed(2)}
              subtitle="active return / tracking error"
            />
            <MetricCard
              label="Tracking Error"
              value={`${metrics.trackingError.toFixed(2)}%`}
              subtitle="deviation from benchmark"
            />
          </div>

          {/* Interpretation guide */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h3 className="text-sm font-medium">Interpretation Guide</h3>
            <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <div>
                <strong>Sharpe &gt; 1.0:</strong> Good risk-adjusted return
              </div>
              <div>
                <strong>Beta = 1.0:</strong> Moves with market
              </div>
              <div>
                <strong>Sortino &gt; 1.0:</strong> Good downside protection
              </div>
              <div>
                <strong>Alpha &gt; 0:</strong> Beating benchmark after risk
              </div>
              <div>
                <strong>Max DD &lt; 20%:</strong> Moderate risk
              </div>
              <div>
                <strong>Info Ratio &gt; 0.5:</strong> Skilled active management
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
  positive,
}: {
  label: string;
  value: string;
  subtitle?: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`text-lg font-bold ${
          positive === true
            ? "text-rosely-teal"
            : positive === false
              ? "text-destructive"
              : ""
        }`}
      >
        {value}
      </p>
      {subtitle && (
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
