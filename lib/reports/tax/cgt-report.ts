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
import {
  assessableUnder2027,
  minimumTaxTopUp,
  TRANSITION_DATE,
  type TransitionMethod,
} from "@/lib/calculations/cgt-2027";
import { marginalRateOnGain, taxOnGain } from "@/lib/calculations/income-tax";

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

// ─── Proposed 2027 regime projection ─────────────────────────────────────────

export interface Cgt2027ProjectionItem {
  instrumentCode: string;
  saleDate: Date;
  quantity: number;
  proceeds: number;
  costBase: number;
  /** True when the disposal is on/after 1 July 2027 (new regime applies). */
  underNewRegime: boolean;
  preAssessable: number;
  postAssessable: number;
  totalAssessable: number;
  methodUsed: string;
}

export interface Cgt2027ProjectionSummary {
  /** True when any disposal in the year falls under the proposed regime. */
  applies: boolean;
  items: Cgt2027ProjectionItem[];
  preAssessable: number;
  postAssessable: number;
  totalAssessable: number;
  /** Post-2027 portion subject to the 30% minimum tax. */
  minTaxCapitalGain: number;
  marginalRateOnGain: number;
  minTaxTopUp: number;
  /** Estimated marginal tax on the proposed assessable gains. */
  estTaxOnGains: number;
  /** estTaxOnGains + minTaxTopUp. */
  estTotalProposedTax: number;
  otherIncome: number;
  incomeSupportRecipient: boolean;
  transitionMethod: string;
  financialYear: string;
}

/**
 * Project realised disposals under the proposed 1 July 2027 CGT regime.
 * Disposals before 1 July 2027 are shown under current law (they are unaffected);
 * disposals on/after that date use the indexation + minimum-tax engine. This is
 * a projection of proposed law that is not yet enacted.
 */
export async function generateCgt2027Projection(
  portfolioId: string,
  financialYear: number,
  otherIncome: number,
  method?: SaleAllocationMethod
): Promise<Cgt2027ProjectionSummary> {
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
  const cpi = await loadCpiMap();
  const transitionMethod = portfolio.cgtTransitionMethod as TransitionMethod;

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

  const items: Cgt2027ProjectionItem[] = [];

  for (const sell of sells) {
    if (isIncomeAsset(sell.holding.instrument)) continue;

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

    const underNewRegime =
      sell.tradeDate.getTime() >= TRANSITION_DATE.getTime();

    let pre = 0;
    let post = 0;
    const methods = new Set<string>();
    for (const r of parcelResults) {
      if (underNewRegime) {
        const res = assessableUnder2027({
          acquisitionDate: r.parcel.purchaseDate,
          disposalDate: sell.tradeDate,
          costBase: r.costBase,
          proceeds: r.proceeds,
          taxEntityType: portfolio.taxEntityType,
          isForeignResident: portfolio.isForeignResident,
          transitionMethod,
          cpi,
        });
        pre += res.preAssessable;
        post += res.postAssessable;
        methods.add(res.methodUsed);
      } else {
        pre += r.assessableGain;
        methods.add("current");
      }
    }

    items.push({
      instrumentCode: sell.holding.instrument.code,
      saleDate: sell.tradeDate,
      quantity: saleQuantity,
      proceeds: saleQuantity * salePrice - brokerage,
      costBase: parcelResults.reduce((s, r) => s + r.costBase, 0),
      underNewRegime,
      preAssessable: pre,
      postAssessable: post,
      totalAssessable: pre + post,
      methodUsed: [...methods].join("/") || "current",
    });
  }

  const preAssessable = items.reduce((s, i) => s + i.preAssessable, 0);
  const postAssessable = items.reduce((s, i) => s + i.postAssessable, 0);
  const totalAssessable = preAssessable + postAssessable;
  const minTaxCapitalGain = Math.max(0, postAssessable);

  // The minimum-tax gain sits on top of other income and the pre-2027 gains.
  const baseIncome = Math.max(0, otherIncome) + Math.max(0, preAssessable);
  const rate = marginalRateOnGain(baseIncome, minTaxCapitalGain);
  const minTaxTopUp = portfolio.incomeSupportRecipient
    ? 0
    : minimumTaxTopUp(minTaxCapitalGain, rate);
  const estTaxOnGains = taxOnGain(
    Math.max(0, otherIncome),
    Math.max(0, totalAssessable)
  );

  return {
    applies: items.some((i) => i.underNewRegime),
    items,
    preAssessable,
    postAssessable,
    totalAssessable,
    minTaxCapitalGain,
    marginalRateOnGain: rate,
    minTaxTopUp,
    estTaxOnGains,
    estTotalProposedTax: estTaxOnGains + minTaxTopUp,
    otherIncome: Math.max(0, otherIncome),
    incomeSupportRecipient: portfolio.incomeSupportRecipient,
    transitionMethod,
    financialYear: `FY${financialYear - 1}-${String(financialYear).slice(2)}`,
  };
}
