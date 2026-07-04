import {
  authenticateApiRequest,
  hasScope,
  jsonError,
  jsonSuccess,
} from "@/lib/api/middleware";
import { db } from "@/lib/db";
import { parseCsv } from "@/lib/import/csv-parser";
import { mapRows } from "@/lib/import/mapper";
import { findDuplicates } from "@/lib/import/dedup";
import type { ImportConfig } from "@/lib/import/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (auth instanceof Response) return auth;
  if (!auth)
    return jsonError("unauthorized", "Invalid or missing API token", 401);
  if (!hasScope(auth.scope, "write"))
    return jsonError("forbidden", "Insufficient scope", 403);

  const { id } = await params;

  const portfolio = await db.portfolio.findFirst({
    where: { id, userId: auth.userId },
  });
  if (!portfolio) return jsonError("not_found", "Portfolio not found", 404);

  const body = await request.json();

  if (!body.csv || !body.config) {
    return jsonError(
      "bad_request",
      "csv (string) and config (ImportConfig) are required",
      400
    );
  }

  const config: ImportConfig = body.config;

  // Parse CSV
  const { rows } = parseCsv(body.csv);
  const { transactions: mapped, errors } = mapRows(rows, config);

  if (errors.length > 0 && mapped.length === 0) {
    return jsonError("bad_request", `Parse errors: ${errors[0]}`, 400);
  }

  // Skip rows that duplicate transactions already in the portfolio
  const duplicates = await findDuplicates(id, mapped);
  const duplicateRows = new Set(duplicates.map((d) => d.row));
  const toImport = mapped.filter((_, i) => !duplicateRows.has(i + 1));

  // Import transactions
  let imported = 0;
  for (const tx of toImport) {
    // Find or create instrument
    let instrument = await db.instrument.findFirst({
      where: { code: tx.instrumentCode, marketCode: tx.marketCode || "ASX" },
    });

    if (!instrument) {
      instrument = await db.instrument.create({
        data: {
          code: tx.instrumentCode,
          marketCode: tx.marketCode || "ASX",
          name: tx.instrumentCode,
          type: "EQUITY",
          currency: tx.currency || "AUD",
        },
      });
    }

    // Find or create holding
    let holding = await db.holding.findFirst({
      where: { portfolioId: id, instrumentId: instrument.id },
    });

    if (!holding) {
      holding = await db.holding.create({
        data: { portfolioId: id, instrumentId: instrument.id },
      });
    }

    await db.transaction.create({
      data: {
        holdingId: holding.id,
        transactionType: tx.transactionType,
        tradeDate: new Date(tx.tradeDate),
        quantity: tx.quantity || 0,
        price: tx.price || 0,
        brokerage: tx.brokerage || 0,
        currency: tx.currency || "AUD",
        exchangeRate: tx.exchangeRate || 1,
        comments: tx.comments || null,
      },
    });

    imported++;
  }

  return jsonSuccess(
    { imported, errors: errors.length, total: mapped.length },
    { skippedDuplicates: duplicateRows.size }
  );
}
