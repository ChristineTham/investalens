"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { analyticsClient } from "@/lib/services/analytics-client";
import {
  toYahooSymbol,
  supportsStockInfo,
  type StockInfoResponse,
} from "@/lib/services/stock-info";
import { revalidatePath } from "next/cache";

export interface StockInfoFetchResult {
  ok: boolean;
  updated: number;
  failed: number;
  total: number;
  error?: string;
}

function dec(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Fetch rich stock information (profile, fundamentals, analyst views, news,
 * financials, corporate actions) for the user's equity/ETF holdings via the
 * Python yfinance backend, and store it in `InstrumentInfo`.
 *
 * Bonds, cash and currencies are skipped. Failures are tolerated per holding so
 * one bad symbol never blocks the rest.
 */
export async function fetchStockInfo(): Promise<StockInfoFetchResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, updated: 0, failed: 0, total: 0, error: "Unauthorized" };
  }

  // Distinct instruments across the user's holdings that support stock info
  const holdings = await db.holding.findMany({
    where: { portfolio: { userId: session.user.id } },
    select: {
      instrument: {
        select: {
          id: true,
          code: true,
          marketCode: true,
          instrumentType: true,
        },
      },
    },
  });

  const instruments = new Map<
    string,
    { id: string; code: string; marketCode: string; instrumentType: string }
  >();
  for (const h of holdings) {
    if (supportsStockInfo(h.instrument.instrumentType)) {
      instruments.set(h.instrument.id, h.instrument);
    }
  }

  const list = [...instruments.values()];
  if (list.length === 0) {
    return { ok: true, updated: 0, failed: 0, total: 0 };
  }

  let updated = 0;
  let failed = 0;

  // Sequential with a small delay to respect Yahoo rate limits
  for (const inst of list) {
    const symbol = toYahooSymbol(inst.code, inst.marketCode);
    try {
      const info = await analyticsClient.callFunction<StockInfoResponse>(
        "stock-info",
        { symbol }
      );

      if (!info || !info.found) {
        failed++;
        continue;
      }

      const p = info.profile;
      const s = info.stats || {};

      await db.instrumentInfo.upsert({
        where: { instrumentId: inst.id },
        create: {
          instrumentId: inst.id,
          longName: p.longName,
          shortName: p.shortName,
          summary: p.summary,
          website: p.website,
          sector: p.sector,
          industry: p.industry,
          country: p.country,
          city: p.city,
          employees: p.employees ?? undefined,
          exchange: p.exchange,
          quoteType: p.quoteType,
          currency: p.currency,
          marketCap: dec(s.marketCap),
          trailingPE: dec(s.trailingPE),
          forwardPE: dec(s.forwardPE),
          priceToBook: dec(s.priceToBook),
          beta: dec(s.beta),
          eps: dec(s.trailingEps),
          dividendYield: dec(s.dividendYield),
          fiftyTwoWeekHigh: dec(s.fiftyTwoWeekHigh),
          fiftyTwoWeekLow: dec(s.fiftyTwoWeekLow),
          stats: info.stats,
          analystTargets: info.analystTargets ?? undefined,
          recommendations: info.recommendations,
          upgrades: info.upgrades,
          calendar: info.calendar ?? undefined,
          news: info.news,
          financials: info.financials ?? undefined,
          actions: info.actions ?? undefined,
          fetchedAt: new Date(),
        },
        update: {
          longName: p.longName,
          shortName: p.shortName,
          summary: p.summary,
          website: p.website,
          sector: p.sector,
          industry: p.industry,
          country: p.country,
          city: p.city,
          employees: p.employees ?? undefined,
          exchange: p.exchange,
          quoteType: p.quoteType,
          currency: p.currency,
          marketCap: dec(s.marketCap),
          trailingPE: dec(s.trailingPE),
          forwardPE: dec(s.forwardPE),
          priceToBook: dec(s.priceToBook),
          beta: dec(s.beta),
          eps: dec(s.trailingEps),
          dividendYield: dec(s.dividendYield),
          fiftyTwoWeekHigh: dec(s.fiftyTwoWeekHigh),
          fiftyTwoWeekLow: dec(s.fiftyTwoWeekLow),
          stats: info.stats,
          analystTargets: info.analystTargets ?? undefined,
          recommendations: info.recommendations,
          upgrades: info.upgrades,
          calendar: info.calendar ?? undefined,
          news: info.news,
          financials: info.financials ?? undefined,
          actions: info.actions ?? undefined,
          fetchedAt: new Date(),
        },
      });

      // Backfill sector/industry/country onto the instrument when missing
      await db.instrument.updateMany({
        where: {
          id: inst.id,
          OR: [{ sector: null }, { industry: null }, { country: null }],
        },
        data: {
          sector: p.sector ?? undefined,
          industry: p.industry ?? undefined,
          country: p.country ?? undefined,
        },
      });

      updated++;
    } catch {
      failed++;
    }

    // Gentle pacing between tickers
    await new Promise((r) => setTimeout(r, 400));
  }

  revalidatePath("/portfolio", "layout");

  return { ok: true, updated, failed, total: list.length };
}
