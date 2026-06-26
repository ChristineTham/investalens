import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { calculatePosition, calculateIncome } from "@/lib/calculations/position";
import { getUserCashTotal } from "@/lib/services/accounts";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { VsModelCard } from "@/components/dashboard/vs-model-card";
import { FetchPricesButton } from "@/components/forms/fetch-prices-button";
import { ActivityIcon } from "@/components/ui/activity-icon";
import {
  transactionMeta,
  cashTypeMeta,
  type ActivityIconKey,
} from "@/lib/constants/activity-meta";
import { cn } from "@/lib/utils";
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
      const holdingValues: {
        id: string;
        code: string;
        name: string;
        instrumentType: string;
        quantity: number;
        marketValue: number;
      }[] = [];

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
            name: holding.instrument.name,
            instrumentType: holding.instrument.instrumentType,
            quantity: position.quantity,
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
  const cashTotal = await getUserCashTotal();
  const netWorth = totalValue + cashTotal;

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

  // Recent cash-account transactions (across the user's accounts)
  const recentCashTx = await db.cashTransaction.findMany({
    where: { cashAccount: { userId: session.user.id } },
    include: {
      cashAccount: { select: { id: true, name: true } },
      category: { select: { name: true } },
    },
    orderBy: { date: "desc" },
    take: 10,
  });

  // Unified recent activity feed (transactions + fees + cash), newest first
  type ActivityRow = {
    key: string;
    date: Date;
    source: string;
    sourceHref: string;
    detailHref: string;
    instrumentCode: string;
    type: string;
    typeLabel: string;
    icon: ActivityIconKey;
    swatch: string;
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
    const m = transactionMeta(tx.transactionType);
    const pid = tx.holding.portfolio.id;
    return {
      key: `tx-${tx.id}`,
      date: tx.tradeDate,
      source: tx.holding.portfolio.name,
      sourceHref: `/portfolio/${pid}`,
      detailHref: `/portfolio/${pid}/holdings/${tx.holdingId}`,
      instrumentCode: tx.holding.instrument.code,
      type: tx.transactionType,
      typeLabel: m.label,
      icon: m.icon,
      swatch: m.swatch,
      quantity: isIncome ? null : qty,
      price: isIncome ? null : price,
      fees: brokerage,
      amount: isIncome ? gross : gross + brokerage + accrued,
    };
  });

  const feeActivity: ActivityRow[] = recentFees.map((fee) => {
    const m = transactionMeta("FEE");
    return {
      key: `fee-${fee.id}`,
      date: fee.invoiceDate,
      source: fee.portfolio.name,
      sourceHref: `/portfolio/${fee.portfolio.id}`,
      detailHref: `/portfolio/${fee.portfolio.id}/bonds`,
      instrumentCode: "Custody Fee",
      type: "FEE",
      typeLabel: m.label,
      icon: m.icon,
      swatch: m.swatch,
      quantity: null,
      price: null,
      fees: Number(fee.total),
      amount: Number(fee.total),
    };
  });

  const CASH_CREDITS = new Set([
    "deposit",
    "interest",
    "transfer_in",
    "dividend_received",
    "distribution",
    "contribution",
    "sell_settlement",
  ]);
  const cashActivity: ActivityRow[] = recentCashTx.map((ct) => {
    const m = cashTypeMeta(ct.type);
    const magnitude = Number(ct.amount);
    const signed = CASH_CREDITS.has(ct.type) ? magnitude : -magnitude;
    return {
      key: `cash-${ct.id}`,
      date: ct.date,
      source: ct.cashAccount.name,
      sourceHref: `/accounts/${ct.cashAccount.id}`,
      detailHref: `/accounts/${ct.cashAccount.id}`,
      instrumentCode: ct.category?.name ?? m.label,
      type: ct.type,
      typeLabel: m.label,
      icon: m.icon,
      swatch: m.swatch,
      quantity: null,
      price: null,
      fees: 0,
      amount: signed,
    };
  });

  const recentActivity = [...txActivity, ...feeActivity, ...cashActivity]
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

      {/* Market Data section */}
      <FetchPricesButton />

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
          <p className="mt-1 text-xs text-muted-foreground">Since inception</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PiggyBank className="h-4 w-4" />
            Income
          </div>
          <p className="mt-2 text-2xl font-bold text-green-600">
            ${totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Since inception</p>
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
            Since inception · capital + income
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
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4" />
            Cash
          </div>
          <p className="mt-2 text-2xl font-bold">
            ${cashTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Across bank accounts</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            Net Worth
          </div>
          <p className="mt-2 text-2xl font-bold">
            ${netWorth.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Investments + cash</p>
        </div>
      </div>

      {/* Consolidated charts with a universal timescale selector */}
      <DashboardCharts
        currency="AUD"
        treemapData={portfolioSummaries.map((p) => ({
          portfolioId: p.id,
          portfolioName: p.name,
          holdings: p.holdings,
        }))}
      />

      {/* Teaser: consolidated vs a default benchmark model */}
      <VsModelCard userId={session.user.id} />

      {/* Returns methodology note */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">
            A note on these returns.
          </span>{" "}
          Gain and performance figures on this dashboard are{" "}
          <span className="font-medium">simple, nominal</span> returns: they are{" "}
          <span className="font-medium">not time-weighted</span> (they do not
          neutralise the timing or size of contributions and withdrawals) and
          are <span className="font-medium">not inflation-indexed</span> (they
          are shown in today&apos;s dollars, not adjusted for CPI). For an
          inflation-indexed view, the{" "}
          <Link href="/tax" className="text-primary hover:underline">
            Tax reports
          </Link>{" "}
          apply the ATO capital gains methodology, including the CPI{" "}
          <span className="font-medium">indexation method</span> for assets
          eligible for indexed cost-base treatment (generally acquired before 21
          September 1999).
        </p>
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
                    Where
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
                  const href = row.detailHref;
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
                        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                          <span
                            className={cn(
                              "h-3.5 w-1 shrink-0 rounded-sm",
                              row.swatch
                            )}
                            aria-hidden
                          />
                          <ActivityIcon icon={row.icon} className="h-3.5 w-3.5" />
                          {row.typeLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={row.sourceHref}
                          className="text-xs text-muted-foreground hover:text-primary hover:underline"
                        >
                          {row.source}
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
