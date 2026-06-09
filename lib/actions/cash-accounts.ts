"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createCashAccount(
  portfolioId: string,
  name: string,
  currency: string = "AUD"
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const portfolio = await db.portfolio.findFirst({
    where: { id: portfolioId, userId: session.user.id },
  });
  if (!portfolio) throw new Error("Portfolio not found");

  const account = await db.cashAccount.create({
    data: { portfolioId, name, currency },
  });

  revalidatePath(`/portfolio/${portfolioId}/cash`);
  return account;
}

export async function addCashTransaction(
  accountId: string,
  type: string,
  amount: number,
  date: Date,
  description?: string
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const account = await db.cashAccount.findFirst({
    where: { id: accountId, portfolio: { userId: session.user.id } },
  });
  if (!account) throw new Error("Account not found");

  await db.cashTransaction.create({
    data: { cashAccountId: accountId, type, amount, date, description },
  });

  // Update balance
  const sign = ["deposit", "interest", "dividend_received"].includes(type)
    ? 1
    : -1;
  await db.cashAccount.update({
    where: { id: accountId },
    data: { balance: { increment: amount * sign } },
  });

  revalidatePath(`/portfolio/${account.portfolioId}/cash`);
}

export async function getCashAccount(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return db.cashAccount.findFirst({
    where: { id, portfolio: { userId: session.user.id } },
    include: { transactions: { orderBy: { date: "desc" } } },
  });
}

export async function getCashAccounts(portfolioId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return db.cashAccount.findMany({
    where: { portfolioId, portfolio: { userId: session.user.id } },
    orderBy: { createdAt: "asc" },
  });
}
