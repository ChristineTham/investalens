"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  buildParcels,
  allocateSale,
  type SaleAllocationMethod,
  type ParcelSaleResult,
} from "@/lib/calculations/parcels";

export interface CgtItem {
  instrumentCode: string;
  saleDate: Date;
  quantity: number;
  proceeds: number;
  costBase: number;
  gain: number;
  isLongTerm: boolean;
  discountedGain: number;
  parcelDetails: ParcelSaleResult[];
}

export interface CgtSummary {
  items: CgtItem[];
  shortTermGains: number;
  longTermGains: number;
  totalLosses: number;
  cgtDiscount: number;
  netCapitalGain: number;
  method: SaleAllocationMethod;
  financialYear: string;
}

export async function generateCgtReport(
  portfolioId: string,
  financialYear: number,
  method?: SaleAllocationMethod
): Promise<CgtSummary> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const portfolio = await db.portfolio.findFirst({
    where: { id: portfolioId, userId: session.user.id },
  });
  if (!portfolio) throw new Error("Portfolio not found");

  const allocationMethod = method || (portfolio.saleAllocationMethod as SaleAllocationMethod);
  const fyStart = new Date(financialYear - 1, portfolio.financialYearEnd, 1);
  const fyEnd = new Date(financialYear, portfolio.financialYearEnd, 0);

  // Get all sells in the financial year
  const sells = await db.transaction.findMany({
    where: {
      holding: { portfolioId },
      transactionType: "SELL",
      tradeDate: { gte: fyStart, lte: fyEnd },
    },
    include: {
      holding: {
        include: {
          instrument: true,
          transactions: { orderBy: { tradeDate: "asc" } },
        },
      },
    },
    orderBy: { tradeDate: "asc" },
  });

  const items: CgtItem[] = [];

  for (const sell of sells) {
    // Build parcels from all transactions before this sell
    const priorTx = sell.holding.transactions
      .filter((tx) => tx.tradeDate <= sell.tradeDate && tx.id !== sell.id)
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

    const parcels = buildParcels(priorTx);
    const saleQuantity = Number(sell.quantity);
    const salePrice = Number(sell.price);
    const brokerage = Number(sell.brokerage);

    const parcelResults = allocateSale(
      parcels,
      sell.tradeDate,
      saleQuantity,
      salePrice,
      brokerage,
      allocationMethod,
      portfolio.taxEntityType
    );

    const totalProceeds = saleQuantity * salePrice - brokerage;
    const totalCostBase = parcelResults.reduce((s, r) => s + r.costBase, 0);
    const totalGain = totalProceeds - totalCostBase;
    const totalDiscountedGain = parcelResults.reduce(
      (s, r) => s + r.discountedGain,
      0
    );
    const isLongTerm = parcelResults.every((r) => r.isLongTerm);

    items.push({
      instrumentCode: sell.holding.instrument.code,
      saleDate: sell.tradeDate,
      quantity: saleQuantity,
      proceeds: totalProceeds,
      costBase: totalCostBase,
      gain: totalGain,
      isLongTerm,
      discountedGain: totalDiscountedGain,
      parcelDetails: parcelResults,
    });
  }

  const shortTermGains = items
    .filter((i) => !i.isLongTerm && i.gain > 0)
    .reduce((s, i) => s + i.gain, 0);
  const longTermGains = items
    .filter((i) => i.isLongTerm && i.gain > 0)
    .reduce((s, i) => s + i.gain, 0);
  const totalLosses = items
    .filter((i) => i.gain < 0)
    .reduce((s, i) => s + Math.abs(i.gain), 0);
  const cgtDiscount = items
    .filter((i) => i.isLongTerm && i.gain > 0)
    .reduce((s, i) => s + (i.gain - i.discountedGain), 0);
  const netCapitalGain =
    shortTermGains + longTermGains - cgtDiscount - totalLosses;

  return {
    items,
    shortTermGains,
    longTermGains,
    totalLosses,
    cgtDiscount,
    netCapitalGain: Math.max(0, netCapitalGain),
    method: allocationMethod,
    financialYear: `FY${financialYear - 1}-${String(financialYear).slice(2)}`,
  };
}
