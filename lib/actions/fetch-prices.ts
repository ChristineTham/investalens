"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { yahooFinance } from "@/lib/providers/yahoo-finance";
import { checkUserCooldown, setUserCooldown } from "@/lib/providers/rate-limiter";
import { BENCHMARKS } from "@/lib/constants/benchmarks";

const MAX_CONCURRENT = 2; // Keep low to respect rate limits

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

  // 1. Seed benchmark instruments to make sure they exist in the DB
  const benchmarkData = [
    { code: "^AXJO", marketCode: "ASX", name: "S&P/ASX 200", instrumentType: "INDEX", currency: "AUD", country: "AU" },
    { code: "IOZ.AX", marketCode: "ASX", name: "iShares Core S&P/ASX 200 ETF", instrumentType: "ETF", currency: "AUD", country: "AU" },
    { code: "^GSPC", marketCode: "NYSE", name: "S&P 500", instrumentType: "INDEX", currency: "USD", country: "US" },
    { code: "URTH", marketCode: "NYSE", name: "MSCI World ETF", instrumentType: "ETF", currency: "USD", country: "US" },
    { code: "STW.AX", marketCode: "ASX", name: "SPDR S&P/ASX 200 Fund", instrumentType: "ETF", currency: "AUD", country: "AU" },
    { code: "SPY", marketCode: "NYSE", name: "SPDR S&P 500 ETF Trust", instrumentType: "ETF", currency: "USD", country: "US" },
  ];

  for (const b of benchmarkData) {
    await db.instrument.upsert({
      where: { code_marketCode: { code: b.code, marketCode: b.marketCode } },
      update: { name: b.name, instrumentType: b.instrumentType },
      create: b,
    });
  }

  // 2. Fetch prices for benchmark instruments (5 years of history)
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setFullYear(fromDate.getFullYear() - 5);

  const benchmarks = await db.instrument.findMany({
    where: {
      instrumentType: { in: ["INDEX", "ETF"] },
      code: { in: Object.keys(BENCHMARKS) },
    },
    select: { id: true, code: true, marketCode: true },
  });

  for (const benchmark of benchmarks) {
    // Check if we already have prices
    const latestPrice = await db.price.findFirst({
      where: { instrumentId: benchmark.id },
      orderBy: { date: "desc" },
      select: { date: true },
    });

    const fetchFrom = latestPrice
      ? new Date(latestPrice.date.getTime() + 86400000)
      : fromDate;

    if (fetchFrom < toDate) {
      const prices = await yahooFinance.getHistoricalPrices(
        benchmark.code,
        benchmark.marketCode,
        fetchFrom,
        toDate
      );

      for (const p of prices) {
        const date = new Date(p.date);
        date.setHours(0, 0, 0, 0);

        try {
          await db.price.upsert({
            where: { instrumentId_date: { instrumentId: benchmark.id, date } },
            create: {
              instrumentId: benchmark.id,
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
        } catch {
          // ignore
        }
      }
    }
  }

  // 3. Fetch prices for holdings
  const holdings = await db.holding.findMany({
    where: {
      portfolio: { userId: session.user.id },
    },
    include: {
      instrument: { select: { id: true, code: true, marketCode: true, currency: true } },
      transactions: true,
    },
  });

  let fetched = 0;
  let failed = 0;

  for (let i = 0; i < holdings.length; i += MAX_CONCURRENT) {
    const batch = holdings.slice(i, i + MAX_CONCURRENT);

    const results = await Promise.allSettled(
      batch.map(async (holding) => {
        const inst = holding.instrument;

        // Find the earliest transaction date for this holding
        const earliestTxDate = holding.transactions.reduce((earliest, tx) => {
          return tx.tradeDate < earliest ? tx.tradeDate : earliest;
        }, new Date());

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
          : earliestTxDate;

        let inserted = 0;

        // Fetch prices if needed
        if (from < now) {
          const prices = await yahooFinance.getHistoricalPrices(
            inst.code,
            inst.marketCode,
            from,
            now
          );

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
              // ignore
            }
          }
        }

        // Find the latest dividend transaction we already have
        const latestDividend = await db.transaction.findFirst({
          where: {
            holdingId: holding.id,
            transactionType: "DIVIDEND",
          },
          orderBy: { tradeDate: "desc" },
          select: { tradeDate: true },
        });

        // Determine dividend fetch range
        const divFrom = latestDividend
          ? new Date(latestDividend.tradeDate.getTime() - 7 * 86400000)
          : earliestTxDate;

        // Fetch and process dividends since the determined range
        const dividends = await yahooFinance.getHistoricalDividends(
          inst.code,
          inst.marketCode,
          divFrom,
          now
        );

        for (const div of dividends) {
          const divDate = new Date(div.date);

          // Calculate balance before the ex-dividend date
          let balance = 0;
          for (const tx of holding.transactions) {
            const txDate = new Date(tx.tradeDate);
            txDate.setHours(0, 0, 0, 0);
            const dDate = new Date(divDate);
            dDate.setHours(0, 0, 0, 0);

            if (txDate < dDate) {
              const qty = Number(tx.quantity);
              if (["BUY", "TRANSFER_IN", "BONUS"].includes(tx.transactionType)) {
                balance += qty;
              } else if (["SELL", "TRANSFER_OUT"].includes(tx.transactionType)) {
                balance -= qty;
              } else if (tx.transactionType === "SPLIT") {
                balance *= qty;
              }
            }
          }

          if (balance <= 0) continue;

          // Check for duplicate dividend transaction within [divDate - 14 days, divDate + 45 days]
          const duplicate = await db.transaction.findFirst({
            where: {
              holdingId: holding.id,
              transactionType: "DIVIDEND",
              tradeDate: {
                gte: new Date(divDate.getTime() - 14 * 86400000),
                lte: new Date(divDate.getTime() + 45 * 86400000),
              },
            },
          });

          if (!duplicate) {
            await db.transaction.create({
              data: {
                holdingId: holding.id,
                transactionType: "DIVIDEND",
                tradeDate: divDate,
                quantity: balance,
                price: div.amount,
                brokerage: 0,
                exchangeRate: 1,
                currency: inst.currency,
                comments: "Auto-fetched dividend",
              },
            });
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
    if (i + MAX_CONCURRENT < holdings.length) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  return { fetched, failed, total: holdings.length };
}
