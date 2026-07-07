import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { getCompanyUrl, getDelistedCompanyDetails } from "@/lib/providers/delisted";
import { eodhd } from "@/lib/providers/eodhd";

/**
 * Parses listing/delisting dates in DD/MM/YYYY or DD Month YYYY format.
 */
function parseDateString(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const clean = dateStr.trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
    const [day, month, year] = clean.split("/").map(Number);
    return new Date(year, month - 1, day);
  }
  const parsed = Date.parse(clean);
  if (!isNaN(parsed)) {
    return new Date(parsed);
  }
  return null;
}

/**
 * Performs a once-off enrichment of a delisted instrument:
 * 1. Scrapes company profile/announcements from delisted.com.au.
 * 2. Fetches full daily price history from EODHD.
 * 3. Saves both to the database.
 */
export async function enrichDelistedInstrument(instrumentId: string): Promise<void> {
  const instrument = await db.instrument.findUnique({
    where: { id: instrumentId },
  });
  if (!instrument) return;

  console.log(`[Delisted Enrichment] Starting enrichment for ${instrument.code}...`);

  // 1. Fetch details from delisted.com.au
  let details = null;
  const companyUrl = await getCompanyUrl(instrument.code);
  if (companyUrl) {
    console.log(`[Delisted Enrichment] Scraped company page: ${companyUrl}`);
    details = await getDelistedCompanyDetails(companyUrl);
  }

  // 2. Save company info to InstrumentInfo
  if (details) {
    const summaryText = details.legalStatus || details.activities || "Delisted security details.";
    const infoData = {
      longName: details.longName || instrument.name,
      shortName: details.longName ? details.longName.substring(0, 80) : instrument.name,
      summary: summaryText,
      sector: details.sector,
      industry: details.activities,
      country: "Australia",
      quoteType: "DELISTED",
      exchange: "ASX",
      currency: "AUD",
      stats: { abn: details.abn, acn: details.acn, isin: details.isin } as Prisma.InputJsonValue,
      calendar: { listingDate: details.listingDate, delistingDate: details.delistingDate } as Prisma.InputJsonValue,
      news: details.newsItems as unknown as Prisma.InputJsonValue,
      fetchedAt: new Date(),
    };

    await db.instrumentInfo.upsert({
      where: { instrumentId },
      create: { instrumentId, ...infoData },
      update: infoData,
    });

    // Sync back sector/industry to the main Instrument record if missing
    await db.instrument.update({
      where: { id: instrumentId },
      data: {
        sector: instrument.sector || details.sector || undefined,
        industry: instrument.industry || details.activities || undefined,
        country: instrument.country || "Australia",
      },
    });
  } else {
    // If details scraping failed, ensure quoteType is still flagged as DELISTED
    await db.instrumentInfo.upsert({
      where: { instrumentId },
      create: {
        instrumentId,
        quoteType: "DELISTED",
        fetchedAt: new Date(),
      },
      update: {
        quoteType: "DELISTED",
        fetchedAt: new Date(),
      },
    });
  }

  // 3. Fetch historical prices from EODHD
  // Default search range start (e.g. 1980) or parsed listing date if available
  let startDate = new Date("1980-01-01");
  if (details && details.listingDate) {
    const parsedStart = parseDateString(details.listingDate);
    if (parsedStart) {
      // Go slightly before listing date to capture everything
      startDate = new Date(parsedStart.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  const endDate = new Date();

  console.log(`[Delisted Enrichment] Fetching EODHD prices from ${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`);
  try {
    const prices = await eodhd.getHistoricalPrices(instrument.code, instrument.marketCode, startDate, endDate);
    if (prices && prices.length > 0) {
      console.log(`[Delisted Enrichment] Found ${prices.length} historical prices from EODHD. Inserting...`);
      
      const priceRecords = prices.map((p) => {
        const d = new Date(p.date);
        d.setHours(0, 0, 0, 0);
        return {
          instrumentId,
          date: d,
          open: p.open,
          high: p.high,
          low: p.low,
          close: p.close,
          adjustedClose: p.adjustedClose,
          volume: BigInt(Math.round(p.volume)),
        };
      });

      await db.price.createMany({
        data: priceRecords,
        skipDuplicates: true,
      });

      console.log(`[Delisted Enrichment] Successfully saved historical prices.`);
    } else {
      console.log(`[Delisted Enrichment] No historical prices found on EODHD.`);
    }
  } catch (error) {
    console.error(`[Delisted Enrichment] Failed to fetch/save historical prices:`, error);
  }
}
