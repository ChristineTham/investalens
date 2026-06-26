"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createTransaction } from "@/lib/actions/transaction";

/** Find-or-create an instrument by code + market. */
async function resolveInstrument(
  code: string,
  marketCode: string,
  name?: string,
  instrumentType?: string
) {
  const existing = await db.instrument.findUnique({
    where: { code_marketCode: { code, marketCode } },
  });
  if (existing) return existing;
  return db.instrument.create({
    data: {
      code,
      marketCode,
      name: name || code,
      instrumentType: instrumentType || "equity",
      currency: marketCode === "ASX" ? "AUD" : "USD",
    },
  });
}

export async function addHolding(
  portfolioId: string,
  data: {
    instrumentCode: string;
    marketCode: string;
    instrumentName?: string;
    instrumentType?: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const portfolio = await db.portfolio.findFirst({
    where: { id: portfolioId, userId: session.user.id },
  });
  if (!portfolio) throw new Error("Portfolio not found");

  let instrument = await db.instrument.findUnique({
    where: {
      code_marketCode: {
        code: data.instrumentCode,
        marketCode: data.marketCode,
      },
    },
  });

  if (!instrument) {
    instrument = await db.instrument.create({
      data: {
        code: data.instrumentCode,
        marketCode: data.marketCode,
        name: data.instrumentName || data.instrumentCode,
        instrumentType: data.instrumentType || "equity",
        currency: data.marketCode === "ASX" ? "AUD" : "USD",
      },
    });
  }

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
  transaction: {
    transactionType: string;
    tradeDate: string;
    quantity: number;
    price: number;
    brokerage?: number;
    currency?: string;
  };
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const portfolio = await db.portfolio.findFirst({
    where: { id: input.portfolioId, userId: session.user.id },
  });
  if (!portfolio) throw new Error("Portfolio not found");

  const instrument = await resolveInstrument(
    input.instrumentCode,
    input.marketCode,
    input.instrumentName,
    input.instrumentType
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
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const holding = await db.holding.findFirst({
    where: { id: holdingId, portfolio: { userId: session.user.id } },
  });
  if (!holding) throw new Error("Not found");

  await db.holding.delete({ where: { id: holdingId } });
  revalidatePath(`/portfolio/${holding.portfolioId}`);
}
