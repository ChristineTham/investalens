import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { calculatePosition } from "@/lib/calculations/position";
import {
  Briefcase,
  TrendingUp,
  DollarSign,
  Activity,
  ArrowRight,
} from "lucide-react";

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
      }

      return {
        id: portfolio.id,
        name: portfolio.name,
        currency: portfolio.baseCurrency,
        holdingCount: portfolio.holdings.length,
        marketValue: portfolioValue,
        gainLoss: portfolioValue - portfolioCost,
        gainLossPercent:
          portfolioCost > 0
            ? ((portfolioValue - portfolioCost) / portfolioCost) * 100
            : 0,
      };
    })
  );

  const totalValue = portfolioSummaries.reduce((sum, p) => sum + p.marketValue, 0);
  const totalCost = portfolioSummaries.reduce((sum, p) => sum + p.marketValue - p.gainLoss, 0);
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

  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercent =
    totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your investment portfolios
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            Total Gain/Loss
          </div>
          <p
            className={`mt-2 text-2xl font-bold ${totalGainLoss >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            {totalGainLoss >= 0 ? "+" : ""}$
            {totalGainLoss.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}{" "}
            <span className="text-base font-normal">
              ({totalGainLossPercent >= 0 ? "+" : ""}
              {totalGainLossPercent.toFixed(1)}%)
            </span>
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Briefcase className="h-4 w-4" />
            Portfolios
          </div>
          <p className="mt-2 text-2xl font-bold">{portfolios.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            Holdings
          </div>
          <p className="mt-2 text-2xl font-bold">{totalHoldings}</p>
        </div>
      </div>

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
                  Market Value
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Gain/Loss
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
                  <td className="px-4 py-3 text-right text-sm font-medium">
                    ${p.marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td
                    className={`px-4 py-3 text-right text-sm font-medium ${p.gainLoss >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {p.gainLoss >= 0 ? "+" : ""}$
                    {p.gainLoss.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}{" "}
                    ({p.gainLossPercent >= 0 ? "+" : ""}
                    {p.gainLossPercent.toFixed(1)}%)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent Activity */}
      {recentTransactions.length > 0 && (
        <div className="rounded-lg border border-border">
          <div className="border-b border-border p-4">
            <h2 className="font-medium">Recent Activity</h2>
          </div>
          <div className="divide-y divide-border">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <span className="font-medium">
                    {tx.holding.instrument.code}
                  </span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {tx.transactionType}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {tx.holding.portfolio.name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium">
                    {Number(tx.quantity)} × ${Number(tx.price).toFixed(2)}
                  </span>
                  <span className="ml-3 text-xs text-muted-foreground">
                    {tx.tradeDate.toISOString().split("T")[0]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
