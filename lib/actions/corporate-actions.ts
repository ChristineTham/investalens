"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function recordSplit(
  holdingId: string,
  ratio: number,
  date: Date
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const holding = await db.holding.findFirst({
    where: { id: holdingId, portfolio: { userId: session.user.id } },
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
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const holding = await db.holding.findFirst({
    where: { id: holdingId, portfolio: { userId: session.user.id } },
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
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const holding = await db.holding.findFirst({
    where: { id: holdingId, portfolio: { userId: session.user.id } },
    include: { transactions: true },
  });
  if (!holding) throw new Error("Holding not found");

  // Calculate current quantity for total amount
  let currentQty = 0;
  for (const tx of holding.transactions) {
    if (
      tx.transactionType === "BUY" ||
      tx.transactionType === "TRANSFER_IN" ||
      tx.transactionType === "BONUS"
    ) {
      currentQty += Number(tx.quantity);
    } else if (
      tx.transactionType === "SELL" ||
      tx.transactionType === "TRANSFER_OUT"
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

export async function recordMerger(
  sourceHoldingId: string,
  targetInstrumentCode: string,
  targetMarketCode: string,
  quantity: number,
  date: Date
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const holding = await db.holding.findFirst({
    where: { id: sourceHoldingId, portfolio: { userId: session.user.id } },
    include: { instrument: true },
  });
  if (!holding) throw new Error("Holding not found");

  // MERGER_OUT from source
  await db.transaction.create({
    data: {
      holdingId: sourceHoldingId,
      transactionType: "MERGER_OUT",
      tradeDate: date,
      quantity,
      price: 0,
      brokerage: 0,
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

  // MERGER_IN to target
  await db.transaction.create({
    data: {
      holdingId: targetHolding.id,
      transactionType: "MERGER_IN",
      tradeDate: date,
      quantity,
      price: 0,
      brokerage: 0,
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
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const holding = await db.holding.findFirst({
    where: { id: holdingId, portfolio: { userId: session.user.id } },
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
