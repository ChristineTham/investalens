"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { DateRange } from "@/lib/calculations/performance";

export interface DrawdownItem {
  instrumentCode: string;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  totalReturn: number;
  romad: number; // Return over Maximum Drawdown
}

export async function generateDrawdownReport(
  portfolioId: string,
  dateRange: DateRange
): Promise<DrawdownItem[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const holdings = await db.holding.findMany({
    where: { portfolioId, portfolio: { userId: session.user.id } },
    include: { instrument: true },
  });

  const items: DrawdownItem[] = [];

  for (const holding of holdings) {
    const prices = await db.price.findMany({
      where: {
        instrumentId: holding.instrumentId,
        date: { gte: dateRange.from, lte: dateRange.to },
      },
      orderBy: { date: "asc" },
    });

    if (prices.length < 2) continue;

    // Calculate max drawdown
    let peak = Number(prices[0].close);
    let maxDrawdown = 0;

    for (const p of prices) {
      const close = Number(p.close);
      if (close > peak) peak = close;
      const drawdown = (peak - close) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    const firstPrice = Number(prices[0].close);
    const lastPrice = Number(prices[prices.length - 1].close);
    const totalReturn =
      firstPrice > 0 ? (lastPrice - firstPrice) / firstPrice : 0;

    items.push({
      instrumentCode: holding.instrument.code,
      maxDrawdown: maxDrawdown * peak,
      maxDrawdownPercent: maxDrawdown * 100,
      totalReturn: totalReturn * 100,
      romad: maxDrawdown > 0 ? totalReturn / maxDrawdown : 0,
    });
  }

  return items;
}
