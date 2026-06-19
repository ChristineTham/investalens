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
  growthHistory: Array<{ date: string; portfolio: number }>;
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
  const holdingsWithPrices: Array<{
    holdingId: string;
    instrumentCode: string;
    transactions: typeof portfolio.holdings[0]["transactions"];
    prices: Array<{ date: Date; close: number }>;
  }> = [];

  const priceDatesSet = new Set<string>();

  for (const holding of portfolio.holdings) {
    // Get prices for this instrument up to end date to support historical holdings purchased before start date
    const prices = await db.price.findMany({
      where: {
        instrumentId: holding.instrumentId,
        date: { lte: input.dateRange.to },
      },
      orderBy: { date: "asc" },
    });

    const priceData = prices.map((p) => ({
      date: p.date,
      close: Number(p.close),
    }));

    holdingsWithPrices.push({
      holdingId: holding.id,
      instrumentCode: holding.instrument.code,
      transactions: holding.transactions,
      prices: priceData,
    });

    // Collect unique price dates within the date range
    prices.forEach((p) => {
      if (p.date >= input.dateRange.from && p.date <= input.dateRange.to) {
        priceDatesSet.add(p.date.toISOString().split("T")[0]);
      }
    });

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

  // Calculate actual growth history
  const sortedPriceDates = Array.from(priceDatesSet).sort();
  const growthHistory: Array<{ date: string; portfolio: number }> = [];

  for (const dateStr of sortedPriceDates) {
    const targetDate = new Date(dateStr);
    let totalPortfolioValue = 0;

    for (const h of holdingsWithPrices) {
      // Calculate quantity on targetDate
      let qty = 0;
      for (const tx of h.transactions) {
        if (tx.tradeDate <= targetDate) {
          const q = Number(tx.quantity);
          if (tx.transactionType === "BUY") {
            qty += q;
          } else if (tx.transactionType === "SELL") {
            qty -= q;
          } else if (tx.transactionType === "SPLIT") {
            qty *= q;
          }
        }
      }

      // Find price on or before targetDate
      const sortedPricesDesc = [...h.prices]
        .filter((p) => p.date <= targetDate)
        .sort((a, b) => b.date.getTime() - a.date.getTime());
      
      const price = sortedPricesDesc[0]?.close || 0;
      totalPortfolioValue += qty * price;
    }

    const formattedDate = targetDate.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    growthHistory.push({
      date: formattedDate,
      portfolio: totalPortfolioValue,
    });
  }

  // Fallback if no dates
  if (growthHistory.length === 0) {
    const formattedNow = new Date().toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    growthHistory.push({
      date: formattedNow,
      portfolio: portfolioPerf.totalMarketValue,
    });
  }

  return { portfolio: portfolioPerf, groups, growthHistory };
}
