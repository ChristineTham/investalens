"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { DateRange } from "@/lib/calculations/performance";

export interface SoldSecurityItem {
  instrumentCode: string;
  marketCode: string;
  tradeDate: Date;
  quantity: number;
  proceeds: number;
  costBase: number;
  gain: number;
  holdingDays: number;
}

export async function generateSoldSecuritiesReport(
  portfolioId: string,
  dateRange: DateRange
): Promise<SoldSecurityItem[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const sells = await db.transaction.findMany({
    where: {
      holding: { portfolioId, portfolio: { userId: session.user.id } },
      transactionType: "SELL",
      tradeDate: { gte: dateRange.from, lte: dateRange.to },
    },
    include: {
      holding: { include: { instrument: true } },
    },
    orderBy: { tradeDate: "desc" },
  });

  return sells.map((tx) => ({
    instrumentCode: tx.holding.instrument.code,
    marketCode: tx.holding.instrument.marketCode,
    tradeDate: tx.tradeDate,
    quantity: Number(tx.quantity),
    proceeds: Number(tx.quantity) * Number(tx.price) - Number(tx.brokerage),
    costBase: 0, // Would need parcel matching for accurate cost
    gain: 0,
    holdingDays: 0,
  }));
}
