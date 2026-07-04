"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  buildParcels,
  type SaleAllocationMethod,
} from "@/lib/calculations/parcels";
import { isIncomeAsset } from "@/lib/calculations/asset-tax-class";
import { getLatestPrices } from "@/lib/services/latest-prices";
import {
  currentLawIndexationFactor,
  loadCpiMap,
} from "@/lib/calculations/indexation";

export interface UnrealisedCgtItem {
  instrumentCode: string;
  quantity: number;
  costBase: number;
  indexedCostBase: number;
  marketValue: number;
  unrealisedGain: number;
  isLongTerm: boolean;
  discountedGain: number;
  indexationGain: number;
  assessableGain: number;
  methodUsed: "discount" | "indexation";
}

export interface UnrealisedCgtSummary {
  items: UnrealisedCgtItem[];
  shortTermGains: number;
  longTermGains: number;
  unrealisedLosses: number;
  cgtDiscount: number;
  indexationRelief: number;
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

  const cpi = await loadCpiMap();
  const latestPrices = await getLatestPrices(
    holdings.map((h) => h.instrumentId)
  );
  const items: UnrealisedCgtItem[] = [];
  const today = new Date();

  for (const holding of holdings) {
    // Traditional bonds are exempt from CGT — skip them here.
    if (isIncomeAsset(holding.instrument)) continue;

    const txData = holding.transactions.map((tx) => ({
      id: tx.id,
      transactionType: tx.transactionType,
      tradeDate: tx.tradeDate,
      quantity: tx.quantity,
      price: tx.price,
      brokerage: tx.brokerage,
      exchangeRate: tx.exchangeRate,
      currency: tx.currency,
      comments: tx.comments,
    }));

    const parcels = buildParcels(
      txData,
      portfolio.saleAllocationMethod as SaleAllocationMethod,
      portfolio.taxEntityType
    );
    const activeParcels = parcels.filter((p) => p.remainingQuantity > 0);
    if (activeParcels.length === 0) continue;

    const currentPrice = latestPrices.get(holding.instrumentId)?.close ?? 0;
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
      unrealisedGain > 0 ? unrealisedGain * (1 - discountRate) : unrealisedGain;

    // Current-law indexation method (pre-1999 parcels): index each parcel's
    // cost base to today, then use whichever method gives the lower gain.
    const indexedCostBase = activeParcels.reduce((s, p) => {
      const base = p.remainingQuantity * p.costPerUnit;
      const factor = currentLawIndexationFactor(p.purchaseDate, today, cpi);
      return s + (factor != null && factor > 1 ? base * factor : base);
    }, 0);
    const indexationGain =
      unrealisedGain > 0
        ? Math.max(0, marketValue - indexedCostBase)
        : unrealisedGain;

    let methodUsed: "discount" | "indexation" = "discount";
    let assessableGain = discountedGain;
    if (unrealisedGain > 0 && indexationGain < discountedGain) {
      methodUsed = "indexation";
      assessableGain = indexationGain;
    }

    items.push({
      instrumentCode: holding.instrument.code,
      quantity: totalQuantity,
      costBase: totalCostBase,
      indexedCostBase,
      marketValue,
      unrealisedGain,
      isLongTerm,
      discountedGain,
      indexationGain,
      assessableGain,
      methodUsed,
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
    .filter((i) => i.unrealisedGain > 0 && i.methodUsed === "discount")
    .reduce((s, i) => s + (i.unrealisedGain - i.assessableGain), 0);
  const indexationRelief = items
    .filter((i) => i.unrealisedGain > 0 && i.methodUsed === "indexation")
    .reduce((s, i) => s + (i.unrealisedGain - i.assessableGain), 0);
  const netHypotheticalGain = Math.max(
    0,
    shortTermGains +
      longTermGains -
      cgtDiscount -
      indexationRelief -
      unrealisedLosses
  );

  return {
    items,
    shortTermGains,
    longTermGains,
    unrealisedLosses,
    cgtDiscount,
    indexationRelief,
    netHypotheticalGain,
  };
}
