"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAccountSchema,
  updateAccountSchema,
  cashTransactionSchema,
  updateCashTransactionSchema,
  debitCardSchema,
  categorySchema,
  updateCategorySchema,
} from "@/lib/validators/account";
import { recomputeAccountBalance } from "@/lib/services/accounts";
import { syncPortfolioLedger } from "@/lib/services/cash-ledger";
import { DEFAULT_CATEGORIES } from "@/lib/constants/categories";
import { autoReconcileAccount } from "@/lib/services/reconciliation";

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

  const created = await db.cashTransaction.create({
    data: {
      cashAccountId: accountId,
      type: data.type,
      amount: data.amount,
      date: data.date,
      description: data.description ?? null,
      categoryId: data.categoryId ?? null,
      source: "manual",
    },
    select: { id: true },
  });
  await recomputeAccountBalance(accountId);

  // When a transfer counterparty is supplied, delegate to the transfer linker so
  // the mirror transaction and hard mirror link are created consistently.
  if (data.transferAccountId) {
    await setTransactionTransferAccount(created.id, data.transferAccountId);
  }

  revalidatePath(`/accounts/${accountId}`);
}

/**
 * Establish the hard one-to-one mirror link between two transactions. Exactly
 * one side stores the FK (`mirrorTransactionId` is unique); we try one direction
 * and fall back to the other if that side is already claimed.
 */
async function linkMirror(aId: string, bId: string) {
  try {
    await db.cashTransaction.update({
      where: { id: bId },
      data: { mirrorTransactionId: aId },
    });
  } catch {
    await db.cashTransaction.update({
      where: { id: aId },
      data: { mirrorTransactionId: bId },
    });
  }
}

/**
 * Locate the paired transaction for a transfer — its auto-created mirror, or a
 * cross-linked real transaction in the other account.
 *
 * Resolution order: (1) the hard `mirrorTransactionId` link (deterministic),
 * (2) the reverse link, (3) a fuzzy fallback for legacy unlinked rows matched on
 * the row's *current* amount/date (±$0.01, ±3 days) plus the back-pointer — and
 * when found that way, the hard link is healed so future lookups are exact.
 */
async function findTransferPartner(tx: {
  id: string;
  cashAccountId: string;
  transferAccountId: string | null;
  mirrorTransactionId: string | null;
  amount: unknown;
  date: Date;
}) {
  // 1. Forward hard link.
  if (tx.mirrorTransactionId) {
    const p = await db.cashTransaction.findUnique({
      where: { id: tx.mirrorTransactionId },
      select: { id: true, cashAccountId: true, source: true },
    });
    if (p) return p;
  }
  // 2. Reverse hard link.
  const back = await db.cashTransaction.findUnique({
    where: { mirrorTransactionId: tx.id },
    select: { id: true, cashAccountId: true, source: true },
  });
  if (back) return back;

  // 3. Fuzzy fallback (legacy rows created before the hard link existed).
  if (!tx.transferAccountId) return null;
  const amount = Number(tx.amount);
  const windowStart = new Date(tx.date);
  windowStart.setDate(windowStart.getDate() - 3);
  const windowEnd = new Date(tx.date);
  windowEnd.setDate(windowEnd.getDate() + 3);

  const fuzzy = await db.cashTransaction.findFirst({
    where: {
      id: { not: tx.id },
      cashAccountId: tx.transferAccountId,
      transferAccountId: tx.cashAccountId,
      mirrorTransactionId: null,
      mirroredBy: { is: null },
      date: { gte: windowStart, lte: windowEnd },
      amount: { gte: amount - 0.01, lte: amount + 0.01 },
    },
    // Prefer an auto-created mirror over a cross-linked real transaction.
    orderBy: { source: "desc" },
    select: { id: true, cashAccountId: true, source: true },
  });
  if (fuzzy) {
    await linkMirror(tx.id, fuzzy.id).catch(() => null);
    return fuzzy;
  }
  return null;
}

export async function deleteAccountTransaction(txId: string) {
  const userId = await requireUser();
  const tx = await db.cashTransaction.findFirst({
    where: { id: txId, cashAccount: { userId } },
    select: {
      id: true,
      cashAccountId: true,
      amount: true,
      date: true,
      transferAccountId: true,
      mirrorTransactionId: true,
      cashAccount: { select: { isVirtual: true } },
    },
  });
  if (!tx) throw new Error("Transaction not found");
  if (tx.cashAccount.isVirtual) throw new Error("Virtual account transactions are read-only");

  // Resolve the mirror/counterpart before deleting, so we can keep the pair
  // referentially intact.
  const partner =
    tx.transferAccountId != null || tx.mirrorTransactionId != null
      ? await findTransferPartner({
          id: tx.id,
          cashAccountId: tx.cashAccountId,
          transferAccountId: tx.transferAccountId,
          mirrorTransactionId: tx.mirrorTransactionId,
          amount: tx.amount,
          date: tx.date,
        })
      : null;

  await db.cashTransaction.delete({ where: { id: txId } });

  if (partner) {
    if (partner.source === "mirror") {
      // The mirror only exists because of this transfer → remove it too.
      await db.cashTransaction.delete({ where: { id: partner.id } });
    } else {
      // A real transaction in the other account → keep it, just drop the link
      // so it no longer dangles as a transfer to a now-deleted row.
      await db.cashTransaction.update({
        where: { id: partner.id },
        data: { transferAccountId: null },
      });
    }
    await recomputeAccountBalance(partner.cashAccountId);
    revalidatePath(`/accounts/${partner.cashAccountId}`);
  }

  await recomputeAccountBalance(tx.cashAccountId);
  revalidatePath(`/accounts/${tx.cashAccountId}`);
}

/**
 * Update an existing cash transaction's core fields (type, amount, date,
 * description). When the transaction is part of a transfer, its mirror /
 * counterpart in the other account is kept in lockstep so the two never drift
 * apart. Counterparty re-assignment is handled by `setTransactionTransferAccount`.
 */
export async function updateAccountTransaction(txId: string, input: unknown) {
  const userId = await requireUser();
  const tx = await db.cashTransaction.findFirst({
    where: { id: txId, cashAccount: { userId } },
    select: {
      id: true,
      cashAccountId: true,
      amount: true,
      date: true,
      transferAccountId: true,
      mirrorTransactionId: true,
      cashAccount: { select: { isVirtual: true } },
    },
  });
  if (!tx) throw new Error("Transaction not found");
  if (tx.cashAccount.isVirtual) throw new Error("Virtual account transactions are read-only");

  const data = updateCashTransactionSchema.parse(input);

  // Resolve the partner BEFORE mutating, while the old amount/date still match.
  const partner =
    tx.transferAccountId != null || tx.mirrorTransactionId != null
      ? await findTransferPartner({
          id: tx.id,
          cashAccountId: tx.cashAccountId,
          transferAccountId: tx.transferAccountId,
          mirrorTransactionId: tx.mirrorTransactionId,
          amount: tx.amount,
          date: tx.date,
        })
      : null;

  await db.cashTransaction.update({
    where: { id: txId },
    data: {
      type: data.type,
      amount: data.amount,
      date: data.date,
      description: data.description ?? null,
    },
  });

  if (partner) {
    // An auto-mirror fully reflects the source; a cross-linked real transaction
    // keeps its own date/description but must share the amount and opposite
    // direction so the transfer stays balanced.
    const partnerData =
      partner.source === "mirror"
        ? {
            type: mirrorType(data.type),
            amount: data.amount,
            date: data.date,
            description: data.description ?? null,
          }
        : { type: mirrorType(data.type), amount: data.amount };
    await db.cashTransaction.update({ where: { id: partner.id }, data: partnerData });
    await recomputeAccountBalance(partner.cashAccountId);
    revalidatePath(`/accounts/${partner.cashAccountId}`);
  }

  await recomputeAccountBalance(tx.cashAccountId);
  revalidatePath(`/accounts/${tx.cashAccountId}`);
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

/** Opposite transfer direction. */
function mirrorType(type: string): string {
  if (type === "transfer_out") return "transfer_in";
  if (type === "transfer_in") return "transfer_out";
  // For generic withdrawal/deposit categorised as transfer:
  if (type === "withdrawal" || type === "buy_settlement") return "deposit";
  return "withdrawal";
}

export async function setTransactionTransferAccount(
  txId: string,
  transferAccountId: string | null
) {
  const userId = await requireUser();

  const tx = await db.cashTransaction.findFirst({
    where: { id: txId, cashAccount: { userId } },
    select: {
      id: true,
      cashAccountId: true,
      type: true,
      amount: true,
      date: true,
      description: true,
      categoryId: true,
      // Previously set counterparty — needed to clean up old mirror.
      transferAccountId: true,
    },
  });
  if (!tx) throw new Error("Transaction not found");

  // ── 1. Detach the previous counterparty's mirror when it changes. ──
  const prevCounterpartyId = tx.transferAccountId;
  if (prevCounterpartyId && prevCounterpartyId !== transferAccountId) {
    // Auto-created mirrors only exist for this transfer → delete them.
    await db.cashTransaction.deleteMany({
      where: {
        cashAccountId: prevCounterpartyId,
        transferAccountId: tx.cashAccountId,
        source: "mirror",
      },
    });
    // Cross-linked real transactions are kept, but the back-link is cleared so
    // nothing dangles as a transfer to this account.
    await db.cashTransaction.updateMany({
      where: {
        cashAccountId: prevCounterpartyId,
        transferAccountId: tx.cashAccountId,
        source: { not: "mirror" },
      },
      data: { transferAccountId: null, mirrorTransactionId: null },
    });
    await recomputeAccountBalance(prevCounterpartyId);
  }

  // ── 2. Save the new counterparty on the source transaction, breaking any
  //       stale mirror link before a fresh one is established below. ──
  await db.cashTransaction.update({
    where: { id: txId },
    data: { transferAccountId, mirrorTransactionId: null },
  });

  // ── 3. Create mirror in counterparty account (if linking, not clearing). ──
  if (transferAccountId) {
    // Validate the target account belongs to the same user.
    const target = await db.cashAccount.findFirst({
      where: { id: transferAccountId, userId },
      select: { id: true },
    });
    if (!target) throw new Error("Target account not found");

    // Check whether a matching transaction already exists in the counterparty
    // (e.g. both accounts imported their bank statements). Tolerance: ±$0.01,
    // within 3 calendar days, already pointing back or unlinked.
    const txDate = new Date(tx.date);
    const windowStart = new Date(txDate);
    windowStart.setDate(windowStart.getDate() - 3);
    const windowEnd = new Date(txDate);
    windowEnd.setDate(windowEnd.getDate() + 3);

    const existingMirror = await db.cashTransaction.findFirst({
      where: {
        cashAccountId: transferAccountId,
        date: { gte: windowStart, lte: windowEnd },
        amount: { gte: Number(tx.amount) - 0.01, lte: Number(tx.amount) + 0.01 },
        OR: [
          { transferAccountId: tx.cashAccountId },
          { transferAccountId: null, source: { not: "mirror" } },
        ],
      },
      select: { id: true, transferAccountId: true },
    });

    if (existingMirror) {
      // Cross-link the existing counterparty transaction back to this account,
      // and forge the hard mirror link.
      await db.cashTransaction.update({
        where: { id: existingMirror.id },
        data: { transferAccountId: tx.cashAccountId },
      });
      await linkMirror(tx.id, existingMirror.id);
    } else {
      // No matching transaction — create one automatically, hard-linked back to
      // the source transaction.
      await db.cashTransaction.create({
        data: {
          cashAccountId: transferAccountId,
          type: mirrorType(tx.type),
          amount: tx.amount,
          date: tx.date,
          description: tx.description,
          categoryId: tx.categoryId,
          transferAccountId: tx.cashAccountId,
          source: "mirror",
          mirrorTransactionId: tx.id,
        },
      });
    }
    await recomputeAccountBalance(transferAccountId);
    revalidatePath(`/accounts/${transferAccountId}`);
  }

  await recomputeAccountBalance(tx.cashAccountId);
  revalidatePath(`/accounts/${tx.cashAccountId}`);
}

// ─── Categories ─────────────────────────────────────────────────────────────

/** Seed the default category set for a user if they have none. */
export async function seedDefaultCategories(userId: string) {
  const existing = await db.cashCategory.findMany({
    where: { userId },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((e) => e.name));

  const missing = DEFAULT_CATEGORIES.filter((c) => !existingNames.has(c.name));
  if (missing.length === 0) return;

  await db.cashCategory.createMany({
    data: missing.map((c) => ({
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

/** Categories with the count of transactions using each — for the manager UI. */
export async function getCategoriesWithUsage() {
  const userId = await requireUser();
  return db.cashCategory.findMany({
    where: { userId },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    include: { _count: { select: { transactions: true } } },
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
  revalidatePath("/settings/categories");
  revalidatePath("/accounts");
}

export async function updateCategory(id: string, input: unknown) {
  const userId = await requireUser();
  const data = updateCategorySchema.parse(input);
  const existing = await db.cashCategory.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) throw new Error("Category not found");
  await db.cashCategory.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.kind !== undefined && { kind: data.kind }),
      ...(data.color !== undefined && { color: data.color }),
    },
  });
  revalidatePath("/settings/categories");
  revalidatePath("/accounts");
}

export async function deleteCategory(id: string, reassignToId?: string | null) {
  const userId = await requireUser();
  const cat = await db.cashCategory.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!cat) throw new Error("Category not found");

  if (reassignToId) {
    if (reassignToId === id) throw new Error("Cannot reassign to the category being deleted");
    const target = await db.cashCategory.findFirst({
      where: { id: reassignToId, userId },
      select: { id: true },
    });
    if (!target) throw new Error("Target category not found");
    // Reclassify the deleted category's transactions to the nominated one.
    await db.cashTransaction.updateMany({
      where: { categoryId: id, cashAccount: { userId } },
      data: { categoryId: reassignToId },
    });
  }
  // Otherwise remaining transactions fall back to uncategorised (FK SetNull).
  await db.cashCategory.deleteMany({ where: { id, userId } });
  revalidatePath("/settings/categories");
  revalidatePath("/accounts");
}

/**
 * Merge `sourceId` into `targetId`: reclassify the source category's transactions
 * (and re-parent its children) onto the target, then delete the source.
 */
export async function mergeCategories(sourceId: string, targetId: string) {
  const userId = await requireUser();
  if (sourceId === targetId) throw new Error("Cannot merge a category into itself");

  const [source, target] = await Promise.all([
    db.cashCategory.findFirst({ where: { id: sourceId, userId }, select: { id: true } }),
    db.cashCategory.findFirst({ where: { id: targetId, userId }, select: { id: true } }),
  ]);
  if (!source || !target) throw new Error("Category not found");

  await db.cashTransaction.updateMany({
    where: { categoryId: sourceId, cashAccount: { userId } },
    data: { categoryId: targetId },
  });
  await db.cashCategory.updateMany({
    where: { parentId: sourceId, userId, id: { not: targetId } },
    data: { parentId: targetId },
  });
  await db.cashCategory.delete({ where: { id: sourceId } });

  revalidatePath("/settings/categories");
  revalidatePath("/accounts");
}

/**
 * Replace the user's categories with the default set. Removing the existing
 * categories nulls any transactions that referenced them (FK onDelete: SetNull).
 */
export async function resetCategoriesToDefault() {
  const userId = await requireUser();
  await db.cashCategory.deleteMany({ where: { userId } });
  await seedDefaultCategories(userId);
  revalidatePath("/settings/categories");
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

  // Attempt auto-reconciliation for high-confidence matches between the
  // newly-linked portfolio's transactions and existing account transactions.
  // Awaited so the results are reflected immediately after linking; failures
  // are swallowed so they never block the link itself.
  await autoReconcileAccount(accountId).catch(() => null);

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

/** Rebuild a virtual account's auto-posted ledger from its portfolio. */
export async function syncVirtualLedger(accountId: string) {
  const userId = await requireUser();
  const account = await db.cashAccount.findFirst({
    where: { id: accountId, userId },
    select: { isVirtual: true, portfolioId: true },
  });
  if (!account?.isVirtual || !account.portfolioId) return;
  await syncPortfolioLedger(account.portfolioId);
  revalidatePath(`/accounts/${accountId}`);
}

/**
 * Convert a portfolio's virtual cash ledger into a real, editable account.
 *
 * The derived auto-posted rows (`source: "portfolio"`) become independent
 * `manual` transactions, the account is promoted (`isVirtual = false`) and
 * detached from its derived `portfolioId` ownership, and it is linked to the
 * originating portfolio via `PortfolioAccount` (as default when the portfolio
 * has no default yet). Reconciliation is then run against the portfolio.
 */
export async function convertVirtualAccount(accountId: string) {
  const userId = await requireUser();
  const account = await db.cashAccount.findFirst({
    where: { id: accountId, userId },
    select: { id: true, isVirtual: true, portfolioId: true },
  });
  if (!account) throw new Error("Account not found");
  if (!account.isVirtual) throw new Error("Account is already a real account");

  const portfolioId = account.portfolioId;

  await db.$transaction(async (tx) => {
    // Promote to a real account and drop the derived single-portfolio ownership.
    await tx.cashAccount.update({
      where: { id: accountId },
      data: { isVirtual: false, portfolioId: null },
    });
    // Auto-posted ledger rows become real, editable manual transactions so they
    // are no longer wiped by future ledger rebuilds.
    await tx.cashTransaction.updateMany({
      where: { cashAccountId: accountId, source: "portfolio" },
      data: { source: "manual" },
    });
    // Link the account to its originating portfolio (default if none exists yet).
    if (portfolioId) {
      const existingDefault = await tx.portfolioAccount.findFirst({
        where: { portfolioId, isDefault: true },
        select: { id: true },
      });
      await tx.portfolioAccount.upsert({
        where: { portfolioId_cashAccountId: { portfolioId, cashAccountId: accountId } },
        create: { portfolioId, cashAccountId: accountId, isDefault: !existingDefault },
        update: {},
      });
    }
  });

  await recomputeAccountBalance(accountId);
  // Reconcile the now-real account against its portfolio's transactions.
  await autoReconcileAccount(accountId).catch(() => null);

  if (portfolioId) revalidatePath(`/portfolio/${portfolioId}`);
  revalidatePath(`/accounts/${accountId}`);
  revalidatePath("/accounts");
}
