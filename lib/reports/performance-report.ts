"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  calculateHoldingPerformance,
  calculatePortfolioPerformance,
  type DateRange,
  type HoldingPerformance,
  type PortfolioPerformance,
} from "@/lib/calculations/performance";

export interface PerformanceReportInput {
  portfolioId: string;
  dateRange: DateRange;
  groupBy?: "market" | "sector" | "industry" | "type" | "country" | "none";
  openOnly?: boolean;
}

export interface PerformanceReportResult {
  portfolio: PortfolioPerformance;
  groups: Record<string, HoldingPerformance[]>;
}

export async function generatePerformanceReport(
  input: PerformanceReportInput
): Promise<PerformanceReportResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const portfolio = await db.portfolio.findFirst({
    where: { id: input.portfolioId, userId: session.user.id },
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

  const holdingPerformances: HoldingPerformance[] = [];

  for (const holding of portfolio.holdings) {
    // Get prices for this instrument
    const prices = await db.price.findMany({
      where: {
        instrumentId: holding.instrumentId,
        date: { gte: input.dateRange.from, lte: input.dateRange.to },
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
      frankedAmount: tx.frankedAmount,
      unfrankedAmount: tx.unfrankedAmount,
      frankingCredits: tx.frankingCredits,
    }));

    const perf = calculateHoldingPerformance(
      txData,
      priceData,
      input.dateRange
    );
    perf.holdingId = holding.id;
    perf.instrumentCode = holding.instrument.code;

    // Skip zero-position holdings if openOnly
    if (input.openOnly && perf.marketValue === 0 && perf.costBase === 0) {
      continue;
    }

    holdingPerformances.push(perf);
  }

  const portfolioPerf = calculatePortfolioPerformance(holdingPerformances);

  // Group results
  const groups: Record<string, HoldingPerformance[]> = {};
  const groupBy = input.groupBy || "none";

  if (groupBy === "none") {
    groups["All"] = portfolioPerf.holdings;
  } else {
    for (const hp of portfolioPerf.holdings) {
      const holding = portfolio.holdings.find((h) => h.id === hp.holdingId);
      if (!holding) continue;

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
        default:
          key = "All";
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(hp);
    }
  }

  return { portfolio: portfolioPerf, groups };
}
