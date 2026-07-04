"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { parseOfx } from "@/lib/import/ofx-parser";
import { parseQif } from "@/lib/import/qif-parser";
import { parseCsv } from "@/lib/import/csv-parser";
import { mapCashRows } from "@/lib/import/cash-mapper";
import { getCashTemplate } from "@/lib/import/templates";
import {
  CREDIT_TYPES,
  importHash,
  type BankStatementTransaction,
} from "@/lib/import/bank-statement";
import { suggestCategoryId, normaliseNarrative } from "@/lib/import/categorise";
import { recomputeAccountBalance } from "@/lib/services/accounts";
import { autoReconcileAccount } from "@/lib/services/reconciliation";

export type ImportKind = "ofx" | "qif" | "csv";

export interface ImportPreviewRow {
  date: string; // YYYY-MM-DD
  amount: number; // signed
  type: string;
  description: string;
  fitId: string | null;
  importHash: string;
  isDuplicate: boolean;
  /** True when this row reconciles with an existing transfer/mirror in the account. */
  matchedTransfer: boolean;
  suggestedCategoryId: string | null;
}

export interface ImportPreview {
  rows: ImportPreviewRow[];
  total: number;
  duplicates: number;
  detectedAccount?: { bankId?: string; acctId?: string; currency?: string };
}

export interface CommitRow {
  date: string;
  amount: number; // signed
  type: string;
  description: string;
  fitId: string | null;
  importHash: string;
  categoryId: string | null;
}

/** Tolerances for reconciling an imported row against an existing transfer/mirror. */
const TRANSFER_AMOUNT_TOLERANCE = 0.01;
const TRANSFER_DAY_WINDOW = 3;

/** An existing transfer/mirror row an imported statement line could reconcile with. */
interface TransferCandidate {
  id: string;
  type: string;
  amount: number; // positive magnitude
  date: Date;
  description: string | null;
  fitId: string | null;
  importHash: string | null;
}

/** Normalised tokens of a description, for lightweight similarity scoring. */
function descriptionTokens(text: string | null | undefined): Set<string> {
  return new Set(
    (text ?? "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 1)
  );
}

/** Shared-token count between two descriptions — a cheap relevance score. */
function descriptionOverlap(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  const ta = descriptionTokens(a);
  if (ta.size === 0) return 0;
  const tb = descriptionTokens(b);
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared;
}

/**
 * Choose the more descriptive of two transaction descriptions. An imported bank
 * narrative is usually richer than a mirror's copied description, so prefer the
 * non-empty, longer (more informative) text.
 */
function betterDescription(
  a: string | null | undefined,
  b: string | null | undefined
): string | null {
  const ta = (a ?? "").trim();
  const tb = (b ?? "").trim();
  if (!ta) return tb || null;
  if (!tb) return ta || null;
  return tb.length > ta.length ? tb : ta;
}

/**
 * Find an existing transfer/mirror transaction that an imported row represents.
 *
 * A bank statement re-states transfers that were already recorded as mirror rows
 * (created when the counterparty account logged the transfer). Those mirror rows
 * carry no `fitId`/`importHash`, so exact dedup misses them. This performs the
 * same tolerant match the transfer-linking path uses (±$0.01, ±3 days, matching
 * direction) so the import reconciles instead of inserting a duplicate. Among
 * otherwise equally-close candidates, the one whose description best overlaps the
 * imported row wins.
 *
 * Matched candidates are added to `claimed` so two import rows can't both take
 * the same existing transfer.
 */
function matchTransferCandidate(
  row: { date: Date; amount: number; description: string | null },
  candidates: TransferCandidate[],
  claimed: Set<string>
): TransferCandidate | null {
  const rowIsCredit = row.amount >= 0;
  const magnitude = Math.abs(row.amount);
  let best: TransferCandidate | null = null;
  let bestDayDiff = Infinity;
  let bestOverlap = -1;
  for (const c of candidates) {
    if (claimed.has(c.id)) continue;
    // Direction must match: a credit import reconciles with a credit transfer.
    if (CREDIT_TYPES.has(c.type) !== rowIsCredit) continue;
    if (Math.abs(c.amount - magnitude) > TRANSFER_AMOUNT_TOLERANCE) continue;
    const dayDiff =
      Math.abs(c.date.getTime() - row.date.getTime()) / 86_400_000;
    if (dayDiff > TRANSFER_DAY_WINDOW) continue;
    const overlap = descriptionOverlap(c.description, row.description);
    // Prefer the closest date; break ties by stronger description overlap.
    if (
      dayDiff < bestDayDiff ||
      (dayDiff === bestDayDiff && overlap > bestOverlap)
    ) {
      bestDayDiff = dayDiff;
      bestOverlap = overlap;
      best = c;
    }
  }
  if (best) claimed.add(best.id);
  return best;
}

/** Select the transfer/mirror rows an import could reconcile against. */
function toTransferCandidates(
  rows: {
    id: string;
    type: string;
    amount: unknown;
    date: Date;
    description: string | null;
    fitId: string | null;
    importHash: string | null;
    source: string;
    transferAccountId: string | null;
  }[]
): TransferCandidate[] {
  return rows
    .filter((r) => r.source === "mirror" || r.transferAccountId != null)
    .map((r) => ({
      id: r.id,
      type: r.type,
      amount: Number(r.amount),
      date: r.date,
      description: r.description,
      fitId: r.fitId,
      importHash: r.importHash,
    }));
}

async function ownPhysicalAccount(accountId: string) {
  const user = await requireUser();
  const account = await db.cashAccount.findFirst({
    where: { id: accountId, userId: user.id },
  });
  if (!account) throw new Error("Account not found");
  if (account.isVirtual)
    throw new Error("Virtual accounts cannot import statements");
  return { account, userId: user.id };
}

/** Parse a statement file into signed transactions for the given kind. */
function parseStatement(
  fileText: string,
  kind: ImportKind,
  csvTemplateId?: string
): {
  transactions: BankStatementTransaction[];
  detectedAccount?: ImportPreview["detectedAccount"];
} {
  if (kind === "ofx") {
    const r = parseOfx(fileText);
    return { transactions: r.transactions, detectedAccount: r.account };
  }
  if (kind === "qif") {
    return { transactions: parseQif(fileText).transactions };
  }
  // csv
  const config = getCashTemplate(csvTemplateId || "generic_bank");
  if (!config) throw new Error("Unknown CSV template");
  const { rows } = parseCsv(fileText);
  const { transactions } = mapCashRows(rows, config);
  // mapCashRows returns positive amounts + canonical type → convert to signed.
  return {
    transactions: transactions.map((t) => ({
      date: t.date,
      amount: CREDIT_TYPES.has(t.type) ? t.amount : -t.amount,
      type: t.type,
      description: t.description,
    })),
  };
}

export async function previewAccountImport(
  accountId: string,
  fileText: string,
  kind: ImportKind,
  csvTemplateId?: string
): Promise<ImportPreview> {
  const { userId } = await ownPhysicalAccount(accountId);

  const { transactions, detectedAccount } = parseStatement(
    fileText,
    kind,
    csvTemplateId
  );

  const [categories, existing] = await Promise.all([
    db.cashCategory.findMany({
      where: { userId },
      select: { id: true, name: true },
    }),
    db.cashTransaction.findMany({
      where: { cashAccountId: accountId },
      select: {
        id: true,
        type: true,
        amount: true,
        date: true,
        description: true,
        fitId: true,
        importHash: true,
        source: true,
        transferAccountId: true,
      },
    }),
  ]);

  // Carry-forward: learn category by merchant narrative from previously
  // categorised transactions across the user's accounts (most recent wins).
  const categorised = await db.cashTransaction.findMany({
    where: { cashAccount: { userId }, categoryId: { not: null } },
    select: { description: true, categoryId: true },
    orderBy: { date: "desc" },
    take: 500,
  });
  const validCategoryIds = new Set(categories.map((c) => c.id));
  const learned = new Map<string, string>();
  for (const c of categorised) {
    const key = normaliseNarrative(c.description);
    if (
      key &&
      c.categoryId &&
      validCategoryIds.has(c.categoryId) &&
      !learned.has(key)
    ) {
      learned.set(key, c.categoryId);
    }
  }

  const existingFit = new Set(
    existing.map((e) => e.fitId).filter(Boolean) as string[]
  );
  const existingHash = new Set(
    existing.map((e) => e.importHash).filter(Boolean) as string[]
  );
  const transferCandidates = toTransferCandidates(existing);
  const claimedTransfers = new Set<string>();

  let duplicates = 0;
  const rows: ImportPreviewRow[] = transactions.map((t) => {
    const hash = importHash(t.date, t.amount, t.type, t.description);
    const exactDuplicate =
      (t.fitId != null && existingFit.has(t.fitId)) || existingHash.has(hash);
    // Reconcile against an existing transfer/mirror only when not an exact dup.
    const matchedTransfer =
      !exactDuplicate &&
      matchTransferCandidate(t, transferCandidates, claimedTransfers) != null;
    const isDuplicate = exactDuplicate || matchedTransfer;
    if (isDuplicate) duplicates++;
    return {
      date: t.date.toISOString().split("T")[0],
      amount: t.amount,
      type: t.type,
      description: t.description,
      fitId: t.fitId ?? null,
      importHash: hash,
      isDuplicate,
      matchedTransfer,
      suggestedCategoryId:
        learned.get(normaliseNarrative(t.description)) ??
        suggestCategoryId(t.description, t.type, categories),
    };
  });

  return { rows, total: rows.length, duplicates, detectedAccount };
}

export async function commitAccountImport(
  accountId: string,
  rows: CommitRow[]
): Promise<{ imported: number; skipped: number; reconciled: number }> {
  await ownPhysicalAccount(accountId);

  const existing = await db.cashTransaction.findMany({
    where: { cashAccountId: accountId },
    select: {
      id: true,
      type: true,
      amount: true,
      date: true,
      description: true,
      fitId: true,
      importHash: true,
      source: true,
      transferAccountId: true,
    },
  });
  const seenFit = new Set(
    existing.map((e) => e.fitId).filter(Boolean) as string[]
  );
  const seenHash = new Set(
    existing.map((e) => e.importHash).filter(Boolean) as string[]
  );
  const transferCandidates = toTransferCandidates(existing);
  const claimedTransfers = new Set<string>();

  const toCreate: CommitRow[] = [];
  // Imported rows that reconcile with an existing transfer/mirror: stamp the bank
  // identity onto the existing row instead of inserting a duplicate.
  const toReconcile: {
    id: string;
    fitId: string | null;
    importHash: string;
    description: string;
  }[] = [];
  for (const r of rows) {
    if (r.fitId && seenFit.has(r.fitId)) continue;
    if (seenHash.has(r.importHash)) continue;

    const match = matchTransferCandidate(
      { date: new Date(r.date), amount: r.amount, description: r.description },
      transferCandidates,
      claimedTransfers
    );
    if (match) {
      toReconcile.push({
        id: match.id,
        fitId: r.fitId,
        importHash: r.importHash,
        description: r.description,
      });
      continue;
    }

    if (r.fitId) seenFit.add(r.fitId);
    seenHash.add(r.importHash);
    toCreate.push(r);
  }

  // Stamp bank identity onto reconciled transfers so future imports dedup exactly,
  // and keep the more descriptive narrative (imported rows are often richer).
  for (const m of toReconcile) {
    const candidate = transferCandidates.find((c) => c.id === m.id);
    const description = betterDescription(
      candidate?.description,
      m.description
    );
    await db.cashTransaction.update({
      where: { id: m.id },
      data: {
        reconciled: true,
        ...(description !== (candidate?.description ?? null)
          ? { description }
          : {}),
        ...(candidate?.fitId == null && m.fitId ? { fitId: m.fitId } : {}),
        ...(candidate?.importHash == null ? { importHash: m.importHash } : {}),
      },
    });
  }

  if (toCreate.length > 0) {
    await db.cashTransaction.createMany({
      data: toCreate.map((r) => ({
        cashAccountId: accountId,
        type: r.type,
        amount: Math.abs(r.amount),
        date: new Date(r.date),
        description: r.description || null,
        categoryId: r.categoryId,
        fitId: r.fitId,
        importHash: r.importHash,
        source: "import",
      })),
    });
  }

  if (toCreate.length > 0 || toReconcile.length > 0) {
    await recomputeAccountBalance(accountId);
    // Auto-match newly-imported rows against linked portfolio transactions.
    autoReconcileAccount(accountId).catch(() => null);
  }

  revalidatePath(`/accounts/${accountId}`);
  return {
    imported: toCreate.length,
    skipped: rows.length - toCreate.length - toReconcile.length,
    reconciled: toReconcile.length,
  };
}
