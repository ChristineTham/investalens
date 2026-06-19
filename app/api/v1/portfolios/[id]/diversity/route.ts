import {
  authenticateApiRequest,
  hasScope,
  jsonError,
  jsonSuccess,
} from "@/lib/api/middleware";
import { db } from "@/lib/db";
import { calculatePosition } from "@/lib/calculations/position";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth)
    return jsonError("unauthorized", "Invalid or missing API token", 401);
  if (!hasScope(auth.scope, "read"))
    return jsonError("forbidden", "Insufficient scope", 403);

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const groupBy = searchParams.get("groupBy") || "type";

  const portfolio = await db.portfolio.findFirst({
    where: { id, userId: auth.userId },
  });
  if (!portfolio) return jsonError("not_found", "Portfolio not found", 404);

  const holdings = await db.holding.findMany({
    where: { portfolioId: id },
    include: {
      instrument: true,
      transactions: { orderBy: { tradeDate: "asc" } },
    },
  });

  const groupValues: Record<string, number> = {};
  let totalValue = 0;

  for (const holding of holdings) {
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
    const marketValue = position.marketValue;
    if (marketValue <= 0) continue;

    const groupKeyMap: Record<string, string> = {
      type: holding.instrument.instrumentType,
      market: holding.instrument.marketCode,
      sector: holding.instrument.sector || "Unknown",
      industry: holding.instrument.industry || "Unknown",
      country: holding.instrument.country || "Unknown",
    };

    const key = groupKeyMap[groupBy] || holding.instrument.instrumentType;
    groupValues[key] = (groupValues[key] || 0) + marketValue;
    totalValue += marketValue;
  }

  const diversity = Object.entries(groupValues).map(([label, value]) => ({
    label,
    value,
    percent: totalValue > 0 ? (value / totalValue) * 100 : 0,
  }));

  diversity.sort((a, b) => b.value - a.value);

  return jsonSuccess({ groupBy, totalValue, items: diversity });
}
