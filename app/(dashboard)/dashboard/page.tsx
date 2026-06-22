import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { calculatePosition } from "@/lib/calculations/position";
import { PortfolioPerformanceChart } from "@/components/charts/portfolio-performance-chart";
import { PortfolioValueTreemap } from "@/components/charts/portfolio-value-treemap";
import {
  Briefcase,
  TrendingUp,
  DollarSign,
  Activity,
  ArrowRight,
  Wallet,
  PiggyBank,
} from "lucide-react";

const INCOME_TYPES = ["DIVIDEND", "INTEREST", "COUPON"];

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const portfolios = await db.portfolio.findMany({
    where: { userId: session.user.id },
    include: {
      holdings: {
        include: {
          instrument: true,
          transactions: { orderBy: { tradeDate: "asc" } },
        },
      },
    },
  });

  // Calculate portfolio summaries
  const portfolioSummaries = await Promise.all(
    portfolios.map(async (portfolio) => {
      let portfolioValue = 0;
      let portfolioCost = 0;
      let portfolioIncome = 0;
      const holdingValues: { id: string; code: string; marketValue: number }[] = [];

      for (const holding of portfolio.holdings) {
        const latestPrice = await db.price.findFirst({
          where: { instrumentId: holding.instrumentId },
          orderBy: { date: "desc" },
        });

        const currentPrice = latestPrice ? Number(latestPrice.close) : 0;
        const txData = holding.transactions.map((tx) => ({
          id: tx.id,
          transactionType: tx.transactionType,
          tradeDate: tx.tradeDate,
          quantity: tx.quantity,
          price: tx.price,
          brokerage: tx.brokerage,
          exchangeRate: tx.exchangeRate,
          currency: tx.currency,
        }));

        const position = calculatePosition(txData, currentPrice);
        portfolioValue += position.marketValue;
        portfolioCost += position.totalCostBase;

        if (position.marketValue > 0) {
          holdingValues.push({
            id: holding.id,
            code: holding.instrument.code,
            marketValue: position.marketValue,
          });
        }

        // Calculate income from dividends, interest, coupons
        for (const tx of holding.transactions) {
          if (INCOME_TYPES.includes(tx.transactionType)) {
            portfolioIncome += Number(tx.quantity) * Number(tx.price);
          }
        }
      }

      const capitalGain = portfolioValue - portfolioCost;

      return {
        id: portfolio.id,
        name: portfolio.name,
        currency: portfolio.baseCurrency,
        holdingCount: portfolio.holdings.length,
        marketValue: portfolioValue,
        costBase: portfolioCost,
        capitalGain,
        income: portfolioIncome,
        totalGain: capitalGain + portfolioIncome,
        totalGainPercent:
          portfolioCost > 0
            ? ((capitalGain + portfolioIncome) / portfolioCost) * 100
            : 0,
        holdings: holdingValues,
      };
    })
  );

  const totalValue = portfolioSummaries.reduce((sum, p) => sum + p.marketValue, 0);
  const totalCost = portfolioSummaries.reduce((sum, p) => sum + p.costBase, 0);
  const totalIncome = portfolioSummaries.reduce((sum, p) => sum + p.income, 0);
  const totalHoldings = portfolioSummaries.reduce((sum, p) => sum + p.holdingCount, 0);

  // Recent transactions (last 10 across all portfolios)
  const recentTransactions = await db.transaction.findMany({
    where: {
      holding: { portfolio: { userId: session.user.id } },
    },
    include: {
      holding: { include: { instrument: true, portfolio: true } },
    },
    orderBy: { tradeDate: "desc" },
    take: 10,
  });

  const totalCapitalGain = totalValue - totalCost;
  const totalGainLoss = totalCapitalGain + totalIncome;
  const totalGainLossPercent =
    totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your investment portfolios
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4" />
            Purchase Cost
          </div>
          <p className="mt-2 text-2xl font-bold">
            ${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            Total Value
          </div>
          <p className="mt-2 text-2xl font-bold">
            ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            Capital Gain
          </div>
          <p
            className={`mt-2 text-2xl font-bold ${totalCapitalGain >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            {totalCapitalGain >= 0 ? "+" : ""}$
            {totalCapitalGain.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PiggyBank className="h-4 w-4" />
            Income
          </div>
          <p className="mt-2 text-2xl font-bold text-green-600">
            ${totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            Total Gain
          </div>
          <p
            className={`mt-2 text-2xl font-bold ${totalGainLoss >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            {totalGainLoss >= 0 ? "+" : ""}$
            {totalGainLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}{" "}
            <span className="text-base font-normal">
              ({totalGainLossPercent >= 0 ? "+" : ""}
              {totalGainLossPercent.toFixed(1)}%)
            </span>
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Briefcase className="h-4 w-4" />
            Portfolios / Holdings
          </div>
          <p className="mt-2 text-2xl font-bold">
            {portfolios.length} / {totalHoldings}
          </p>
        </div>
      </div>

      {/* Portfolio Performance Chart */}
      <PortfolioPerformanceChart />

      {/* Portfolio Allocation Treemap */}
      <PortfolioValueTreemap
        data={portfolioSummaries.map((p) => ({
          portfolioId: p.id,
          portfolioName: p.name,
          holdings: p.holdings,
        }))}
      />

      {/* Portfolio Summary Table */}
      {portfolioSummaries.length > 0 && (
        <div className="rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="font-medium">Portfolio Summary</h2>
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Portfolio
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Holdings
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
                    Income
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Total Gain
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {portfolioSummaries.map((p) => (
                  <tr key={p.id} className="hover:bg-accent/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/portfolio/${p.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {p.name}
                      </Link>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {p.currency}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {p.holdingCount}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      ${p.costBase.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      ${p.marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td
                      className={`px-4 py-3 text-right text-sm font-medium ${p.capitalGain >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {p.capitalGain >= 0 ? "+" : ""}$
                      {p.capitalGain.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-green-600">
                      ${p.income.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td
                      className={`px-4 py-3 text-right text-sm font-medium ${p.totalGain >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {p.totalGain >= 0 ? "+" : ""}$
                      {p.totalGain.toLocaleString(undefined, { maximumFractionDigits: 0 })}{" "}
                      ({p.totalGainPercent >= 0 ? "+" : ""}
                      {p.totalGainPercent.toFixed(1)}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recentTransactions.length > 0 && (
        <div className="rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="font-medium">Recent Activity</h2>
            <Link
              href="/dashboard/transactions"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Instrument
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Portfolio
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Price
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Brokerage
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentTransactions.map((tx) => {
                  const qty = Number(tx.quantity);
                  const price = Number(tx.price);
                  const brokerage = Number(tx.brokerage);
                  const accrued = Number(tx.accruedInterest ?? 0);
                  // Income / non-trade types store the amount as quantity(1) × price
                  const isIncome = [
                    "DIVIDEND",
                    "INTEREST",
                    "COUPON",
                    "RETURN_OF_CAPITAL",
                  ].includes(tx.transactionType);
                  const gross = qty * price;
                  const amount = isIncome
                    ? gross
                    : gross + brokerage + accrued;
                  const holdingHref = `/portfolio/${tx.holding.portfolio.id}/holdings/${tx.holdingId}`;
                  return (
                    <tr key={tx.id} className="hover:bg-accent/50">
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        <Link
                          href={holdingHref}
                          className="hover:text-primary hover:underline"
                        >
                          {tx.tradeDate.toISOString().split("T")[0]}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={holdingHref}
                          className="font-medium text-primary hover:underline"
                        >
                          {tx.holding.instrument.code}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={holdingHref}
                          className="text-sm text-muted-foreground hover:text-primary hover:underline"
                        >
                          {tx.transactionType.replace(/_/g, " ")}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={holdingHref}
                          className="text-xs text-muted-foreground hover:text-primary hover:underline"
                        >
                          {tx.holding.portfolio.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <Link
                          href={holdingHref}
                          className="hover:text-primary hover:underline"
                        >
                          {isIncome ? "—" : qty.toLocaleString()}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <Link
                          href={holdingHref}
                          className="hover:text-primary hover:underline"
                        >
                          {isIncome
                            ? "—"
                            : `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                        <Link
                          href={holdingHref}
                          className="hover:text-primary hover:underline"
                        >
                          {brokerage > 0
                            ? `$${brokerage.toFixed(2)}`
                            : accrued > 0
                              ? `$${accrued.toFixed(2)} acc`
                              : "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        <Link
                          href={holdingHref}
                          className="hover:text-primary hover:underline"
                        >
                          ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
