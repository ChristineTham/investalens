"use server";

import { auth } from "@/lib/auth";
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
import { suggestCategoryId } from "@/lib/import/categorise";
import { recomputeAccountBalance } from "@/lib/services/accounts";

export type ImportKind = "ofx" | "qif" | "csv";

export interface ImportPreviewRow {
  date: string; // YYYY-MM-DD
  amount: number; // signed
  type: string;
  description: string;
  fitId: string | null;
  importHash: string;
  isDuplicate: boolean;
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

async function ownPhysicalAccount(accountId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const account = await db.cashAccount.findFirst({
    where: { id: accountId, userId: session.user.id },
  });
  if (!account) throw new Error("Account not found");
  if (account.isVirtual) throw new Error("Virtual accounts cannot import statements");
  return { account, userId: session.user.id };
}

/** Parse a statement file into signed transactions for the given kind. */
function parseStatement(
  fileText: string,
  kind: ImportKind,
  csvTemplateId?: string
): { transactions: BankStatementTransaction[]; detectedAccount?: ImportPreview["detectedAccount"] } {
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
      select: { fitId: true, importHash: true },
    }),
  ]);

  const existingFit = new Set(existing.map((e) => e.fitId).filter(Boolean) as string[]);
  const existingHash = new Set(
    existing.map((e) => e.importHash).filter(Boolean) as string[]
  );

  let duplicates = 0;
  const rows: ImportPreviewRow[] = transactions.map((t) => {
    const hash = importHash(t.date, t.amount, t.type, t.description);
    const isDuplicate =
      (t.fitId != null && existingFit.has(t.fitId)) || existingHash.has(hash);
    if (isDuplicate) duplicates++;
    return {
      date: t.date.toISOString().split("T")[0],
      amount: t.amount,
      type: t.type,
      description: t.description,
      fitId: t.fitId ?? null,
      importHash: hash,
      isDuplicate,
      suggestedCategoryId: suggestCategoryId(t.description, t.type, categories),
    };
  });

  return { rows, total: rows.length, duplicates, detectedAccount };
}

export async function commitAccountImport(
  accountId: string,
  rows: CommitRow[]
): Promise<{ imported: number; skipped: number }> {
  await ownPhysicalAccount(accountId);

  const existing = await db.cashTransaction.findMany({
    where: { cashAccountId: accountId },
    select: { fitId: true, importHash: true },
  });
  const seenFit = new Set(existing.map((e) => e.fitId).filter(Boolean) as string[]);
  const seenHash = new Set(
    existing.map((e) => e.importHash).filter(Boolean) as string[]
  );

  const toCreate: CommitRow[] = [];
  for (const r of rows) {
    if (r.fitId && seenFit.has(r.fitId)) continue;
    if (seenHash.has(r.importHash)) continue;
    if (r.fitId) seenFit.add(r.fitId);
    seenHash.add(r.importHash);
    toCreate.push(r);
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
    await recomputeAccountBalance(accountId);
  }

  revalidatePath(`/accounts/${accountId}`);
  return { imported: toCreate.length, skipped: rows.length - toCreate.length };
}
