"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { DateRange } from "@/lib/calculations/performance";

export interface MultiPeriodRow {
  instrumentCode: string;
  periods: Array<{ label: string; returnPercent: number }>;
}

export async function generateMultiPeriodReport(
  portfolioId: string,
  periods: Array<{ label: string; dateRange: DateRange }>
): Promise<MultiPeriodRow[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const holdings = await db.holding.findMany({
    where: { portfolioId, portfolio: { userId: session.user.id } },
    include: { instrument: true },
  });

  const rows: MultiPeriodRow[] = [];

  for (const holding of holdings) {
    const periodReturns: MultiPeriodRow["periods"] = [];

    for (const period of periods) {
      const prices = await db.price.findMany({
        where: {
          instrumentId: holding.instrumentId,
          date: { gte: period.dateRange.from, lte: period.dateRange.to },
        },
        orderBy: { date: "asc" },
      });

      let returnPercent = 0;
      if (prices.length >= 2) {
        const first = Number(prices[0].close);
        const last = Number(prices[prices.length - 1].close);
        returnPercent = first > 0 ? ((last - first) / first) * 100 : 0;
      }

      periodReturns.push({ label: period.label, returnPercent });
    }

    rows.push({
      instrumentCode: holding.instrument.code,
      periods: periodReturns,
    });
  }

  return rows;
}
