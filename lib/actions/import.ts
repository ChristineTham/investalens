"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseCsv } from "@/lib/import/csv-parser";
import { mapRows } from "@/lib/import/mapper";
import { mapCashRows, CASH_CREDIT_TYPES } from "@/lib/import/cash-mapper";
import { findDuplicates } from "@/lib/import/dedup";
import type {
  ImportConfig,
  ImportResult,
  ParsedTransaction,
  CashImportConfig,
  CashImportResult,
  CashParsedTransaction,
  ParsedFee,
  InstrumentMeta,
} from "@/lib/import/types";
import { revalidatePath } from "next/cache";

const BATCH_SIZE = 100;

/** A parsed transaction carries bond fields when importing fixed-interest data. */
function isBond(parsed: ParsedTransaction): boolean {
  return (
    parsed.faceValue !== undefined ||
    parsed.couponRate !== undefined ||
    parsed.maturityDate !== undefined ||
    parsed.paymentFrequency !== undefined
  );
}

async function verifyPortfolio(portfolioId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const portfolio = await db.portfolio.findFirst({
    where: { id: portfolioId, userId: session.user.id },
  });
  if (!portfolio) throw new Error("Portfolio not found");
  return portfolio;
}

/**
 * Shared persistence routine for equity / bond transactions. Always resolves
 * duplicates against previously imported transactions.
 */
async function persistTransactions(
  portfolioId: string,
  mapped: ParsedTransaction[],
  errors: ImportResult["rejected"],
  meta: { source: string; fileName?: string; template?: string; totalRows: number },
  skipDuplicates: boolean,
  instrumentMeta?: Map<string, InstrumentMeta>
): Promise<ImportResult> {
  const importJob = await db.importJob.create({
    data: {
      portfolioId,
      source: meta.source,
      status: "processing",
      fileName: meta.fileName,
      mappingTemplate: meta.template,
    },
  });

  try {
    // Always detect duplicates that already exist in the portfolio
    const duplicates = await findDuplicates(portfolioId, mapped);
    const duplicateRows = new Set(duplicates.map((d) => d.row));

    const toImport = skipDuplicates
      ? mapped.filter((_, i) => !duplicateRows.has(i + 1))
      : mapped;

    let importedCount = 0;
    for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
      const batch = toImport.slice(i, i + BATCH_SIZE);

      await db.$transaction(async (tx) => {
        for (const parsed of batch) {
          const bond = isBond(parsed);
          const extraMeta = instrumentMeta?.get(
            `${parsed.instrumentCode}|${parsed.marketCode}`
          );

          // Find or create instrument
          let instrument = await tx.instrument.findUnique({
            where: {
              code_marketCode: {
                code: parsed.instrumentCode,
                marketCode: parsed.marketCode,
              },
            },
          });

          if (!instrument) {
            instrument = await tx.instrument.create({
              data: {
                code: parsed.instrumentCode,
                marketCode: parsed.marketCode,
                name: extraMeta?.name || parsed.instrumentName || parsed.instrumentCode,
                currency:
                  extraMeta?.currency ||
                  (parsed.marketCode === "ASX" ? "AUD" : parsed.currency),
                instrumentType:
                  extraMeta?.instrumentType || (bond ? "bond" : "equity"),
                sector: extraMeta?.sector,
                faceValue: extraMeta?.faceValue ?? parsed.faceValue,
                couponRate: extraMeta?.couponRate ?? parsed.couponRate,
                paymentFrequency:
                  extraMeta?.paymentFrequency ?? parsed.paymentFrequency,
                maturityDate: extraMeta?.maturityDate ?? parsed.maturityDate,
                creditRating: extraMeta?.creditRating,
              },
            });
          } else if (bond || extraMeta) {
            // Backfill bond / static metadata on an existing instrument
            await tx.instrument.update({
              where: { id: instrument.id },
              data: {
                instrumentType:
                  extraMeta?.instrumentType ||
                  (bond ? "bond" : instrument.instrumentType),
                name: instrument.name || extraMeta?.name || parsed.instrumentName,
                sector: instrument.sector ?? extraMeta?.sector,
                faceValue:
                  instrument.faceValue ?? extraMeta?.faceValue ?? parsed.faceValue,
                couponRate:
                  instrument.couponRate ??
                  extraMeta?.couponRate ??
                  parsed.couponRate,
                paymentFrequency:
                  instrument.paymentFrequency ??
                  extraMeta?.paymentFrequency ??
                  parsed.paymentFrequency,
                maturityDate:
                  instrument.maturityDate ??
                  extraMeta?.maturityDate ??
                  parsed.maturityDate,
                creditRating: instrument.creditRating ?? extraMeta?.creditRating,
              },
            });
          }

          // Find or create holding
          let holding = await tx.holding.findUnique({
            where: {
              portfolioId_instrumentId: {
                portfolioId,
                instrumentId: instrument.id,
              },
            },
          });

          if (!holding) {
            holding = await tx.holding.create({
              data: { portfolioId, instrumentId: instrument.id },
            });
          }

          await tx.transaction.create({
            data: {
              holdingId: holding.id,
              transactionType: parsed.transactionType,
              tradeDate: parsed.tradeDate,
              quantity: parsed.quantity,
              price: parsed.price,
              brokerage: parsed.brokerage,
              exchangeRate: parsed.exchangeRate,
              currency: parsed.currency,
              comments: parsed.comments,
              accruedInterest: parsed.accruedInterest,
              importJobId: importJob.id,
            },
          });

          importedCount++;
        }
      });
    }

    await db.importJob.update({
      where: { id: importJob.id },
      data: {
        status: "completed",
        totalRows: meta.totalRows,
        importedRows: importedCount,
        rejectedRows: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        completedAt: new Date(),
      },
    });

    revalidatePath(`/portfolio/${portfolioId}`);

    return { imported: toImport, rejected: errors, duplicates };
  } catch (error) {
    await db.importJob.update({
      where: { id: importJob.id },
      data: {
        status: "failed",
        errors: [
          { message: error instanceof Error ? error.message : "Unknown error" },
        ],
      },
    });
    throw error;
  }
}

/**
 * Import equity / bond transactions from raw CSV content using a mapping config.
 * Used by the guided wizard. Always resolves duplicates.
 */
export async function importTransactions(
  portfolioId: string,
  csvContent: string,
  config: ImportConfig,
  skipDuplicates: boolean = true,
  meta?: { fileName?: string; template?: string }
): Promise<ImportResult> {
  await verifyPortfolio(portfolioId);

  const { rows } = parseCsv(csvContent);
  const { transactions: mapped, errors } = mapRows(rows, config);

  return persistTransactions(
    portfolioId,
    mapped,
    errors,
    {
      source: "csv",
      fileName: meta?.fileName,
      template: meta?.template,
      totalRows: rows.length,
    },
    skipDuplicates
  );
}

/**
 * One-step ("quick") import: parse with a known template config and import
 * immediately, resolving duplicates. No manual review step.
 */
export async function quickImportTransactions(
  portfolioId: string,
  csvContent: string,
  config: ImportConfig,
  templateId: string,
  fileName?: string
): Promise<ImportResult> {
  return importTransactions(portfolioId, csvContent, config, true, {
    fileName,
    template: templateId,
  });
}

/**
 * Persist already-parsed transactions (e.g. from a custom importer). Always
 * resolves duplicates.
 */
export async function importParsedTransactions(
  portfolioId: string,
  transactions: ParsedTransaction[],
  meta?: { fileName?: string; template?: string }
): Promise<ImportResult> {
  await verifyPortfolio(portfolioId);

  // Dates may be serialized to strings when crossing the server boundary
  const normalized = transactions.map((t) => ({
    ...t,
    tradeDate: t.tradeDate instanceof Date ? t.tradeDate : new Date(t.tradeDate),
    maturityDate: t.maturityDate
      ? t.maturityDate instanceof Date
        ? t.maturityDate
        : new Date(t.maturityDate)
      : undefined,
  }));

  return persistTransactions(
    portfolioId,
    normalized,
    [],
    {
      source: "custom",
      fileName: meta?.fileName,
      template: meta?.template,
      totalRows: normalized.length,
    },
    true
  );
}

// ─── Cash / bank statement imports ────────────────────────────────────────────

async function findCashAccount(portfolioId: string, accountName: string) {
  let account = await db.cashAccount.findFirst({
    where: { portfolioId, name: accountName },
  });
  if (!account) {
    account = await db.cashAccount.create({
      data: { portfolioId, name: accountName },
    });
  }
  return account;
}

function cashKey(t: { date: Date; amount: number; type: string; description: string }) {
  const dateStr =
    t.date instanceof Date
      ? t.date.toISOString().split("T")[0]
      : String(t.date).split("T")[0];
  return `${dateStr}|${t.amount}|${t.type}|${t.description.trim().toLowerCase()}`;
}

async function persistCashTransactions(
  portfolioId: string,
  accountName: string,
  mapped: CashParsedTransaction[],
  errors: CashImportResult["rejected"]
): Promise<CashImportResult> {
  const account = await findCashAccount(portfolioId, accountName);

  // Resolve duplicates against existing cash transactions in this account
  const existing = await db.cashTransaction.findMany({
    where: { cashAccountId: account.id },
    select: { id: true, date: true, amount: true, type: true, description: true },
  });
  const existingKeys = new Map<string, string>();
  for (const e of existing) {
    existingKeys.set(
      cashKey({
        date: e.date,
        amount: Number(e.amount),
        type: e.type,
        description: e.description ?? "",
      }),
      e.id
    );
  }

  const duplicates: CashImportResult["duplicates"] = [];
  const toImport: CashParsedTransaction[] = [];
  mapped.forEach((t, i) => {
    const existingId = existingKeys.get(cashKey(t));
    if (existingId) duplicates.push({ row: i + 1, existingId });
    else toImport.push(t);
  });

  let balanceDelta = 0;
  for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
    const batch = toImport.slice(i, i + BATCH_SIZE);
    await db.$transaction(async (tx) => {
      for (const t of batch) {
        await tx.cashTransaction.create({
          data: {
            cashAccountId: account.id,
            type: t.type,
            amount: t.amount,
            date: t.date,
            description: t.description || null,
          },
        });
        balanceDelta += CASH_CREDIT_TYPES.includes(t.type)
          ? t.amount
          : -t.amount;
      }
    });
  }

  if (balanceDelta !== 0) {
    await db.cashAccount.update({
      where: { id: account.id },
      data: { balance: { increment: balanceDelta } },
    });
  }

  revalidatePath(`/portfolio/${portfolioId}/cash`);

  return { imported: toImport, rejected: errors, duplicates };
}

/**
 * Import a bank / cash statement from raw CSV content into a named cash account.
 * Creates the account if it does not exist. Always resolves duplicates.
 */
export async function importCashTransactions(
  portfolioId: string,
  accountName: string,
  csvContent: string,
  config: CashImportConfig
): Promise<CashImportResult> {
  await verifyPortfolio(portfolioId);

  const { rows } = parseCsv(csvContent);
  const { transactions: mapped, errors } = mapCashRows(rows, config);

  return persistCashTransactions(portfolioId, accountName, mapped, errors);
}

/**
 * Persist already-parsed cash transactions (e.g. from a custom importer).
 */
export async function importParsedCashTransactions(
  portfolioId: string,
  accountName: string,
  transactions: CashParsedTransaction[]
): Promise<CashImportResult> {
  await verifyPortfolio(portfolioId);

  const normalized = transactions.map((t) => ({
    ...t,
    date: t.date instanceof Date ? t.date : new Date(t.date),
  }));

  return persistCashTransactions(portfolioId, accountName, normalized, []);
}

// ─── Bond portfolio imports (transactions + income + fees + metadata) ─────────

function normalizeTransactionDates(
  transactions: ParsedTransaction[]
): ParsedTransaction[] {
  return transactions.map((t) => ({
    ...t,
    tradeDate: t.tradeDate instanceof Date ? t.tradeDate : new Date(t.tradeDate),
    maturityDate: t.maturityDate
      ? t.maturityDate instanceof Date
        ? t.maturityDate
        : new Date(t.maturityDate)
      : undefined,
  }));
}

function feeKey(f: { invoiceNumber?: string; invoiceDate: Date; total: number }) {
  if (f.invoiceNumber) return `inv:${f.invoiceNumber}`;
  const dateStr =
    f.invoiceDate instanceof Date
      ? f.invoiceDate.toISOString().split("T")[0]
      : String(f.invoiceDate).split("T")[0];
  return `dt:${dateStr}|${f.total}`;
}

async function persistFees(
  portfolioId: string,
  fees: ParsedFee[],
  importJobId?: string
): Promise<{ imported: number; duplicates: number }> {
  if (fees.length === 0) return { imported: 0, duplicates: 0 };

  // Resolve duplicates against existing fees for this portfolio
  const existing = await db.fee.findMany({
    where: { portfolioId },
    select: { id: true, invoiceNumber: true, invoiceDate: true, total: true },
  });
  const existingKeys = new Set<string>();
  for (const e of existing) {
    existingKeys.add(
      feeKey({
        invoiceNumber: e.invoiceNumber ?? undefined,
        invoiceDate: e.invoiceDate,
        total: Number(e.total),
      })
    );
  }

  let imported = 0;
  let duplicates = 0;
  const seen = new Set<string>();

  for (const f of fees) {
    const key = feeKey(f);
    if (existingKeys.has(key) || seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    await db.fee.create({
      data: {
        portfolioId,
        feeType: f.feeType,
        invoiceNumber: f.invoiceNumber,
        invoiceDate: f.invoiceDate,
        periodStart: f.periodStart,
        periodEnd: f.periodEnd,
        chargeAmount: f.chargeAmount,
        gst: f.gst,
        total: f.total,
        currency: f.currency,
        comments: f.comments,
        importJobId,
      },
    });
    imported++;
  }

  return { imported, duplicates };
}

export interface BondImportResult {
  transactions: ImportResult;
  fees: { imported: number; duplicates: number };
}

/**
 * Import a complete bond portfolio extract: trades, income (coupons / return of
 * capital), custody fees, and instrument metadata. Used by dedicated custom
 * importers (e.g. FIIG). Always resolves duplicates.
 */
export async function importBondData(
  portfolioId: string,
  data: {
    transactions: ParsedTransaction[];
    fees?: ParsedFee[];
    instruments?: InstrumentMeta[];
  },
  meta?: { fileName?: string; template?: string }
): Promise<BondImportResult> {
  await verifyPortfolio(portfolioId);

  const normalized = normalizeTransactionDates(data.transactions);

  // Build instrument metadata lookup keyed by code|marketCode
  const instrumentMeta = new Map<string, InstrumentMeta>();
  for (const inst of data.instruments || []) {
    instrumentMeta.set(`${inst.code}|${inst.marketCode}`, {
      ...inst,
      maturityDate: inst.maturityDate
        ? inst.maturityDate instanceof Date
          ? inst.maturityDate
          : new Date(inst.maturityDate)
        : undefined,
    });
  }

  const txResult = await persistTransactions(
    portfolioId,
    normalized,
    [],
    {
      source: "custom",
      fileName: meta?.fileName,
      template: meta?.template,
      totalRows: normalized.length,
    },
    true,
    instrumentMeta
  );

  // Persist fees (normalize dates)
  const normalizedFees: ParsedFee[] = (data.fees || []).map((f) => ({
    ...f,
    invoiceDate:
      f.invoiceDate instanceof Date ? f.invoiceDate : new Date(f.invoiceDate),
    periodStart: f.periodStart
      ? f.periodStart instanceof Date
        ? f.periodStart
        : new Date(f.periodStart)
      : undefined,
    periodEnd: f.periodEnd
      ? f.periodEnd instanceof Date
        ? f.periodEnd
        : new Date(f.periodEnd)
      : undefined,
  }));
  const feeResult = await persistFees(portfolioId, normalizedFees);

  revalidatePath(`/portfolio/${portfolioId}`);
  revalidatePath(`/portfolio/${portfolioId}/bonds`);

  return { transactions: txResult, fees: feeResult };
}

