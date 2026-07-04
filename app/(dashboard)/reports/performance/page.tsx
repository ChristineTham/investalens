import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generatePerformanceReport } from "@/lib/reports/performance-report";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { redirect } from "next/navigation";
import { PerformanceFilters } from "@/components/reports/performance-filters";
import { PortfolioGrowthChart } from "@/components/charts/portfolio-growth";
import { ChartCard } from "@/components/charts/chart-card";
import { Suspense } from "react";
import Link from "next/link";
import type { HoldingPerformance } from "@/lib/calculations/performance";

export const metadata: Metadata = {
  title: "Performance Report",
};

export default async function PerformanceReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    portfolio?: string;
    from?: string;
    to?: string;
    groupBy?: string;
    openOnly?: string;
    label?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;

  const [portfolios, labels, customGroups] = await Promise.all([
    db.portfolio.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true },
    }),
    db.label.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        holdings: { select: { holdingId: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.customGroup.findMany({
      where: { userId: session.user.id },
      include: { categories: { include: { holdings: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (portfolios.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-bold">Performance Report</h1>
        <p className="text-muted-foreground">Create a portfolio first.</p>
      </div>
    );
  }

  // Parse parameters
  const selectedPortfolioId = params.portfolio || null;
  const groupByParam = params.groupBy || "market";
  // "custom:<groupId>" groups by one of the user's custom groups; the report
  // generator only knows instrument dimensions, so custom grouping is applied
  // here after generation.
  const customGroup = groupByParam.startsWith("custom:")
    ? customGroups.find((g) => g.id === groupByParam.slice("custom:".length))
    : undefined;
  const groupBy = customGroup
    ? "none"
    : (groupByParam as "market" | "sector" | "industry" | "type" | "country" | "none");
  const openOnly = params.openOnly !== "false"; // default to true

  // Label filter: restrict holdings to those carrying the selected label.
  const selectedLabelId = params.label || null;
  const selectedLabel = selectedLabelId
    ? labels.find((l) => l.id === selectedLabelId)
    : undefined;
  const labelHoldingIds = selectedLabel
    ? selectedLabel.holdings.map((h) => h.holdingId)
    : undefined;

  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const fromDate = params.from ? new Date(params.from) : oneYearAgo;
  const toDate = params.to ? new Date(params.to) : now;

  const fromStr = fromDate.toISOString().split("T")[0];
  const toStr = toDate.toISOString().split("T")[0];

  // Generate report for selected portfolio or all portfolios
  let report: {
    portfolio: {
      totalCostBase: number;
      totalMarketValue: number;
      totalReturn: number;
      totalReturnPercent: number;
      holdings: HoldingPerformance[];
    };
    groups: Record<string, HoldingPerformance[]>;
    growthHistory: Array<{ date: string; portfolio: number }>;
  };

  if (selectedPortfolioId) {
    const res = await generatePerformanceReport({
      portfolioId: selectedPortfolioId,
      dateRange: { from: fromDate, to: toDate },
      groupBy,
      openOnly,
      holdingIds: labelHoldingIds,
    });
    report = res;
  } else {
    // Consolidated: merge all portfolios
    const allHoldings: HoldingPerformance[] = [];
    const mergedHistoryMap: Record<string, number> = {};

    for (const p of portfolios) {
      const res = await generatePerformanceReport({
        portfolioId: p.id,
        dateRange: { from: fromDate, to: toDate },
        groupBy,
        openOnly,
        holdingIds: labelHoldingIds,
      });
      allHoldings.push(...res.portfolio.holdings);
      res.growthHistory.forEach((pt) => {
        mergedHistoryMap[pt.date] = (mergedHistoryMap[pt.date] || 0) + pt.portfolio;
      });
    }

    const totalCostBase = allHoldings.reduce((s, h) => s + h.costBase, 0);
    const totalMarketValue = allHoldings.reduce((s, h) => s + h.marketValue, 0);
    const totalReturn = allHoldings.reduce((s, h) => s + h.totalReturn, 0);

    // Regroup consolidated holdings
    const groups: Record<string, HoldingPerformance[]> = {};
    if (groupBy === "none") {
      groups["All"] = allHoldings;
    } else {
      // We need to fetch the instruments for grouping in consolidated view
      const holdingsMetadata = await db.holding.findMany({
        where: { portfolio: { userId: session.user.id } },
        include: { instrument: true },
      });

      for (const hp of allHoldings) {
        const holding = holdingsMetadata.find((h) => h.id === hp.holdingId);
        if (!holding) continue;

        let key: string;
        switch (groupBy) {
          case "market":
            key = holding.instrument.marketCode;
            break;
          case "sector":
            key = holding.instrument.sector || "Unknown";
            break;
          case "industry":
            key = holding.instrument.industry || "Unknown";
            break;
          case "type":
            key = holding.instrument.instrumentType;
            break;
          case "country":
            key = holding.instrument.country || "Unknown";
            break;
          default:
            key = "All";
        }

        if (!groups[key]) groups[key] = [];
        groups[key].push(hp);
      }
    }

    // Sort growth history chronologically
    const growthHistory = Object.entries(mergedHistoryMap)
      .map(([date, portfolio]) => ({ date, portfolio }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Fallback if no dates
    if (growthHistory.length === 0) {
      const formattedNow = new Date().toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      growthHistory.push({
        date: formattedNow,
        portfolio: totalMarketValue,
      });
    }

    report = {
      portfolio: {
        totalCostBase,
        totalMarketValue,
        totalReturn,
        totalReturnPercent: totalCostBase > 0 ? (totalReturn / totalCostBase) * 100 : 0,
        holdings: allHoldings,
      },
      groups,
      growthHistory,
    };
  }

  // Regroup by custom group category (assignments are per instrument), with an
  // "Unassigned" bucket for instruments without a category in this group.
  if (customGroup) {
    const holdingsMeta = await db.holding.findMany({
      where: { portfolio: { userId: session.user.id } },
      select: { id: true, instrumentId: true },
    });
    const instrumentByHolding = new Map(
      holdingsMeta.map((h) => [h.id, h.instrumentId])
    );
    const categoryByInstrument = new Map<string, string>();
    for (const cat of customGroup.categories) {
      for (const a of cat.holdings) {
        categoryByInstrument.set(a.instrumentId, cat.name);
      }
    }

    const customGroups2: Record<string, HoldingPerformance[]> = {};
    for (const hp of report.portfolio.holdings) {
      const instrumentId = instrumentByHolding.get(hp.holdingId);
      const key =
        (instrumentId && categoryByInstrument.get(instrumentId)) ||
        "Unassigned";
      if (!customGroups2[key]) customGroups2[key] = [];
      customGroups2[key].push(hp);
    }
    report.groups = customGroups2;
  }

  const isGrouped = customGroup ? true : groupBy !== "none";

  // Calculate subtotals helper
  function calculateSubtotals(holdingsList: HoldingPerformance[]) {
    const costBase = holdingsList.reduce((s, h) => s + h.costBase, 0);
    const marketValue = holdingsList.reduce((s, h) => s + h.marketValue, 0);
    const capitalGain = holdingsList.reduce((s, h) => s + h.capitalGain, 0);
    const dividendIncome = holdingsList.reduce((s, h) => s + h.dividendIncome, 0);
    const totalReturn = holdingsList.reduce((s, h) => s + h.totalReturn, 0);
    const returnPercent = costBase > 0 ? (totalReturn / costBase) * 100 : 0;
    return { costBase, marketValue, capitalGain, dividendIncome, totalReturn, returnPercent };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-2xl font-bold">Performance Report</h1>
      </div>

      <Suspense>
        <PerformanceFilters
          portfolios={portfolios}
          selectedPortfolioId={selectedPortfolioId}
          from={fromStr}
          to={toStr}
          groupBy={groupByParam}
          openOnly={openOnly}
          labels={labels.map((l) => ({ id: l.id, name: l.name }))}
          selectedLabelId={selectedLabelId}
          customGroups={customGroups.map((g) => ({ id: g.id, name: g.name }))}
        />
      </Suspense>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Cost</p>
          <p className="text-lg font-bold">
            {formatCurrency(report.portfolio.totalCostBase)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Market Value</p>
          <p className="text-lg font-bold">
            {formatCurrency(report.portfolio.totalMarketValue)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Return</p>
          <p className="text-lg font-bold">
            {formatCurrency(report.portfolio.totalReturn)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Return %</p>
          <p className="text-lg font-bold">
            {formatPercent(report.portfolio.totalReturnPercent)}
          </p>
        </div>
      </div>

      {/* Portfolio Growth Chart */}
      <ChartCard
        title="Portfolio growth"
        description="Portfolio value over time"
        height={360}
      >
        <PortfolioGrowthChart
          data={report.growthHistory}
          showBenchmark={false}
          height={360}
        />
      </ChartCard>

      {/* Holdings table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Code
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Cost Base
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Market Value
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Capital Gain
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Dividends
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Total Return
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Return %
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Object.entries(report.groups).map(([groupName, groupHoldings]) => {
              const sub = calculateSubtotals(groupHoldings);
              return (
                <Suspense key={groupName}>
                  {isGrouped && (
                    <tr className="bg-muted/20 font-semibold text-sm">
                      <td colSpan={7} className="px-4 py-2 text-left">
                        {groupName}
                      </td>
                    </tr>
                  )}
                  {groupHoldings.map((h) => (
                    <tr key={h.holdingId} className="cursor-pointer hover:bg-accent/50">
                      <td className="px-4 py-3 font-medium">
                        <Link
                          href={`/reports/holding/${h.holdingId}`}
                          className="text-primary hover:underline"
                        >
                          {h.instrumentCode}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {formatCurrency(h.costBase)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {formatCurrency(h.marketValue)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {formatCurrency(h.capitalGain)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {formatCurrency(h.dividendIncome)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {formatCurrency(h.totalReturn)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {formatPercent(h.totalReturnPercent)}
                      </td>
                    </tr>
                  ))}
                  {isGrouped && (
                    <tr className="bg-muted/10 font-medium text-sm">
                      <td className="px-4 py-2 italic text-muted-foreground">
                        Subtotal ({groupName})
                      </td>
                      <td className="px-4 py-2 text-right">{formatCurrency(sub.costBase)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(sub.marketValue)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(sub.capitalGain)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(sub.dividendIncome)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(sub.totalReturn)}</td>
                      <td className="px-4 py-2 text-right">{formatPercent(sub.returnPercent)}</td>
                    </tr>
                  )}
                </Suspense>
              );
            })}
            {/* Overall Totals */}
            <tr className="bg-muted/40 font-bold text-sm">
              <td className="px-4 py-3 uppercase">Total</td>
              <td className="px-4 py-3 text-right">
                {formatCurrency(report.portfolio.totalCostBase)}
              </td>
              <td className="px-4 py-3 text-right">
                {formatCurrency(report.portfolio.totalMarketValue)}
              </td>
              <td className="px-4 py-3 text-right">
                {formatCurrency(
                  report.portfolio.holdings.reduce((s, h) => s + h.capitalGain, 0)
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {formatCurrency(
                  report.portfolio.holdings.reduce((s, h) => s + h.dividendIncome, 0)
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {formatCurrency(report.portfolio.totalReturn)}
              </td>
              <td className="px-4 py-3 text-right">
                {formatPercent(report.portfolio.totalReturnPercent)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
