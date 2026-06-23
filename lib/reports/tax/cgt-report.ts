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
  applyLossOrdering,
  cgtDiscountRate,
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
  /** Pre-2027 gross gain/loss (before the 50% discount and loss netting). */
  preGain: number;
  /** Post-2027 indexed gain (≥0) or nominal loss (<0). */
  postGain: number;
  methodUsed: string;
}

export interface Cgt2027ProjectionSummary {
  /** True when any disposal in the year falls under the proposed regime. */
  applies: boolean;
  items: Cgt2027ProjectionItem[];
  /** Discountable pre-2027 gross gains (before discount/loss netting). */
  discountGains: number;
  /** Non-discountable pre-2027 gross gains. */
  nonDiscountGains: number;
  /** Post-2027 indexed gains. */
  indexedGains: number;
  /** Total nominal capital losses. */
  capitalLosses: number;
  /** Losses applied against gains this year (discount gains first). */
  lossesApplied: number;
  /** Unused losses carried forward. */
  carryForwardLoss: number;
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
  let discountGains = 0;
  let nonDiscountGains = 0;
  let indexedGains = 0;
  let capitalLosses = 0;

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

    let preGain = 0;
    let postGain = 0;
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
        preGain += res.preGrossGain;
        postGain += res.postAssessable;
        methods.add(res.methodUsed);

        // Pool gains/losses for the prescribed loss ordering.
        const heldDaysTo2027 =
          (TRANSITION_DATE.getTime() - r.parcel.purchaseDate.getTime()) /
          (1000 * 60 * 60 * 24);
        const discountable =
          heldDaysTo2027 >= 365 &&
          cgtDiscountRate(
            portfolio.taxEntityType,
            portfolio.isForeignResident
          ) > 0;
        if (res.preGrossGain > 0) {
          if (discountable) discountGains += res.preGrossGain;
          else nonDiscountGains += res.preGrossGain;
        } else {
          capitalLosses += -res.preGrossGain;
        }
        if (res.postAssessable > 0) indexedGains += res.postAssessable;
        else capitalLosses += -res.postAssessable;
      } else {
        // Pre-1 Jul 2027 disposal — current law (not expected in projection
        // years, where every disposal is post-2027). Pooled as a discount gain.
        preGain += r.assessableGain;
        methods.add("current");
        if (r.gain > 0) discountGains += r.gain;
        else capitalLosses += -r.gain;
      }
    }

    items.push({
      instrumentCode: sell.holding.instrument.code,
      saleDate: sell.tradeDate,
      quantity: saleQuantity,
      proceeds: saleQuantity * salePrice - brokerage,
      costBase: parcelResults.reduce((s, r) => s + r.costBase, 0),
      underNewRegime,
      preGain,
      postGain,
      methodUsed: [...methods].join("/") || "current",
    });
  }

  // Prescribed loss ordering (Bill): capital losses apply against discount
  // (deferred) gains first, then indexed gains; the 50% discount is applied to
  // the remaining discountable gains afterwards.
  const discountRate = cgtDiscountRate(
    portfolio.taxEntityType,
    portfolio.isForeignResident
  );
  const netted = applyLossOrdering({
    discountGains,
    nonDiscountGains,
    indexedGains,
    losses: capitalLosses,
    discountRate,
  });
  const preAssessable = netted.preAssessable;
  const postAssessable = netted.postAssessable; // minimum-tax capital gain
  const totalAssessable = netted.totalAssessable;
  const lossesApplied = netted.lossesApplied;
  const carryForwardLoss = netted.carryForwardLoss;
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
    discountGains,
    nonDiscountGains,
    indexedGains,
    capitalLosses,
    lossesApplied,
    carryForwardLoss,
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
