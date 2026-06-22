import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { calculatePosition, calculateIncome } from "@/lib/calculations/position";
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
      fees: true,
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
          accruedInterest: tx.accruedInterest,
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

        // Income (dividends/interest/coupons), net of accrued interest
        portfolioIncome += calculateIncome(txData);
      }

      // Custody / management fees (portfolio level, e.g. bond custody fees)
      const portfolioFees = portfolio.fees.reduce(
        (sum, f) => sum + Number(f.total),
        0
      );

      const capitalGain = portfolioValue - portfolioCost;
      const totalGain = capitalGain + portfolioIncome - portfolioFees;

      return {
        id: portfolio.id,
        name: portfolio.name,
        currency: portfolio.baseCurrency,
        holdingCount: portfolio.holdings.length,
        marketValue: portfolioValue,
        costBase: portfolioCost,
        capitalGain,
        income: portfolioIncome,
        fees: portfolioFees,
        totalGain,
        totalGainPercent:
          portfolioCost > 0 ? (totalGain / portfolioCost) * 100 : 0,
        holdings: holdingValues,
      };
    })
  );

  const totalValue = portfolioSummaries.reduce((sum, p) => sum + p.marketValue, 0);
  const totalCost = portfolioSummaries.reduce((sum, p) => sum + p.costBase, 0);
  const totalIncome = portfolioSummaries.reduce((sum, p) => sum + p.income, 0);
  const totalFees = portfolioSummaries.reduce((sum, p) => sum + p.fees, 0);
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

  // Recent custody fees (e.g. bond custody invoices)
  const recentFees = await db.fee.findMany({
    where: { portfolio: { userId: session.user.id } },
    include: { portfolio: { select: { id: true, name: true } } },
    orderBy: { invoiceDate: "desc" },
    take: 10,
  });

  // Unified recent activity feed (transactions + fees), newest first
  type ActivityRow = {
    key: string;
    date: Date;
    portfolioId: string;
    portfolioName: string;
    holdingId: string | null;
    instrumentCode: string;
    type: string;
    quantity: number | null;
    price: number | null;
    fees: number;
    amount: number;
  };

  const txActivity: ActivityRow[] = recentTransactions.map((tx) => {
    const qty = Number(tx.quantity);
    const price = Number(tx.price);
    const brokerage = Number(tx.brokerage);
    const accrued = Number(tx.accruedInterest ?? 0);
    const isIncome = [
      "DIVIDEND",
      "INTEREST",
      "COUPON",
      "RETURN_OF_CAPITAL",
    ].includes(tx.transactionType);
    const gross = qty * price;
    return {
      key: `tx-${tx.id}`,
      date: tx.tradeDate,
      portfolioId: tx.holding.portfolio.id,
      portfolioName: tx.holding.portfolio.name,
      holdingId: tx.holdingId,
      instrumentCode: tx.holding.instrument.code,
      type: tx.transactionType,
      quantity: isIncome ? null : qty,
      price: isIncome ? null : price,
      fees: brokerage,
      amount: isIncome ? gross : gross + brokerage + accrued,
    };
  });

  const feeActivity: ActivityRow[] = recentFees.map((fee) => ({
    key: `fee-${fee.id}`,
    date: fee.invoiceDate,
    portfolioId: fee.portfolio.id,
    portfolioName: fee.portfolio.name,
    holdingId: null,
    instrumentCode: "Custody Fee",
    type: "FEE",
    quantity: null,
    price: null,
    fees: Number(fee.total),
    amount: Number(fee.total),
  }));

  const recentActivity = [...txActivity, ...feeActivity]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10);

  const totalCapitalGain = totalValue - totalCost;
  const totalGainLoss = totalCapitalGain + totalIncome - totalFees;
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
          <p className="mt-1 text-xs text-muted-foreground">
            Capital + income
            {totalFees > 0
              ? ` − $${totalFees.toLocaleString(undefined, { maximumFractionDigits: 0 })} fees`
              : ""}
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
                    Fees
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
                    <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                      {p.fees > 0
                        ? `−$${p.fees.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        : "—"}
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
      {recentActivity.length > 0 && (
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
                    Fees
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentActivity.map((row) => {
                  const href = row.holdingId
                    ? `/portfolio/${row.portfolioId}/holdings/${row.holdingId}`
                    : `/portfolio/${row.portfolioId}/bonds`;
                  return (
                    <tr key={row.key} className="hover:bg-accent/50">
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        <Link href={href} className="hover:text-primary hover:underline">
                          {row.date.toISOString().split("T")[0]}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={href} className="font-medium text-primary hover:underline">
                          {row.instrumentCode}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={href}
                          className="text-sm text-muted-foreground hover:text-primary hover:underline"
                        >
                          {row.type.replace(/_/g, " ")}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={href}
                          className="text-xs text-muted-foreground hover:text-primary hover:underline"
                        >
                          {row.portfolioName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <Link href={href} className="hover:text-primary hover:underline">
                          {row.quantity != null ? row.quantity.toLocaleString() : "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <Link href={href} className="hover:text-primary hover:underline">
                          {row.price != null
                            ? `$${row.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
                            : "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                        <Link href={href} className="hover:text-primary hover:underline">
                          {row.fees > 0 ? `$${row.fees.toFixed(2)}` : "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        <Link href={href} className="hover:text-primary hover:underline">
                          ${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
