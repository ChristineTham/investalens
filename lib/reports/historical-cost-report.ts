"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculatePosition } from "@/lib/calculations/position";
import type { DateRange } from "@/lib/calculations/performance";

export interface HistoricalCostItem {
  instrumentCode: string;
  openingCostBase: number;
  purchases: number;
  sales: number;
  adjustments: number;
  closingCostBase: number;
}

export async function generateHistoricalCostReport(
  portfolioId: string,
  dateRange: DateRange
): Promise<HistoricalCostItem[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const holdings = await db.holding.findMany({
    where: { portfolioId, portfolio: { userId: session.user.id } },
    include: {
      instrument: true,
      transactions: { orderBy: { tradeDate: "asc" } },
    },
  });

  const items: HistoricalCostItem[] = [];

  for (const holding of holdings) {
    const txBefore = holding.transactions
      .filter((tx) => tx.tradeDate < dateRange.from)
      .map((tx) => ({
        id: tx.id,
        transactionType: tx.transactionType,
        tradeDate: tx.tradeDate,
        quantity: tx.quantity,
        price: tx.price,
        brokerage: tx.brokerage,
        exchangeRate: tx.exchangeRate,
        currency: tx.currency,
      }));

    const txDuring = holding.transactions.filter(
      (tx) => tx.tradeDate >= dateRange.from && tx.tradeDate <= dateRange.to
    );

    const openingPosition = calculatePosition(txBefore, 0);

    let purchases = 0;
    let sales = 0;
    let adjustments = 0;

    for (const tx of txDuring) {
      const amount = Number(tx.quantity) * Number(tx.price);
      switch (tx.transactionType) {
        case "BUY":
        case "TRANSFER_IN":
          purchases += amount + Number(tx.brokerage);
          break;
        case "SELL":
        case "TRANSFER_OUT":
          sales += amount;
          break;
        case "RETURN_OF_CAPITAL":
          adjustments -= amount;
          break;
      }
    }

    const closingCostBase =
      openingPosition.totalCostBase + purchases - sales + adjustments;

    items.push({
      instrumentCode: holding.instrument.code,
      openingCostBase: openingPosition.totalCostBase,
      purchases,
      sales,
      adjustments,
      closingCostBase: Math.max(0, closingCostBase),
    });
  }

  return items;
}
