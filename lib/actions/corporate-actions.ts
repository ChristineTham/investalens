"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  buildParcels,
  type SaleAllocationMethod,
} from "@/lib/calculations/parcels";
import { revalidatePath } from "next/cache";

export async function recordSplit(
  holdingId: string,
  ratio: number,
  date: Date
) {
  const user = await requireUser();

  const holding = await db.holding.findFirst({
    where: { id: holdingId, portfolio: { userId: user.id } },
  });
  if (!holding) throw new Error("Holding not found");

  await db.transaction.create({
    data: {
      holdingId,
      transactionType: "SPLIT",
      tradeDate: date,
      quantity: ratio,
      price: 0,
      brokerage: 0,
    },
  });

  revalidatePath(`/portfolio/${holding.portfolioId}`);
}

export async function recordBonus(
  holdingId: string,
  quantity: number,
  date: Date
) {
  const user = await requireUser();

  const holding = await db.holding.findFirst({
    where: { id: holdingId, portfolio: { userId: user.id } },
  });
  if (!holding) throw new Error("Holding not found");

  await db.transaction.create({
    data: {
      holdingId,
      transactionType: "BONUS",
      tradeDate: date,
      quantity,
      price: 0,
      brokerage: 0,
    },
  });

  revalidatePath(`/portfolio/${holding.portfolioId}`);
}

export async function recordReturnOfCapital(
  holdingId: string,
  amountPerShare: number,
  date: Date
) {
  const user = await requireUser();

  const holding = await db.holding.findFirst({
    where: { id: holdingId, portfolio: { userId: user.id } },
    include: { transactions: true },
  });
  if (!holding) throw new Error("Holding not found");

  // Calculate current quantity for total amount
  let currentQty = 0;
  for (const tx of holding.transactions) {
    if (
      tx.transactionType === "BUY" ||
      tx.transactionType === "TRANSFER_IN" ||
      tx.transactionType === "RIGHTS_ISSUE" ||
      tx.transactionType === "MERGER_IN" ||
      tx.transactionType === "BONUS"
    ) {
      currentQty += Number(tx.quantity);
    } else if (
      tx.transactionType === "SELL" ||
      tx.transactionType === "TRANSFER_OUT" ||
      tx.transactionType === "MERGER_OUT"
    ) {
      currentQty -= Number(tx.quantity);
    } else if (tx.transactionType === "SPLIT") {
      currentQty *= Number(tx.quantity);
    }
  }

  await db.transaction.create({
    data: {
      holdingId,
      transactionType: "RETURN_OF_CAPITAL",
      tradeDate: date,
      quantity: currentQty,
      price: amountPerShare,
      brokerage: 0,
    },
  });

  revalidatePath(`/portfolio/${holding.portfolioId}`);
}

/**
 * Record a merger / acquisition as an Australian scrip-for-scrip rollover:
 * the source holding's remaining cost base at the merger date carries over to
 * the new units instead of a market-value disposal.
 *
 * - MERGER_OUT disposes of ALL remaining units of the source holding at price
 *   0 (no proceeds — the rollover defers the CGT event; the parcel builder
 *   consumes every source parcel).
 * - MERGER_IN records `quantity` new units at a per-unit price such that the
 *   new units' total cost base equals the source's remaining cost base.
 *
 * Simplification: the transferred cost base is carried as a single aggregate
 * parcel whose acquisition date is the EARLIEST remaining source parcel's
 * acquisition date (embedded as an `[acq:YYYY-MM-DD]` marker in the MERGER_IN
 * comments, which buildParcels reads). Strict per-parcel carryover — one new
 * parcel per source parcel, each with its own date and cost — would need
 * per-parcel storage the transaction model doesn't have. The earliest-date
 * aggregate is conservative-adjacent for the 12-month discount clock but can
 * overstate indexation for mixed pre/post-1999 holdings.
 */
export async function recordMerger(
  sourceHoldingId: string,
  targetInstrumentCode: string,
  targetMarketCode: string,
  quantity: number,
  date: Date
) {
  const user = await requireUser();

  if (!(quantity > 0)) throw new Error("New share quantity must be positive");

  const holding = await db.holding.findFirst({
    where: { id: sourceHoldingId, portfolio: { userId: user.id } },
    include: {
      instrument: true,
      portfolio: true,
      transactions: { orderBy: { tradeDate: "asc" } },
    },
  });
  if (!holding) throw new Error("Holding not found");

  // Remaining parcels of the source holding as at the merger date.
  const priorTx = holding.transactions
    .filter((tx) => tx.tradeDate <= date)
    .map((tx) => ({
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
    priorTx,
    holding.portfolio.saleAllocationMethod as SaleAllocationMethod,
    holding.portfolio.taxEntityType
  );
  const active = parcels.filter((p) => p.remainingQuantity > 0);
  const sourceUnits = active.reduce((s, p) => s + p.remainingQuantity, 0);
  if (sourceUnits <= 0) {
    throw new Error("No units held at the merger date");
  }
  const sourceCostBase = active.reduce(
    (s, p) => s + p.remainingQuantity * p.costPerUnit,
    0
  );
  const earliestAcquisition = active.reduce(
    (min, p) => (p.purchaseDate < min ? p.purchaseDate : min),
    active[0].purchaseDate
  );
  const acqKey = earliestAcquisition.toISOString().slice(0, 10);
  const sourceCode = `${holding.instrument.code}.${holding.instrument.marketCode}`;
  const targetCode = `${targetInstrumentCode}.${targetMarketCode}`;

  // MERGER_OUT from source — dispose of ALL remaining units, zero proceeds
  // (scrip-for-scrip rollover: no CGT event, the cost base carries over).
  await db.transaction.create({
    data: {
      holdingId: sourceHoldingId,
      transactionType: "MERGER_OUT",
      tradeDate: date,
      quantity: sourceUnits,
      price: 0,
      brokerage: 0,
      comments: `Scrip-for-scrip rollover into ${targetCode}`,
    },
  });

  // Find or create target instrument and holding
  let targetInstrument = await db.instrument.findUnique({
    where: {
      code_marketCode: {
        code: targetInstrumentCode,
        marketCode: targetMarketCode,
      },
    },
  });
  if (!targetInstrument) {
    targetInstrument = await db.instrument.create({
      data: {
        code: targetInstrumentCode,
        marketCode: targetMarketCode,
        name: targetInstrumentCode,
      },
    });
  }

  const targetHolding = await db.holding.upsert({
    where: {
      portfolioId_instrumentId: {
        portfolioId: holding.portfolioId,
        instrumentId: targetInstrument.id,
      },
    },
    create: {
      portfolioId: holding.portfolioId,
      instrumentId: targetInstrument.id,
    },
    update: {},
  });

  // MERGER_IN to target — per-unit price carries the transferred cost base so
  // that quantity × price equals the source's remaining cost base. The
  // [acq:...] marker preserves the earliest original acquisition date for the
  // CGT discount / indexation clock (see buildParcels).
  await db.transaction.create({
    data: {
      holdingId: targetHolding.id,
      transactionType: "MERGER_IN",
      tradeDate: date,
      quantity,
      price: sourceCostBase / quantity,
      brokerage: 0,
      comments: `Scrip-for-scrip rollover from ${sourceCode}; cost base $${sourceCostBase.toFixed(2)} transferred [acq:${acqKey}]`,
    },
  });

  revalidatePath(`/portfolio/${holding.portfolioId}`);
}

export async function recordRightsIssue(
  holdingId: string,
  quantity: number,
  price: number,
  date: Date
) {
  const user = await requireUser();

  const holding = await db.holding.findFirst({
    where: { id: holdingId, portfolio: { userId: user.id } },
  });
  if (!holding) throw new Error("Holding not found");

  await db.transaction.create({
    data: {
      holdingId,
      transactionType: "RIGHTS_ISSUE",
      tradeDate: date,
      quantity,
      price,
      brokerage: 0,
    },
  });

  revalidatePath(`/portfolio/${holding.portfolioId}`);
}
