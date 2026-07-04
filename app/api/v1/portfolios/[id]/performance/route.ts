import {
  authenticateApiRequest,
  hasScope,
  jsonError,
  jsonSuccess,
} from "@/lib/api/middleware";
import { db } from "@/lib/db";
import {
  calculatePortfolioPerformance,
  calculateHoldingPerformance,
  type DateRange,
} from "@/lib/calculations/performance";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (auth instanceof Response) return auth;
  if (!auth)
    return jsonError("unauthorized", "Invalid or missing API token", 401);
  if (!hasScope(auth.scope, "read"))
    return jsonError("forbidden", "Insufficient scope", 403);

  const { id } = await params;
  const { searchParams } = new URL(request.url);

  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateRange: DateRange = {
    from: from ? new Date(from) : new Date(Date.now() - 365 * 86400000),
    to: to ? new Date(to) : new Date(),
  };

  const portfolio = await db.portfolio.findFirst({
    where: { id, userId: auth.userId },
    include: {
      holdings: {
        include: {
          instrument: true,
          transactions: { orderBy: { tradeDate: "asc" } },
        },
      },
    },
  });

  if (!portfolio) return jsonError("not_found", "Portfolio not found", 404);

  const holdingPerformances = [];

  for (const holding of portfolio.holdings) {
    const prices = await db.price.findMany({
      where: {
        instrumentId: holding.instrumentId,
        date: { gte: dateRange.from, lte: dateRange.to },
      },
      orderBy: { date: "asc" },
    });

    const priceMap = prices.map((p) => ({
      date: p.date,
      close: Number(p.close),
    }));

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

    const perf = calculateHoldingPerformance(
      txData,
      priceMap,
      dateRange
    );
    perf.instrumentCode = holding.instrument.code;
    perf.holdingId = holding.id;
    holdingPerformances.push(perf);
  }

  const portfolioPerformance = calculatePortfolioPerformance(
    holdingPerformances
  );

  return jsonSuccess({
    portfolio: portfolioPerformance,
    holdings: holdingPerformances,
    dateRange,
  });
}
