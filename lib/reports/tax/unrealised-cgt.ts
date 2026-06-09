"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildParcels, type SaleAllocationMethod } from "@/lib/calculations/parcels";

export interface UnrealisedCgtItem {
  instrumentCode: string;
  quantity: number;
  costBase: number;
  marketValue: number;
  unrealisedGain: number;
  isLongTerm: boolean;
  discountedGain: number;
}

export interface UnrealisedCgtSummary {
  items: UnrealisedCgtItem[];
  shortTermGains: number;
  longTermGains: number;
  unrealisedLosses: number;
  cgtDiscount: number;
  netHypotheticalGain: number;
}

export async function generateUnrealisedCgtReport(
  portfolioId: string
): Promise<UnrealisedCgtSummary> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const portfolio = await db.portfolio.findFirst({
    where: { id: portfolioId, userId: session.user.id },
  });
  if (!portfolio) throw new Error("Portfolio not found");

  const holdings = await db.holding.findMany({
    where: { portfolioId },
    include: {
      instrument: true,
      transactions: { orderBy: { tradeDate: "asc" } },
    },
  });

  const items: UnrealisedCgtItem[] = [];
  const today = new Date();

  for (const holding of holdings) {
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

    const parcels = buildParcels(txData);
    const activeParcels = parcels.filter((p) => p.remainingQuantity > 0);
    if (activeParcels.length === 0) continue;

    // Get latest price
    const latestPrice = await db.price.findFirst({
      where: { instrumentId: holding.instrumentId },
      orderBy: { date: "desc" },
    });
    const currentPrice = latestPrice ? Number(latestPrice.close) : 0;
    if (currentPrice === 0) continue;

    const totalQuantity = activeParcels.reduce(
      (s, p) => s + p.remainingQuantity,
      0
    );
    const totalCostBase = activeParcels.reduce(
      (s, p) => s + p.remainingQuantity * p.costPerUnit,
      0
    );
    const marketValue = totalQuantity * currentPrice;
    const unrealisedGain = marketValue - totalCostBase;

    // Determine holding period (weighted average)
    const weightedDays = activeParcels.reduce((s, p) => {
      const days = Math.floor(
        (today.getTime() - p.purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return s + days * p.remainingQuantity;
    }, 0);
    const avgDays = totalQuantity > 0 ? weightedDays / totalQuantity : 0;
    const isLongTerm = avgDays >= 365;

    let discountRate = 0;
    if (isLongTerm && unrealisedGain > 0) {
      switch (portfolio.taxEntityType) {
        case "individual":
        case "trust":
          discountRate = 0.5;
          break;
        case "smsf":
          discountRate = 1 / 3;
          break;
      }
    }

    const discountedGain =
      unrealisedGain > 0
        ? unrealisedGain * (1 - discountRate)
        : unrealisedGain;

    items.push({
      instrumentCode: holding.instrument.code,
      quantity: totalQuantity,
      costBase: totalCostBase,
      marketValue,
      unrealisedGain,
      isLongTerm,
      discountedGain,
    });
  }

  const shortTermGains = items
    .filter((i) => !i.isLongTerm && i.unrealisedGain > 0)
    .reduce((s, i) => s + i.unrealisedGain, 0);
  const longTermGains = items
    .filter((i) => i.isLongTerm && i.unrealisedGain > 0)
    .reduce((s, i) => s + i.unrealisedGain, 0);
  const unrealisedLosses = items
    .filter((i) => i.unrealisedGain < 0)
    .reduce((s, i) => s + Math.abs(i.unrealisedGain), 0);
  const cgtDiscount = items
    .filter((i) => i.isLongTerm && i.unrealisedGain > 0)
    .reduce((s, i) => s + (i.unrealisedGain - i.discountedGain), 0);
  const netHypotheticalGain = Math.max(
    0,
    shortTermGains + longTermGains - cgtDiscount - unrealisedLosses
  );

  return {
    items,
    shortTermGains,
    longTermGains,
    unrealisedLosses,
    cgtDiscount,
    netHypotheticalGain,
  };
}
