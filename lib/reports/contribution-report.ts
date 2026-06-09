"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  calculateHoldingPerformance,
  type DateRange,
} from "@/lib/calculations/performance";

export interface ContributionItem {
  holdingId: string;
  instrumentCode: string;
  totalReturn: number;
  contributionPercent: number;
}

export async function generateContributionReport(
  portfolioId: string,
  dateRange: DateRange
): Promise<ContributionItem[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const portfolio = await db.portfolio.findFirst({
    where: { id: portfolioId, userId: session.user.id },
    include: {
      holdings: {
        include: {
          instrument: true,
          transactions: { orderBy: { tradeDate: "asc" } },
        },
      },
    },
  });

  if (!portfolio) throw new Error("Portfolio not found");

  const items: ContributionItem[] = [];
  let totalPortfolioReturn = 0;

  for (const holding of portfolio.holdings) {
    const prices = await db.price.findMany({
      where: {
        instrumentId: holding.instrumentId,
        date: { gte: dateRange.from, lte: dateRange.to },
      },
      orderBy: { date: "asc" },
    });

    const priceData = prices.map((p) => ({
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

    const perf = calculateHoldingPerformance(txData, priceData, dateRange);
    totalPortfolioReturn += perf.totalReturn;

    items.push({
      holdingId: holding.id,
      instrumentCode: holding.instrument.code,
      totalReturn: perf.totalReturn,
      contributionPercent: 0,
    });
  }

  // Calculate contribution %
  return items.map((item) => ({
    ...item,
    contributionPercent:
      totalPortfolioReturn !== 0
        ? (item.totalReturn / totalPortfolioReturn) * 100
        : 0,
  }));
}
