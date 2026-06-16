import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";
import { redirect } from "next/navigation";
import { HoldingChartSection } from "@/components/charts/holding-chart-section";
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

  // Get ALL price history (not just 1 year — chart has its own time range selector)
  const prices = await db.price.findMany({
    where: { instrumentId: holding.instrumentId },
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

  // Prepare chart data with OHLCV
  const chartPrices = prices.map((p) => ({
    date: formatDate(p.date, "iso"),
    open: Number(p.open || p.close),
    high: Number(p.high || p.close),
    low: Number(p.low || p.close),
    close: Number(p.close),
    volume: Number(p.volume || 0),
  }));

  // Dividend markers for the chart
  const dividendMarkers = dividends.map((d) => ({
    date: formatDate(d.tradeDate, "iso"),
    amount: Number(d.quantity) * Number(d.price),
  }));

  // Performance stats
  const totalInvested = buys.reduce(
    (s, t) => s + Number(t.quantity) * Number(t.price) + Number(t.brokerage),
    0
  );
  const totalSoldProceeds = sells.reduce(
    (s, t) => s + Number(t.quantity) * Number(t.price) - Number(t.brokerage),
    0
  );
  const totalReturn =
    position.marketValue + totalSoldProceeds + totalDividends - totalInvested;
  const totalReturnPercent =
    totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

  // Holding period
  const firstBuy = buys.length > 0 ? buys[0].tradeDate : null;
  const holdingDays = firstBuy
    ? Math.floor(
        (Date.now() - new Date(firstBuy).getTime()) / (1000 * 60 * 60 * 24)
      )
    : 0;

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
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl font-bold">
            {holding.instrument.code}
          </h1>
          <span className="text-lg text-muted-foreground">
            {holding.instrument.name}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {holding.instrument.marketCode} · {holding.instrument.instrumentType}
          {holding.instrument.sector && ` · ${holding.instrument.sector}`}
          {firstBuy && ` · Held ${holdingDays} days`}
        </p>
      </div>

      {/* Position Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
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
          <p className="text-xs text-muted-foreground">Last Price</p>
          <p className="text-lg font-bold">{formatCurrency(latestPrice)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Market Value</p>
          <p className="text-lg font-bold">
            {formatCurrency(position.marketValue)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Unrealised</p>
          <p
            className={`text-lg font-bold ${position.unrealisedGain < 0 ? "text-destructive" : "text-rosely-teal"}`}
          >
            {formatCurrency(position.unrealisedGain)}
          </p>
          <p
            className={`text-xs ${position.unrealisedGainPercent < 0 ? "text-destructive" : "text-rosely-teal"}`}
          >
            {formatPercent(position.unrealisedGainPercent)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Return</p>
          <p
            className={`text-lg font-bold ${totalReturn < 0 ? "text-destructive" : "text-rosely-teal"}`}
          >
            {formatCurrency(totalReturn)}
          </p>
          <p
            className={`text-xs ${totalReturnPercent < 0 ? "text-destructive" : "text-rosely-teal"}`}
          >
            {formatPercent(totalReturnPercent)}
          </p>
        </div>
      </div>

      {/* Interactive Price Chart with Time Range, MA, Volume */}
      <HoldingChartSection
        allPrices={chartPrices}
        dividends={dividendMarkers}
      />

      {/* Income & Activity */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Cost Base</p>
          <p className="text-lg font-bold">
            {formatCurrency(position.totalCostBase)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Dividends</p>
          <p className="text-lg font-bold">{formatCurrency(totalDividends)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Sale Proceeds</p>
          <p className="text-lg font-bold">
            {formatCurrency(totalSoldProceeds)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Buys</p>
          <p className="text-lg font-bold">{buys.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Sells</p>
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
