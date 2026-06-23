"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  buildParcels,
  allocateSale,
  type SaleAllocationMethod,
  type ParcelSaleResult,
} from "@/lib/calculations/parcels";
import { isIncomeAsset } from "@/lib/calculations/asset-tax-class";
import { loadCpiMap } from "@/lib/calculations/indexation";

export interface CgtItem {
  instrumentCode: string;
  saleDate: Date;
  quantity: number;
  proceeds: number;
  costBase: number;
  indexedCostBase: number;
  gain: number;
  isLongTerm: boolean;
  discountedGain: number;
  /** Assessable gain after the chosen method (discount or indexation). */
  assessableGain: number;
  /** Relief from the 50% CGT discount method. */
  cgtDiscount: number;
  /** Relief from the CPI indexation method (pre-1999 assets). */
  indexationRelief: number;
  methodUsed: "discount" | "indexation" | "mixed";
  parcelDetails: ParcelSaleResult[];
}

export interface CgtSummary {
  items: CgtItem[];
  shortTermGains: number;
  longTermGains: number;
  totalLosses: number;
  cgtDiscount: number;
  indexationRelief: number;
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

  const allocationMethod =
    method || (portfolio.saleAllocationMethod as SaleAllocationMethod);
  const fyStart = new Date(financialYear - 1, portfolio.financialYearEnd, 1);
  const fyEnd = new Date(financialYear, portfolio.financialYearEnd, 0);

  // CPI series for the current-law indexation method (pre-1999 assets).
  const cpi = await loadCpiMap();

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
    // Traditional bonds are exempt from CGT — their discount/premium is ordinary
    // income and is reported in the Taxable Income report instead.
    if (isIncomeAsset(sell.holding.instrument)) continue;

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
      portfolio.taxEntityType,
      cpi
    );

    const totalProceeds = saleQuantity * salePrice - brokerage;
    const totalCostBase = parcelResults.reduce((s, r) => s + r.costBase, 0);
    const totalIndexedCostBase = parcelResults.reduce(
      (s, r) => s + r.indexedCostBase,
      0
    );
    const totalGain = totalProceeds - totalCostBase;
    const totalDiscountedGain = parcelResults.reduce(
      (s, r) => s + r.discountedGain,
      0
    );
    const totalAssessableGain = parcelResults.reduce(
      (s, r) => s + r.assessableGain,
      0
    );
    const isLongTerm = parcelResults.every((r) => r.isLongTerm);

    // Split the relief into discount vs indexation buckets (gains only).
    let cgtDiscount = 0;
    let indexationRelief = 0;
    for (const r of parcelResults) {
      if (r.gain <= 0) continue;
      if (r.methodUsed === "indexation") {
        indexationRelief += r.gain - r.indexationGain;
      } else {
        cgtDiscount += r.gain - r.discountedGain;
      }
    }

    const methods = new Set(
      parcelResults.filter((r) => r.gain > 0).map((r) => r.methodUsed)
    );
    const methodUsed: CgtItem["methodUsed"] =
      methods.size === 0
        ? "discount"
        : methods.size > 1
          ? "mixed"
          : ([...methods][0] as "discount" | "indexation");

    items.push({
      instrumentCode: sell.holding.instrument.code,
      saleDate: sell.tradeDate,
      quantity: saleQuantity,
      proceeds: totalProceeds,
      costBase: totalCostBase,
      indexedCostBase: totalIndexedCostBase,
      gain: totalGain,
      isLongTerm,
      discountedGain: totalDiscountedGain,
      assessableGain: totalAssessableGain,
      cgtDiscount,
      indexationRelief,
      methodUsed,
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
  const cgtDiscount = items.reduce((s, i) => s + i.cgtDiscount, 0);
  const indexationRelief = items.reduce((s, i) => s + i.indexationRelief, 0);
  const netCapitalGain =
    shortTermGains + longTermGains - cgtDiscount - indexationRelief - totalLosses;

  return {
    items,
    shortTermGains,
    longTermGains,
    totalLosses,
    cgtDiscount,
    indexationRelief,
    netCapitalGain: Math.max(0, netCapitalGain),
    method: allocationMethod,
    financialYear: `FY${financialYear - 1}-${String(financialYear).slice(2)}`,
  };
}
