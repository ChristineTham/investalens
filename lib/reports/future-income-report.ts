"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export interface FutureIncomeItem {
  instrumentCode: string;
  holdingId: string;
  estimatedAmount: number;
  frequency: string;
  status: "estimated" | "announced" | "pending" | "paid";
  nextPaymentDate: Date | null;
}

export async function generateFutureIncomeReport(
  portfolioId: string
): Promise<FutureIncomeItem[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const holdings = await db.holding.findMany({
    where: { portfolioId, portfolio: { userId: session.user.id } },
    include: {
      instrument: true,
      transactions: {
        where: { transactionType: { in: ["DIVIDEND", "INTEREST", "COUPON"] } },
        orderBy: { tradeDate: "desc" },
        take: 4,
      },
    },
  });

  const items: FutureIncomeItem[] = [];

  for (const holding of holdings) {
    const dividends = holding.transactions;
    if (dividends.length === 0) continue;

    // Estimate frequency from gaps between payments
    let frequency = "annual";
    if (dividends.length >= 2) {
      const gap =
        (dividends[0].tradeDate.getTime() - dividends[1].tradeDate.getTime()) /
        (1000 * 60 * 60 * 24);
      if (gap < 45) frequency = "monthly";
      else if (gap < 100) frequency = "quarterly";
      else if (gap < 200) frequency = "semi_annual";
    }

    const lastDividend = dividends[0];
    const amount = Number(lastDividend.quantity) * Number(lastDividend.price);

    // Estimate next payment
    const freqDays: Record<string, number> = {
      monthly: 30,
      quarterly: 90,
      semi_annual: 182,
      annual: 365,
    };
    const nextDate = new Date(lastDividend.tradeDate);
    nextDate.setDate(nextDate.getDate() + (freqDays[frequency] || 365));

    items.push({
      instrumentCode: holding.instrument.code,
      holdingId: holding.id,
      estimatedAmount: amount,
      frequency,
      status: nextDate > new Date() ? "estimated" : "paid",
      nextPaymentDate: nextDate > new Date() ? nextDate : null,
    });
  }

  return items;
}
