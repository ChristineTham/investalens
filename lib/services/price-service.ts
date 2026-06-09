import { db } from "@/lib/db";
import { yahooFinance } from "@/lib/providers/yahoo-finance";

const MAX_CONCURRENT = 5;

export async function fetchMissingPrices(portfolioId: string): Promise<number> {
  // Get all instruments in this portfolio
  const holdings = await db.holding.findMany({
    where: { portfolioId },
    select: { instrument: { select: { id: true, code: true, marketCode: true } } },
  });

  const instruments = holdings.map((h) => h.instrument);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find instruments without today's price
  const instrumentsNeedingPrices: typeof instruments = [];
  for (const inst of instruments) {
    const existing = await db.price.findUnique({
      where: { instrumentId_date: { instrumentId: inst.id, date: today } },
    });
    if (!existing) instrumentsNeedingPrices.push(inst);
  }

  // Fetch prices in batches
  let fetched = 0;
  for (let i = 0; i < instrumentsNeedingPrices.length; i += MAX_CONCURRENT) {
    const batch = instrumentsNeedingPrices.slice(i, i + MAX_CONCURRENT);

    await Promise.allSettled(
      batch.map(async (inst) => {
        const quote = await yahooFinance.getQuote(inst.code, inst.marketCode);
        if (quote) {
          await db.price.upsert({
            where: {
              instrumentId_date: { instrumentId: inst.id, date: today },
            },
            create: {
              instrumentId: inst.id,
              date: today,
              close: quote.price,
              volume: BigInt(quote.volume),
            },
            update: {
              close: quote.price,
              volume: BigInt(quote.volume),
            },
          });
          fetched++;
        }
      })
    );

    // Small delay between batches to avoid rate limiting
    if (i + MAX_CONCURRENT < instrumentsNeedingPrices.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return fetched;
}

export async function fetchHistoricalPrices(
  instrumentId: string,
  code: string,
  marketCode: string,
  from: Date,
  to: Date
): Promise<number> {
  const prices = await yahooFinance.getHistoricalPrices(code, marketCode, from, to);

  let stored = 0;
  for (const p of prices) {
    const date = new Date(p.date);
    date.setHours(0, 0, 0, 0);

    await db.price.upsert({
      where: { instrumentId_date: { instrumentId, date } },
      create: {
        instrumentId,
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
    stored++;
  }

  return stored;
}
