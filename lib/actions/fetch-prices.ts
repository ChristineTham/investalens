"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { yahooFinance } from "@/lib/providers/yahoo-finance";
import { checkUserCooldown, setUserCooldown } from "@/lib/providers/rate-limiter";

const MAX_CONCURRENT = 2; // Keep low to respect rate limits
const MAX_INSTRUMENTS = 50; // Cap per run to prevent extremely long operations

export async function fetchAllPrices(): Promise<{
  fetched: number;
  failed: number;
  total: number;
}> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Per-user cooldown check (5 minutes between runs)
  const cooldown = checkUserCooldown(session.user.id);
  if (!cooldown.allowed) {
    throw new Error(
      `Please wait ${cooldown.remainingSeconds} seconds before fetching again.`
    );
  }

  // Mark cooldown start
  setUserCooldown(session.user.id);

  // Get all instruments with active holdings for this user (capped)
  const instruments = await db.instrument.findMany({
    where: {
      holdings: { some: { portfolio: { userId: session.user.id } } },
    },
    select: { id: true, code: true, marketCode: true },
    take: MAX_INSTRUMENTS,
  });

  let fetched = 0;
  let failed = 0;

  for (let i = 0; i < instruments.length; i += MAX_CONCURRENT) {
    const batch = instruments.slice(i, i + MAX_CONCURRENT);

    const results = await Promise.allSettled(
      batch.map(async (inst) => {
        // Find the earliest transaction date for this instrument
        const earliestTx = await db.transaction.findFirst({
          where: { holding: { instrumentId: inst.id } },
          orderBy: { tradeDate: "asc" },
          select: { tradeDate: true },
        });

        // Find the latest price we already have
        const latestPrice = await db.price.findFirst({
          where: { instrumentId: inst.id },
          orderBy: { date: "desc" },
          select: { date: true },
        });

        // Determine fetch range
        const now = new Date();
        const from = latestPrice
          ? new Date(latestPrice.date.getTime() + 86400000) // day after latest
          : earliestTx
            ? earliestTx.tradeDate
            : new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

        // Skip if already up to date
        if (from >= now) return 0;

        const prices = await yahooFinance.getHistoricalPrices(
          inst.code,
          inst.marketCode,
          from,
          now
        );

        if (prices.length === 0) return 0;

        // Batch insert prices
        let inserted = 0;
        for (const p of prices) {
          const date = new Date(p.date);
          date.setHours(0, 0, 0, 0);

          try {
            await db.price.upsert({
              where: {
                instrumentId_date: { instrumentId: inst.id, date },
              },
              create: {
                instrumentId: inst.id,
                date,
                open: p.open,
                high: p.high,
                low: p.low,
                close: p.close,
                adjustedClose: p.adjustedClose,
                volume: BigInt(p.volume),
              },
              update: {
                open: p.open,
                high: p.high,
                low: p.low,
                close: p.close,
                adjustedClose: p.adjustedClose,
                volume: BigInt(p.volume),
              },
            });
            inserted++;
          } catch {
            // Skip duplicates or errors for individual prices
          }
        }

        return inserted;
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value > 0) fetched += r.value;
      else if (r.status === "rejected") failed++;
    }

    // Rate limiting between batches (3 seconds)
    if (i + MAX_CONCURRENT < instruments.length) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  return { fetched, failed, total: instruments.length };
}
