"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  recomputeReconciledFlag,
  writeBackCategoryAndType,
} from "@/lib/services/reconciliation";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export interface ReconcileTarget {
  kind: "transaction" | "fee";
  refId: string;
}

/**
 * Link an account transaction to one or more portfolio transactions / fees.
 * Multiple targets create a split (1 bank row → N portfolio entries). The
 * account transaction is flagged reconciled only when the linked cash matches
 * the bank amount within tolerance.
 *
 * After linking, the cash transaction's `type` and `categoryId` are updated
 * to reflect the portfolio transaction type — but only if those fields are
 * currently unclassified (generic type or null category).
 */
export async function reconcileTransactions(
  accountTxId: string,
  targets: ReconcileTarget[],
  matchType: "auto" | "manual" = "manual"
) {
  const userId = await requireUser();
  if (targets.length === 0) return;

  const accountTx = await db.cashTransaction.findFirst({
    where: { id: accountTxId, cashAccount: { userId } },
    select: { id: true, cashAccountId: true },
  });
  if (!accountTx) throw new Error("Account transaction not found");

  // Verify ownership of every target.
  for (const t of targets) {
    if (t.kind === "transaction") {
      const tx = await db.transaction.findFirst({
        where: { id: t.refId, holding: { portfolio: { userId } } },
        select: { id: true },
      });
      if (!tx) throw new Error("Portfolio transaction not found");
    } else {
      const fee = await db.fee.findFirst({
        where: { id: t.refId, portfolio: { userId } },
        select: { id: true },
      });
      if (!fee) throw new Error("Fee not found");
    }
  }

  await db.reconciliation.createMany({
    data: targets.map((t) => ({
      cashTransactionId: accountTxId,
      transactionId: t.kind === "transaction" ? t.refId : null,
      feeId: t.kind === "fee" ? t.refId : null,
      matchType,
    })),
  });

  // Write category + type back using the first (dominant) target's portfolio type.
  const first = targets[0];
  let portfolioTxType: string | null = null;
  if (first.kind === "transaction") {
    const ptx = await db.transaction.findUnique({
      where: { id: first.refId },
      select: { transactionType: true },
    });
    portfolioTxType = ptx?.transactionType ?? null;
  }
  await writeBackCategoryAndType(accountTxId, userId, first.kind, portfolioTxType);

  await recomputeReconciledFlag(accountTxId);

  revalidatePath(`/accounts/${accountTx.cashAccountId}/reconcile`);
  revalidatePath(`/accounts/${accountTx.cashAccountId}`);
}

/** Remove a single reconciliation link (re-evaluates the reconciled flag). */
export async function unreconcile(reconciliationId: string) {
  const userId = await requireUser();

  const rec = await db.reconciliation.findFirst({
    where: { id: reconciliationId, cashTransaction: { cashAccount: { userId } } },
    select: { id: true, cashTransactionId: true },
  });
  if (!rec) throw new Error("Reconciliation not found");

  await db.reconciliation.delete({ where: { id: reconciliationId } });
  await recomputeReconciledFlag(rec.cashTransactionId);

  const tx = await db.cashTransaction.findUnique({
    where: { id: rec.cashTransactionId },
    select: { cashAccountId: true },
  });
  if (tx) {
    revalidatePath(`/accounts/${tx.cashAccountId}/reconcile`);
    revalidatePath(`/accounts/${tx.cashAccountId}`);
  }
}
