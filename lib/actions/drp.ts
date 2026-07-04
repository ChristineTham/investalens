"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function enableDRP(holdingId: string) {
  const user = await requireUser();

  await db.holding.updateMany({
    where: { id: holdingId, portfolio: { userId: user.id } },
    data: { drpEnabled: true },
  });

  revalidatePath("/portfolio");
}

export async function disableDRP(holdingId: string) {
  const user = await requireUser();

  await db.holding.updateMany({
    where: { id: holdingId, portfolio: { userId: user.id } },
    data: { drpEnabled: false },
  });

  revalidatePath("/portfolio");
}

export async function recordDRP(
  holdingId: string,
  dividendTxId: string,
  sharesReceived: number,
  pricePerShare: number
) {
  const user = await requireUser();

  const holding = await db.holding.findFirst({
    where: { id: holdingId, portfolio: { userId: user.id } },
  });
  if (!holding) throw new Error("Holding not found");

  const dividendTx = await db.transaction.findFirst({
    where: { id: dividendTxId, holdingId },
  });
  if (!dividendTx) throw new Error("Dividend transaction not found");

  await db.transaction.create({
    data: {
      holdingId,
      transactionType: "BUY",
      tradeDate: dividendTx.tradeDate,
      quantity: sharesReceived,
      price: pricePerShare,
      brokerage: 0,
      comments: `DRP from dividend ${dividendTxId}`,
    },
  });

  revalidatePath(`/portfolio/${holding.portfolioId}`);
}
