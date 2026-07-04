"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculatePosition } from "@/lib/calculations/position";
import { getLatestPrices } from "@/lib/services/latest-prices";

export interface DiversityItem {
  label: string;
  value: number;
  percent: number;
}

export async function generateDiversityReport(
  portfolioId: string,
  groupBy:
    | "market"
    | "sector"
    | "industry"
    | "type"
    | "country"
    | "custom" = "type",
  /** For groupBy "custom": instrumentId -> category name; unmatched instruments fall into "Unassigned". */
  customAssignments?: Record<string, string>
): Promise<DiversityItem[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const holdings = await db.holding.findMany({
    where: { portfolioId, portfolio: { userId: session.user.id } },
    include: {
      instrument: true,
      transactions: { orderBy: { tradeDate: "asc" } },
    },
  });

  const groupValues: Record<string, number> = {};
  let totalValue = 0;

  const latestPrices = await getLatestPrices(
    holdings.map((h) => h.instrumentId)
  );

  for (const holding of holdings) {
    const currentPrice = latestPrices.get(holding.instrumentId)?.close ?? 0;
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
    if (position.marketValue <= 0) continue;

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
      case "custom":
        key = customAssignments?.[holding.instrumentId] || "Unassigned";
        break;
    }

    groupValues[key] = (groupValues[key] || 0) + position.marketValue;
    totalValue += position.marketValue;
  }

  return Object.entries(groupValues)
    .map(([label, value]) => ({
      label,
      value,
      percent: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}
