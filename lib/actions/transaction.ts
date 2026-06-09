"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createTransactionSchema } from "@/lib/validators/transaction";
import { revalidatePath } from "next/cache";

export async function createTransaction(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const data = createTransactionSchema.parse(input);

  const holding = await db.holding.findFirst({
    where: {
      id: data.holdingId,
      portfolio: { userId: session.user.id },
    },
  });
  if (!holding) throw new Error("Holding not found");

  const transaction = await db.transaction.create({
    data: {
      ...data,
      quantity: data.quantity,
      price: data.price,
      brokerage: data.brokerage,
      exchangeRate: data.exchangeRate,
    },
  });

  revalidatePath(`/portfolio/${holding.portfolioId}`);
  return transaction;
}

export async function getTransactions(holdingId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return db.transaction.findMany({
    where: {
      holdingId,
      holding: { portfolio: { userId: session.user.id } },
    },
    orderBy: { tradeDate: "desc" },
  });
}

export async function deleteTransaction(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const tx = await db.transaction.findFirst({
    where: { id },
    include: { holding: { include: { portfolio: true } } },
  });

  if (!tx || tx.holding.portfolio.userId !== session.user.id) {
    throw new Error("Not found");
  }

  await db.transaction.delete({ where: { id } });
  revalidatePath(`/portfolio/${tx.holding.portfolioId}`);
}
