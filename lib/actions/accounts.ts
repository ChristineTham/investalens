"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAccountSchema,
  updateAccountSchema,
  cashTransactionSchema,
  debitCardSchema,
  categorySchema,
} from "@/lib/validators/account";
import { recomputeAccountBalance } from "@/lib/services/accounts";
import { DEFAULT_CATEGORIES } from "@/lib/constants/categories";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

/** Verify the account belongs to the user; returns it. */
async function ownAccount(accountId: string, userId: string) {
  const account = await db.cashAccount.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) throw new Error("Account not found");
  return account;
}

// ─── Accounts ───────────────────────────────────────────────────────────────

export async function createAccount(input: unknown) {
  const userId = await requireUser();
  const data = createAccountSchema.parse(input);

  const account = await db.cashAccount.create({
    data: {
      userId,
      name: data.name,
      institution: data.institution ?? null,
      bsb: data.bsb ?? null,
      accountNumber: data.accountNumber ?? null,
      accountType: data.accountType,
      currency: data.currency,
      openingBalance: data.openingBalance,
      balance: data.openingBalance,
      interestRate: data.interestRate ?? null,
      website: data.website ?? null,
      notes: data.notes ?? null,
    },
  });

  revalidatePath("/accounts");
  return account;
}

export async function updateAccount(id: string, input: unknown) {
  const userId = await requireUser();
  await ownAccount(id, userId);
  const data = updateAccountSchema.parse(input);

  await db.cashAccount.update({ where: { id }, data });
  if (data.openingBalance !== undefined) await recomputeAccountBalance(id);

  revalidatePath("/accounts");
  revalidatePath(`/accounts/${id}`);
}

export async function deleteAccount(id: string) {
  const userId = await requireUser();
  const account = await ownAccount(id, userId);
  if (account.isVirtual) {
    throw new Error("Virtual accounts are managed automatically and cannot be deleted");
  }
  await db.cashAccount.delete({ where: { id } });
  revalidatePath("/accounts");
  redirect("/accounts");
}

// ─── Cash transactions ──────────────────────────────────────────────────────

export async function addAccountTransaction(accountId: string, input: unknown) {
  const userId = await requireUser();
  const account = await ownAccount(accountId, userId);
  if (account.isVirtual) {
    throw new Error("Cannot add transactions to a virtual portfolio cash account");
  }
  const data = cashTransactionSchema.parse(input);

  await db.cashTransaction.create({
    data: {
      cashAccountId: accountId,
      type: data.type,
      amount: data.amount,
      date: data.date,
      description: data.description ?? null,
      categoryId: data.categoryId ?? null,
      source: "manual",
    },
  });
  await recomputeAccountBalance(accountId);
  revalidatePath(`/accounts/${accountId}`);
}

export async function deleteAccountTransaction(txId: string) {
  const userId = await requireUser();
  const tx = await db.cashTransaction.findFirst({
    where: { id: txId, cashAccount: { userId } },
    include: { cashAccount: { select: { id: true, isVirtual: true } } },
  });
  if (!tx) throw new Error("Transaction not found");
  if (tx.cashAccount.isVirtual) throw new Error("Virtual account transactions are read-only");

  await db.cashTransaction.delete({ where: { id: txId } });
  await recomputeAccountBalance(tx.cashAccount.id);
  revalidatePath(`/accounts/${tx.cashAccount.id}`);
}

export async function setTransactionCategory(
  txId: string,
  categoryId: string | null
) {
  const userId = await requireUser();
  const tx = await db.cashTransaction.findFirst({
    where: { id: txId, cashAccount: { userId } },
    select: { id: true, cashAccountId: true },
  });
  if (!tx) throw new Error("Transaction not found");

  await db.cashTransaction.update({
    where: { id: txId },
    data: { categoryId },
  });
  revalidatePath(`/accounts/${tx.cashAccountId}`);
}

// ─── Categories ─────────────────────────────────────────────────────────────

/** Seed the default category set for a user if they have none. */
export async function seedDefaultCategories(userId: string) {
  const count = await db.cashCategory.count({ where: { userId } });
  if (count > 0) return;
  await db.cashCategory.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({
      userId,
      name: c.name,
      kind: c.kind,
      color: c.color,
      isSystem: true,
    })),
  });
}

export async function getCategories() {
  const userId = await requireUser();
  return db.cashCategory.findMany({
    where: { userId },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });
}

export async function createCategory(input: unknown) {
  const userId = await requireUser();
  const data = categorySchema.parse(input);
  await db.cashCategory.create({
    data: {
      userId,
      name: data.name,
      kind: data.kind,
      color: data.color ?? null,
      parentId: data.parentId ?? null,
    },
  });
  revalidatePath("/accounts");
}

export async function deleteCategory(id: string) {
  const userId = await requireUser();
  await db.cashCategory.deleteMany({ where: { id, userId } });
  revalidatePath("/accounts");
}

// ─── Debit cards ────────────────────────────────────────────────────────────

export async function addDebitCard(accountId: string, input: unknown) {
  const userId = await requireUser();
  await ownAccount(accountId, userId);
  const data = debitCardSchema.parse(input);
  await db.debitCard.create({
    data: {
      cashAccountId: accountId,
      label: data.label ?? null,
      last4: data.last4 ?? null,
      network: data.network ?? null,
      expiry: data.expiry ?? null,
    },
  });
  revalidatePath(`/accounts/${accountId}`);
}

export async function deleteDebitCard(cardId: string) {
  const userId = await requireUser();
  const card = await db.debitCard.findFirst({
    where: { id: cardId, cashAccount: { userId } },
    select: { id: true, cashAccountId: true },
  });
  if (!card) throw new Error("Card not found");
  await db.debitCard.delete({ where: { id: cardId } });
  revalidatePath(`/accounts/${card.cashAccountId}`);
}

// ─── Portfolio links ────────────────────────────────────────────────────────

export async function linkPortfolioAccount(
  accountId: string,
  portfolioId: string,
  isDefault = false
) {
  const userId = await requireUser();
  await ownAccount(accountId, userId);
  const portfolio = await db.portfolio.findFirst({
    where: { id: portfolioId, userId },
  });
  if (!portfolio) throw new Error("Portfolio not found");

  if (isDefault) {
    await db.portfolioAccount.updateMany({
      where: { portfolioId },
      data: { isDefault: false },
    });
  }
  await db.portfolioAccount.upsert({
    where: { portfolioId_cashAccountId: { portfolioId, cashAccountId: accountId } },
    create: { portfolioId, cashAccountId: accountId, isDefault },
    update: { isDefault },
  });
  revalidatePath(`/accounts/${accountId}`);
  revalidatePath(`/portfolio/${portfolioId}`);
}

export async function unlinkPortfolioAccount(
  accountId: string,
  portfolioId: string
) {
  const userId = await requireUser();
  await ownAccount(accountId, userId);
  await db.portfolioAccount.deleteMany({
    where: { portfolioId, cashAccountId: accountId },
  });
  revalidatePath(`/accounts/${accountId}`);
  revalidatePath(`/portfolio/${portfolioId}`);
}
