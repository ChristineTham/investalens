import { db } from "@/lib/db";
import type { ParsedTransaction } from "./types";

export interface DuplicateMatch {
  row: number;
  existingId: string;
}

export async function findDuplicates(
  portfolioId: string,
  transactions: ParsedTransaction[]
): Promise<DuplicateMatch[]> {
  const duplicates: DuplicateMatch[] = [];

  // Batch lookup: get all existing transactions for this portfolio
  const existingTransactions = await db.transaction.findMany({
    where: {
      holding: { portfolioId },
    },
    select: {
      id: true,
      transactionType: true,
      tradeDate: true,
      quantity: true,
      price: true,
      holding: { select: { instrument: { select: { code: true } } } },
    },
  });

  // Build a lookup key set
  const existingKeys = new Map<string, string>();
  for (const tx of existingTransactions) {
    const key = buildKey(
      tx.holding.instrument.code,
      tx.tradeDate,
      Number(tx.quantity),
      Number(tx.price),
      tx.transactionType
    );
    existingKeys.set(key, tx.id);
  }

  // Check each incoming transaction
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const key = buildKey(
      tx.instrumentCode,
      tx.tradeDate,
      tx.quantity,
      tx.price,
      tx.transactionType
    );

    const existingId = existingKeys.get(key);
    if (existingId) {
      duplicates.push({ row: i + 1, existingId });
    }
  }

  return duplicates;
}

function buildKey(
  code: string,
  date: Date,
  quantity: number,
  price: number,
  type: string
): string {
  const dateStr =
    date instanceof Date
      ? date.toISOString().split("T")[0]
      : String(date).split("T")[0];
  return `${code.toUpperCase()}|${dateStr}|${quantity}|${price}|${type}`;
}
