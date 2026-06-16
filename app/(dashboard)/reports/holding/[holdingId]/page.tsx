import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";
import { redirect } from "next/navigation";
import { PortfolioGrowthChart } from "@/components/charts/portfolio-growth";
import { calculatePosition } from "@/lib/calculations/position";
import Link from "next/link";

export default async function HoldingDetailPage({
  params,
}: {
  params: Promise<{ holdingId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { holdingId } = await params;

  const holding = await db.holding.findFirst({
    where: {
      id: holdingId,
      portfolio: { userId: session.user.id },
    },
    include: {
      instrument: true,
      portfolio: { select: { id: true, name: true } },
      transactions: { orderBy: { tradeDate: "asc" } },
    },
  });

  if (!holding) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-bold">Holding Not Found</h1>
        <p className="text-muted-foreground">
          This holding does not exist or you don&apos;t have access.
        </p>
      </div>
    );
  }

  // Get price history
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const prices = await db.price.findMany({
    where: {
      instrumentId: holding.instrumentId,
      date: { gte: oneYearAgo },
    },
    orderBy: { date: "asc" },
  });

  // Calculate current position
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

  const latestPrice = prices.length > 0 ? Number(prices[prices.length - 1].close) : 0;
  const position = calculatePosition(txData, latestPrice);

  // Prepare chart data
  const chartData = prices.map((p) => ({
    date: formatDate(p.date, "iso"),
    portfolio: Number(p.close),
  }));

  // Transaction summary
  const buys = holding.transactions.filter((t) => t.transactionType === "BUY");
  const sells = holding.transactions.filter((t) => t.transactionType === "SELL");
  const dividends = holding.transactions.filter(
    (t) => t.transactionType === "DIVIDEND"
  );
  const totalDividends = dividends.reduce(
    (s, t) => s + Number(t.quantity) * Number(t.price),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/reports/performance" className="hover:underline">
            Performance Report
          </Link>{" "}
          → {holding.portfolio.name}
        </p>
        <h1 className="font-serif text-2xl font-bold">
          {holding.instrument.code} — {holding.instrument.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {holding.instrument.marketCode} · {holding.instrument.instrumentType}
          {holding.instrument.sector && ` · ${holding.instrument.sector}`}
        </p>
      </div>

      {/* Position Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Quantity</p>
          <p className="text-lg font-bold">
            {position.quantity.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Avg Cost</p>
          <p className="text-lg font-bold">
            {formatCurrency(position.averageCost)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Market Price</p>
          <p className="text-lg font-bold">{formatCurrency(latestPrice)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Market Value</p>
          <p className="text-lg font-bold">
            {formatCurrency(position.marketValue)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Unrealised Gain</p>
          <p
            className={`text-lg font-bold ${position.unrealisedGain < 0 ? "text-destructive" : "text-rosely-teal"}`}
          >
            {formatCurrency(position.unrealisedGain)} (
            {formatPercent(position.unrealisedGainPercent)})
          </p>
        </div>
      </div>

      {/* Price Chart */}
      <div className="rounded-lg border border-border p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            Price History (1 Year)
          </h2>
          <span className="text-xs text-muted-foreground">
            {prices.length} data points
          </span>
        </div>
        {chartData.length > 0 ? (
          <PortfolioGrowthChart data={chartData} showBenchmark={false} />
        ) : (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            <p>No price data available. Run the price cron job to populate.</p>
          </div>
        )}
      </div>

      {/* Income & Activity Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Cost Base</p>
          <p className="text-lg font-bold">
            {formatCurrency(position.totalCostBase)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Dividends Received</p>
          <p className="text-lg font-bold">{formatCurrency(totalDividends)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Buy Transactions</p>
          <p className="text-lg font-bold">{buys.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Sell Transactions</p>
          <p className="text-lg font-bold">{sells.length}</p>
        </div>
      </div>

      {/* Transaction History */}
      <div>
        <h2 className="mb-3 text-lg font-medium">Transaction History</h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Price
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Brokerage
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {holding.transactions
                .slice()
                .reverse()
                .map((tx) => (
                  <tr key={tx.id} className="hover:bg-accent/50">
                    <td className="px-4 py-3 text-sm">
                      {formatDate(tx.tradeDate)}
                    </td>
                    <td className="px-4 py-3 text-sm">{tx.transactionType}</td>
                    <td className="px-4 py-3 text-right text-sm">
                      {Number(tx.quantity).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {formatCurrency(Number(tx.price))}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                      {formatCurrency(Number(tx.brokerage))}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {formatCurrency(
                        Number(tx.quantity) * Number(tx.price)
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
