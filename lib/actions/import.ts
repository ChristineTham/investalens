"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseCsv } from "@/lib/import/csv-parser";
import { mapRows } from "@/lib/import/mapper";
import { findDuplicates } from "@/lib/import/dedup";
import type { ImportConfig, ImportResult } from "@/lib/import/types";
import { revalidatePath } from "next/cache";

const BATCH_SIZE = 100;

export async function importTransactions(
  portfolioId: string,
  csvContent: string,
  config: ImportConfig,
  skipDuplicates: boolean = true
): Promise<ImportResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Verify portfolio ownership
  const portfolio = await db.portfolio.findFirst({
    where: { id: portfolioId, userId: session.user.id },
  });
  if (!portfolio) throw new Error("Portfolio not found");

  // Create import job
  const importJob = await db.importJob.create({
    data: {
      portfolioId,
      source: "csv",
      status: "processing",
    },
  });

  try {
    // Parse CSV
    const { rows } = parseCsv(csvContent);

    // Map rows using config
    const { transactions: mapped, errors } = mapRows(rows, config);

    // Find duplicates
    const duplicates = await findDuplicates(portfolioId, mapped);
    const duplicateRows = new Set(duplicates.map((d) => d.row));

    // Filter out duplicates if skipDuplicates is true
    const toImport = skipDuplicates
      ? mapped.filter((_, i) => !duplicateRows.has(i + 1))
      : mapped;

    // Process in batches
    let importedCount = 0;
    for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
      const batch = toImport.slice(i, i + BATCH_SIZE);

      await db.$transaction(async (tx) => {
        for (const parsed of batch) {
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
                name: parsed.instrumentCode,
                currency: parsed.marketCode === "ASX" ? "AUD" : parsed.currency,
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

          // Create transaction
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
              importJobId: importJob.id,
            },
          });

          importedCount++;
        }
      });
    }

    // Update import job
    await db.importJob.update({
      where: { id: importJob.id },
      data: {
        status: "completed",
        totalRows: rows.length,
        importedRows: importedCount,
        rejectedRows: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        completedAt: new Date(),
      },
    });

    revalidatePath(`/portfolio/${portfolioId}`);

    return {
      imported: toImport,
      rejected: errors,
      duplicates,
    };
  } catch (error) {
    await db.importJob.update({
      where: { id: importJob.id },
      data: {
        status: "failed",
        errors: [{ message: error instanceof Error ? error.message : "Unknown error" }],
      },
    });
    throw error;
  }
}
