import "server-only";
import { db } from "@/lib/db";

export interface LatestPrice {
  close: number;
  date: Date;
}

/**
 * Latest stored price per instrument, fetched in two batched queries instead
 * of one `findFirst` per instrument (the classic N+1).
 *
 * Instruments with no prices are simply absent from the returned map.
 */
export async function getLatestPrices(
  instrumentIds: string[]
): Promise<Map<string, LatestPrice>> {
  const result = new Map<string, LatestPrice>();
  const ids = [...new Set(instrumentIds)];
  if (ids.length === 0) return result;

  // 1. Latest date per instrument.
  const latestDates = await db.price.groupBy({
    by: ["instrumentId"],
    where: { instrumentId: { in: ids } },
    _max: { date: true },
  });

  const pairs = latestDates.filter(
    (row): row is typeof row & { _max: { date: Date } } => row._max.date != null
  );
  if (pairs.length === 0) return result;

  // 2. The matching rows — (instrumentId, date) is unique, so exactly one each.
  const rows = await db.price.findMany({
    where: {
      OR: pairs.map((row) => ({
        instrumentId: row.instrumentId,
        date: row._max.date,
      })),
    },
    select: { instrumentId: true, date: true, close: true },
  });

  for (const row of rows) {
    result.set(row.instrumentId, { close: Number(row.close), date: row.date });
  }
  return result;
}
