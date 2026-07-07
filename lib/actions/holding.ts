"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createTransaction } from "@/lib/actions/transaction";
import { enrichDelistedInstrument } from "@/lib/services/delisted-enrichment";

async function resolveInstrument(
  code: string,
  marketCode: string,
  name?: string,
  instrumentType?: string,
  isDelisted?: boolean
) {
  const existing = await db.instrument.findUnique({
    where: { code_marketCode: { code, marketCode } },
  });
  
  const instrument = existing || await db.instrument.create({
    data: {
      code,
      marketCode,
      name: name || code,
      instrumentType: instrumentType || "equity",
      currency: marketCode === "ASX" ? "AUD" : "USD",
    },
  });

  if (isDelisted) {
    // Perform once-off enrichment of company details & EODHD prices in the background
    enrichDelistedInstrument(instrument.id).catch((err) => {
      console.error(`Failed background enrichment for ${code}:`, err);
    });
  }

  return instrument;
}

export async function addHolding(
  portfolioId: string,
  data: {
    instrumentCode: string;
    marketCode: string;
    instrumentName?: string;
    instrumentType?: string;
    isDelisted?: boolean;
  }
) {
  const user = await requireUser();

  const portfolio = await db.portfolio.findFirst({
    where: { id: portfolioId, userId: user.id },
  });
  if (!portfolio) throw new Error("Portfolio not found");

  const instrument = await resolveInstrument(
    data.instrumentCode,
    data.marketCode,
    data.instrumentName,
    data.instrumentType,
    data.isDelisted
  );

  const holding = await db.holding.upsert({
    where: {
      portfolioId_instrumentId: { portfolioId, instrumentId: instrument.id },
    },
    create: { portfolioId, instrumentId: instrument.id },
    update: {},
    include: { instrument: true },
  });

  revalidatePath(`/portfolio/${portfolioId}`);
  return holding;
}

/**
 * Add a holding AND record its first transaction in one step. Resolves (or
 * creates) the instrument, upserts the holding, then creates the transaction
 * (which also propagates to any linked cash accounts).
 */
export async function addHoldingWithTransaction(input: {
  portfolioId: string;
  instrumentCode: string;
  marketCode: string;
  instrumentName?: string;
  instrumentType?: string;
  isDelisted?: boolean;
  transaction: {
    transactionType: string;
    tradeDate: string;
    quantity: number;
    price: number;
    brokerage?: number;
    currency?: string;
  };
}) {
  const user = await requireUser();

  const portfolio = await db.portfolio.findFirst({
    where: { id: input.portfolioId, userId: user.id },
  });
  if (!portfolio) throw new Error("Portfolio not found");

  const instrument = await resolveInstrument(
    input.instrumentCode,
    input.marketCode,
    input.instrumentName,
    input.instrumentType,
    input.isDelisted
  );

  const holding = await db.holding.upsert({
    where: {
      portfolioId_instrumentId: {
        portfolioId: input.portfolioId,
        instrumentId: instrument.id,
      },
    },
    create: { portfolioId: input.portfolioId, instrumentId: instrument.id },
    update: {},
  });

  await createTransaction({
    holdingId: holding.id,
    transactionType: input.transaction.transactionType,
    tradeDate: input.transaction.tradeDate,
    quantity: input.transaction.quantity,
    price: input.transaction.price,
    brokerage: input.transaction.brokerage ?? 0,
    currency: input.transaction.currency ?? instrument.currency,
  });

  revalidatePath(`/portfolio/${input.portfolioId}`);
  return holding;
}

export async function deleteHolding(holdingId: string) {
  const user = await requireUser();

  const holding = await db.holding.findFirst({
    where: { id: holdingId, portfolio: { userId: user.id } },
  });
  if (!holding) throw new Error("Not found");

  await db.holding.delete({ where: { id: holdingId } });
  revalidatePath(`/portfolio/${holding.portfolioId}`);
}
