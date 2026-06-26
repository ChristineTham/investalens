"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createTransactionSchema } from "@/lib/validators/transaction";
import { syncPortfolioLedger } from "@/lib/services/cash-ledger";
import { autoReconcileAccount } from "@/lib/services/reconciliation";
import { revalidatePath } from "next/cache";

/**
 * Propagate a portfolio-transaction change to any linked cash accounts so edits
 * are reflected in their transactions:
 *   - rebuild the derived virtual ledger (only when one already exists, to avoid
 *     surprise-creating a virtual account), and
 *   - re-run reconciliation against linked physical accounts,
 * then revalidate every affected account page.
 */
async function propagateToLinkedAccounts(portfolioId: string) {
  const [links, virtual] = await Promise.all([
    db.portfolioAccount.findMany({
      where: { portfolioId },
      select: { cashAccountId: true, cashAccount: { select: { isVirtual: true } } },
    }),
    db.cashAccount.findFirst({
      where: { portfolioId, isVirtual: true },
      select: { id: true },
    }),
  ]);

  if (virtual) {
    await syncPortfolioLedger(portfolioId);
    revalidatePath(`/accounts/${virtual.id}`);
  }

  for (const link of links) {
    if (!link.cashAccount.isVirtual) {
      await autoReconcileAccount(link.cashAccountId).catch(() => null);
    }
    revalidatePath(`/accounts/${link.cashAccountId}`);
  }
}

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

  await propagateToLinkedAccounts(holding.portfolioId);
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
  await propagateToLinkedAccounts(tx.holding.portfolioId);
  revalidatePath(`/portfolio/${tx.holding.portfolioId}`);
}

export async function updateTransaction(
  id: string,
  input: {
    transactionType?: string;
    tradeDate?: string;
    quantity?: number;
    price?: number;
    brokerage?: number;
    comments?: string;
    // Franking / tax classification (dividends & distributions). Auto-fetched
    // dividends carry none of these — they can only be set from imports or here.
    frankedAmount?: number | null;
    unfrankedAmount?: number | null;
    frankingCredits?: number | null;
    taxDeferred?: number | null;
    foreignTax?: number | null;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const tx = await db.transaction.findFirst({
    where: { id },
    include: { holding: { include: { portfolio: true } } },
  });

  if (!tx || tx.holding.portfolio.userId !== session.user.id) {
    throw new Error("Not found");
  }

  const updated = await db.transaction.update({
    where: { id },
    data: {
      ...(input.transactionType && { transactionType: input.transactionType }),
      ...(input.tradeDate && { tradeDate: new Date(input.tradeDate) }),
      ...(input.quantity !== undefined && { quantity: input.quantity }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.brokerage !== undefined && { brokerage: input.brokerage }),
      ...(input.comments !== undefined && { comments: input.comments }),
      ...(input.frankedAmount !== undefined && {
        frankedAmount: input.frankedAmount,
      }),
      ...(input.unfrankedAmount !== undefined && {
        unfrankedAmount: input.unfrankedAmount,
      }),
      ...(input.frankingCredits !== undefined && {
        frankingCredits: input.frankingCredits,
      }),
      ...(input.taxDeferred !== undefined && { taxDeferred: input.taxDeferred }),
      ...(input.foreignTax !== undefined && { foreignTax: input.foreignTax }),
    },
  });

  await propagateToLinkedAccounts(tx.holding.portfolioId);
  revalidatePath(`/portfolio/${tx.holding.portfolioId}`);
  return updated;
}

/**
 * Flat list of all transactions across a portfolio's holdings, newest first,
 * with the owning instrument's code/name/currency for display. Scoped to the
 * authenticated user.
 */
export async function getPortfolioTransactions(portfolioId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const portfolio = await db.portfolio.findFirst({
    where: { id: portfolioId, userId: session.user.id },
    select: { id: true },
  });
  if (!portfolio) throw new Error("Portfolio not found");

  return db.transaction.findMany({
    where: { holding: { portfolioId } },
    include: {
      holding: {
        include: {
          instrument: { select: { code: true, name: true, currency: true } },
        },
      },
    },
    orderBy: { tradeDate: "desc" },
  });
}
