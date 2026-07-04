/**
 * Streaming market-data sync. Fetches share/ETF prices, FIIG bond prices and
 * company info, accepting an `emit` callback so a route handler can stream
 * per-ticker progress to the UI.
 *
 * Server-only. Not a server action (it takes a callback), so it must be called
 * from a route handler or another server module.
 */

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { yahooFinance } from "@/lib/providers/yahoo-finance";
import { eodhd } from "@/lib/providers/eodhd";
import type { PricePoint } from "@/lib/providers/market-data";
import { BENCHMARKS } from "@/lib/constants/benchmarks";
import {
  fetchFiigBondRates,
  FiigFetchError,
  type FiigBondRate,
} from "@/lib/providers/fiig-bond-rates";
import { analyticsClient } from "@/lib/services/analytics-client";
import {
  toYahooSymbol,
  supportsStockInfo,
  type StockInfoResponse,
} from "@/lib/services/stock-info";

export type SyncEvent =
  | { type: "phase"; phase: PhaseKey; label: string; total: number }
  | {
      type: "item";
      phase: PhaseKey;
      current: number;
      total: number;
      label: string;
    }
  | { type: "result"; section: PhaseKey; data: unknown }
  | { type: "error"; section: PhaseKey; message: string; diagnostics?: unknown }
  | { type: "done" };

export type PhaseKey = "shares" | "bonds" | "info";

type Emit = (event: SyncEvent) => void;

const BENCHMARK_SEED = [
  { code: "^AXJO", marketCode: "ASX", name: "S&P/ASX 200", instrumentType: "INDEX", currency: "AUD", country: "AU" },
  { code: "IOZ.AX", marketCode: "ASX", name: "iShares Core S&P/ASX 200 ETF", instrumentType: "ETF", currency: "AUD", country: "AU" },
  { code: "^GSPC", marketCode: "NYSE", name: "S&P 500", instrumentType: "INDEX", currency: "USD", country: "US" },
  { code: "URTH", marketCode: "NYSE", name: "MSCI World ETF", instrumentType: "ETF", currency: "USD", country: "US" },
  { code: "STW.AX", marketCode: "ASX", name: "SPDR S&P/ASX 200 Fund", instrumentType: "ETF", currency: "AUD", country: "AU" },
  { code: "SPY", marketCode: "NYSE", name: "SPDR S&P 500 ETF Trust", instrumentType: "ETF", currency: "USD", country: "US" },
];

// ─── Model-portfolio constituents ────────────────────────────────────────────
// Models have no transactions, so there is no earliest-trade date to anchor a
// backfill. Use a lookback-aware floor so prices cover the whole instantiation
// period (default 3y + buffer).
const MIN_MODEL_YEARS = 5;

interface ModelInstrument {
  id: string;
  code: string;
  marketCode: string;
  currency: string;
  instrumentType: string;
  /** Max instantiation lookback (years) of any model referencing this instrument. */
  maxLookback: number;
}

/**
 * Distinct instruments referenced by any model the user can see (own + system),
 * each tagged with the maximum lookback of the models that reference it.
 */
async function getModelInstruments(
  userId: string
): Promise<Map<string, ModelInstrument>> {
  const rows = await db.modelConstituent.findMany({
    where: { modelPortfolio: { OR: [{ userId }, { userId: null }] } },
    select: {
      modelPortfolio: { select: { defaultLookbackYears: true } },
      instrument: {
        select: {
          id: true,
          code: true,
          marketCode: true,
          currency: true,
          instrumentType: true,
        },
      },
    },
  });

  const map = new Map<string, ModelInstrument>();
  for (const r of rows) {
    const inst = r.instrument;
    const lookback = r.modelPortfolio.defaultLookbackYears;
    const existing = map.get(inst.id);
    if (existing) {
      existing.maxLookback = Math.max(existing.maxLookback, lookback);
    } else {
      map.set(inst.id, { ...inst, maxLookback: lookback });
    }
  }
  return map;
}

/** Lookback-aware backfill start for a model instrument with no transactions. */
function modelWindowStart(maxLookback: number, now = new Date()): Date {
  const years = Math.max(MIN_MODEL_YEARS, maxLookback + 1);
  const windowStart = new Date(now);
  windowStart.setFullYear(windowStart.getFullYear() - years);
  return windowStart;
}

// ─── Phase 1: Shares & ETFs (Yahoo Finance) ──────────────────────────────────

async function fetchHistoricalRange(
  instrumentId: string,
  code: string,
  marketCode: string,
  from: Date,
  to: Date
): Promise<number> {
  if (from >= to) return 0;
  
  let prices: PricePoint[] = [];
  try {
    prices = await yahooFinance.getHistoricalPrices(code, marketCode, from, to);
  } catch (error) {
    console.warn(`Yahoo Finance failed for ${code}.${marketCode}, will check if delisted:`, error);
  }

  // Fallback to EODHD if Yahoo Finance returned no prices, and instrument has no prices/info in DB (delisted)
  if (prices.length === 0) {
    const instrument = await db.instrument.findUnique({
      where: { id: instrumentId },
      select: { instrumentType: true }
    });
    const type = instrument?.instrumentType?.toLowerCase() || "";
    const isCompatible = !["bond", "fixed_interest", "cash", "currency"].includes(type);

    if (isCompatible) {
      console.log(`  [EODHD] ${code}.${marketCode} returned no prices on Yahoo Finance. Fetching via EODHD...`);
      try {
        prices = await eodhd.getHistoricalPrices(code, marketCode, from, to);
      } catch (error) {
        console.error(`  ✗ EODHD failed for ${code}.${marketCode}:`, error);
      }
    }
  }

  // Fetch windows always start after the latest stored date, so these rows are
  // new — a single batched insert replaces the per-row upsert loop. Existing
  // rows (if any) are left untouched via skipDuplicates.
  let inserted = 0;
  if (prices.length > 0) {
    try {
      const result = await db.price.createMany({
        data: prices.map((p) => {
          const date = new Date(p.date);
          date.setHours(0, 0, 0, 0);
          return {
            instrumentId,
            date,
            open: p.open,
            high: p.high,
            low: p.low,
            close: p.close,
            adjustedClose: p.adjustedClose,
            volume: BigInt(p.volume),
          };
        }),
        skipDuplicates: true,
      });
      inserted = result.count;
    } catch {
      /* ignore insert errors, matching the old per-row behaviour */
    }
  }
  return inserted;
}

export async function syncSharePrices(
  userId: string,
  emit: Emit
): Promise<{ fetched: number; failed: number; total: number }> {
  // Seed benchmark instruments
  for (const b of BENCHMARK_SEED) {
    await db.instrument.upsert({
      where: { code_marketCode: { code: b.code, marketCode: b.marketCode } },
      update: { name: b.name, instrumentType: b.instrumentType },
      create: b,
    });
  }

  const benchmarks = await db.instrument.findMany({
    where: {
      instrumentType: { in: ["INDEX", "ETF"] },
      code: { in: Object.keys(BENCHMARKS) },
    },
    select: { id: true, code: true, marketCode: true },
  });

  const holdings = await db.holding.findMany({
    where: { portfolio: { userId } },
    include: {
      instrument: { select: { id: true, code: true, marketCode: true, currency: true } },
      transactions: true,
    },
  });

  // Model constituents (own + system) that are equities/ETFs and not already
  // covered by a benchmark or holding above. Deduped to avoid double-fetching.
  const coveredIds = new Set<string>([
    ...benchmarks.map((b) => b.id),
    ...holdings.map((h) => h.instrument.id),
  ]);
  const modelInstruments = await getModelInstruments(userId);
  const modelShareList = [...modelInstruments.values()].filter(
    (m) =>
      !coveredIds.has(m.id) &&
      !["bond", "fixed_interest"].includes(m.instrumentType)
  );

  const total = benchmarks.length + holdings.length + modelShareList.length;
  emit({ type: "phase", phase: "shares", label: "Shares & ETFs", total });

  let fetched = 0;
  let failed = 0;
  let current = 0;
  const now = new Date();
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  // Benchmarks first
  for (const benchmark of benchmarks) {
    current++;
    emit({ type: "item", phase: "shares", current, total, label: benchmark.code });
    try {
      const latest = await db.price.findFirst({
        where: { instrumentId: benchmark.id },
        orderBy: { date: "desc" },
        select: { date: true },
      });
      const from = latest
        ? new Date(latest.date.getTime() + 86400000)
        : fiveYearsAgo;
      const n = await fetchHistoricalRange(
        benchmark.id,
        benchmark.code,
        benchmark.marketCode,
        from,
        now
      );
      fetched += n;
    } catch {
      failed++;
    }
  }

  // Holdings
  for (const holding of holdings) {
    current++;
    const inst = holding.instrument;
    emit({ type: "item", phase: "shares", current, total, label: inst.code });

    try {
      const info = await db.instrumentInfo.findUnique({
        where: { instrumentId: inst.id },
        select: { quoteType: true },
      });
      if (info?.quoteType === "DELISTED") {
        const priceCount = await db.price.count({ where: { instrumentId: inst.id } });
        if (priceCount > 0) {
          continue;
        }
      }
      const earliestTxDate = holding.transactions.reduce(
        (earliest, tx) => (tx.tradeDate < earliest ? tx.tradeDate : earliest),
        new Date()
      );

      const latestPrice = await db.price.findFirst({
        where: { instrumentId: inst.id },
        orderBy: { date: "desc" },
        select: { date: true },
      });
      const from = latestPrice
        ? new Date(latestPrice.date.getTime() + 86400000)
        : earliestTxDate;

      fetched += await fetchHistoricalRange(
        inst.id,
        inst.code,
        inst.marketCode,
        from,
        now
      );

      // Dividends → auto DIVIDEND transactions
      const latestDividend = await db.transaction.findFirst({
        where: { holdingId: holding.id, transactionType: "DIVIDEND" },
        orderBy: { tradeDate: "desc" },
        select: { tradeDate: true },
      });
      const divFrom = latestDividend
        ? new Date(latestDividend.tradeDate.getTime() - 7 * 86400000)
        : earliestTxDate;

      const dividends = await yahooFinance.getHistoricalDividends(
        inst.code,
        inst.marketCode,
        divFrom,
        now
      );

      for (const div of dividends) {
        const divDate = new Date(div.date);
        let balance = 0;
        for (const tx of holding.transactions) {
          const txDate = new Date(tx.tradeDate);
          txDate.setHours(0, 0, 0, 0);
          const dDate = new Date(divDate);
          dDate.setHours(0, 0, 0, 0);
          if (txDate < dDate) {
            const qty = Number(tx.quantity);
            if (["BUY", "TRANSFER_IN", "BONUS"].includes(tx.transactionType)) balance += qty;
            else if (["SELL", "TRANSFER_OUT"].includes(tx.transactionType)) balance -= qty;
            else if (tx.transactionType === "SPLIT") balance *= qty;
          }
        }
        if (balance <= 0) continue;

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
    } catch {
      failed++;
    }
  }

  // Model-only constituents: fetch prices only (no dividend auto-posting —
  // that logic is holding-specific). Lookback-aware backfill start.
  for (const m of modelShareList) {
    current++;
    emit({ type: "item", phase: "shares", current, total, label: m.code });
    try {
      const info = await db.instrumentInfo.findUnique({
        where: { instrumentId: m.id },
        select: { quoteType: true },
      });
      if (info?.quoteType === "DELISTED") {
        const priceCount = await db.price.count({ where: { instrumentId: m.id } });
        if (priceCount > 0) {
          continue;
        }
      }
      const latestPrice = await db.price.findFirst({
        where: { instrumentId: m.id },
        orderBy: { date: "desc" },
        select: { date: true },
      });
      const from = latestPrice
        ? new Date(latestPrice.date.getTime() + 86400000)
        : modelWindowStart(m.maxLookback, now);
      fetched += await fetchHistoricalRange(
        m.id,
        m.code,
        m.marketCode,
        from,
        now
      );
    } catch {
      failed++;
    }
  }

  const result = { fetched, failed, total: holdings.length + modelShareList.length };
  emit({ type: "result", section: "shares", data: result });
  return result;
}

// ─── Phase 2: Bonds (FIIG rate sheet) ────────────────────────────────────────

async function getFallbackClose(instrumentId: string): Promise<number | null> {
  const latest = await db.price.findFirst({
    where: { instrumentId },
    orderBy: { date: "desc" },
    select: { close: true },
  });
  if (latest) return Number(latest.close);
  const buy = await db.transaction.findFirst({
    where: {
      holding: { instrumentId },
      transactionType: { in: ["BUY", "TRANSFER_IN"] },
    },
    orderBy: { tradeDate: "desc" },
    select: { price: true },
  });
  return buy ? Number(buy.price) : null;
}

export interface BondSyncResult {
  matched: number;
  updated: number;
  unmatched: number;
  carriedForward: number;
  totalBonds: number;
  rateSheetCount: number;
  unmatchedCodes: string[];
}

export async function syncBondPrices(
  userId: string,
  emit: Emit
): Promise<BondSyncResult | null> {
  const holdings = await db.holding.findMany({
    where: {
      portfolio: { userId },
      instrument: { instrumentType: { in: ["bond", "fixed_interest"] } },
    },
    select: {
      instrument: {
        select: { id: true, code: true, couponRate: true, maturityDate: true, sector: true },
      },
    },
  });

  const instruments = new Map<string, (typeof holdings)[number]["instrument"]>();
  for (const h of holdings) instruments.set(h.instrument.id, h.instrument);

  // Model constituents (own + system) that are bonds/fixed interest, deduped
  // against the holding bonds above.
  const modelBondRows = await db.modelConstituent.findMany({
    where: {
      modelPortfolio: { OR: [{ userId }, { userId: null }] },
      instrument: { instrumentType: { in: ["bond", "fixed_interest"] } },
    },
    select: {
      instrument: {
        select: { id: true, code: true, couponRate: true, maturityDate: true, sector: true },
      },
    },
  });
  for (const r of modelBondRows) instruments.set(r.instrument.id, r.instrument);

  const list = [...instruments.values()];
  emit({ type: "phase", phase: "bonds", label: "Bond prices", total: list.length });

  if (list.length === 0) {
    const empty: BondSyncResult = {
      matched: 0,
      updated: 0,
      unmatched: 0,
      carriedForward: 0,
      totalBonds: 0,
      rateSheetCount: 0,
      unmatchedCodes: [],
    };
    emit({ type: "result", section: "bonds", data: empty });
    return empty;
  }

  let rates: Map<string, FiigBondRate>;
  try {
    rates = await fetchFiigBondRates();
  } catch (err) {
    emit({
      type: "error",
      section: "bonds",
      message: err instanceof Error ? err.message : "Failed to fetch bond prices.",
      diagnostics: err instanceof FiigFetchError ? err.diagnostics : undefined,
    });
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let matched = 0;
  let updated = 0;
  let carriedForward = 0;
  let current = 0;
  const unmatchedCodes: string[] = [];

  for (const inst of list) {
    current++;
    emit({ type: "item", phase: "bonds", current, total: list.length, label: inst.code });

    const rate = rates.get(inst.code.toUpperCase());
    if (!rate) {
      unmatchedCodes.push(inst.code);
      const fallback = await getFallbackClose(inst.id);
      if (fallback != null) {
        await db.price.upsert({
          where: { instrumentId_date: { instrumentId: inst.id, date: today } },
          create: { instrumentId: inst.id, date: today, close: fallback },
          update: {},
        });
        carriedForward++;
      }
      continue;
    }
    matched++;

    const close = rate.price / 100;
    await db.price.upsert({
      where: { instrumentId_date: { instrumentId: inst.id, date: today } },
      create: { instrumentId: inst.id, date: today, close },
      update: { close },
    });
    updated++;

    const metaUpdate: { couponRate?: number; maturityDate?: Date; sector?: string } = {};
    if (inst.couponRate == null && rate.couponDetail != null) metaUpdate.couponRate = rate.couponDetail;
    if (inst.maturityDate == null && rate.maturityDate) {
      const d = new Date(rate.maturityDate);
      if (!isNaN(d.getTime())) metaUpdate.maturityDate = d;
    }
    if (!inst.sector && rate.sector) metaUpdate.sector = rate.sector;
    if (Object.keys(metaUpdate).length > 0) {
      await db.instrument.update({ where: { id: inst.id }, data: metaUpdate });
    }
  }

  const result: BondSyncResult = {
    matched,
    updated,
    unmatched: unmatchedCodes.length,
    carriedForward,
    totalBonds: list.length,
    rateSheetCount: rates.size,
    unmatchedCodes,
  };
  emit({ type: "result", section: "bonds", data: result });
  return result;
}

// ─── Phase 3: Company info (yfinance) ─────────────────────────────────────────

function dec(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  return value == null ? undefined : (value as Prisma.InputJsonValue);
}

export async function syncStockInfo(
  userId: string,
  emit: Emit
): Promise<{ updated: number; failed: number; total: number }> {
  const holdings = await db.holding.findMany({
    where: { portfolio: { userId } },
    select: {
      instrument: {
        select: { id: true, code: true, marketCode: true, instrumentType: true },
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

  // Model constituents (own + system) so model detail/X-ray views show company
  // info. Deduped against holdings above.
  const modelInstruments = await getModelInstruments(userId);
  for (const m of modelInstruments.values()) {
    if (!instruments.has(m.id) && supportsStockInfo(m.instrumentType)) {
      instruments.set(m.id, {
        id: m.id,
        code: m.code,
        marketCode: m.marketCode,
        instrumentType: m.instrumentType,
      });
    }
  }

  const list = [...instruments.values()];
  emit({ type: "phase", phase: "info", label: "Company info", total: list.length });

  let updated = 0;
  let failed = 0;
  let current = 0;
  let firstError = "";
  let notFound = 0;
  // Per-ticker failure details for the copyable extended error log.
  const failures: { code: string; symbol: string; reason: string }[] = [];

  for (const inst of list) {
    current++;
    emit({ type: "item", phase: "info", current, total: list.length, label: inst.code });
    const symbol = toYahooSymbol(inst.code, inst.marketCode);

    try {
      const existingInfo = await db.instrumentInfo.findUnique({
        where: { instrumentId: inst.id },
        select: { quoteType: true },
      });
      if (existingInfo?.quoteType === "DELISTED") {
        continue;
      }

      const info = await analyticsClient.callFunction<StockInfoResponse>("stock-info", {
        symbol,
      });
      if (!info || !info.found) {
        if (info && !info.found) {
          await db.instrumentInfo.upsert({
            where: { instrumentId: inst.id },
            create: {
              instrumentId: inst.id,
              quoteType: "DELISTED",
              fetchedAt: new Date(),
            },
            update: {
              quoteType: "DELISTED",
              fetchedAt: new Date(),
            },
          });
        }
        failed++;
        notFound++;
        failures.push({
          code: inst.code,
          symbol,
          reason: !info ? "No response from backend" : "Backend returned found=false (no data on Yahoo)",
        });
      } else {
        const p = info.profile;
        const s = info.stats || {};
        const infoData = {
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
          stats: toJson(info.stats),
          analystTargets: toJson(info.analystTargets),
          recommendations: toJson(info.recommendations),
          upgrades: toJson(info.upgrades),
          calendar: toJson(info.calendar),
          news: toJson(info.news),
          financials: toJson(info.financials),
          actions: toJson(info.actions),
          fetchedAt: new Date(),
        };

        await db.instrumentInfo.upsert({
          where: { instrumentId: inst.id },
          create: { instrumentId: inst.id, ...infoData },
          update: infoData,
        });

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
      }
    } catch (err) {
      failed++;
      const reason = err instanceof Error ? err.message : String(err);
      if (!firstError) {
        firstError = reason;
      }
      failures.push({ code: inst.code, symbol, reason });
    }

    await new Promise((r) => setTimeout(r, 400));
  }

  // If nothing succeeded, surface the likely cause so it's not a silent "0".
  // The full per-ticker breakdown rides along as diagnostics so the client's
  // copyable error-log modal shows every failure.
  if (failed > 0) {
    const diagnostics = {
      total: list.length,
      updated,
      failed,
      backendErrors: failures.filter((f) => !f.reason.startsWith("Backend returned found=false")).length,
      notFoundOnYahoo: notFound,
      failures,
    };

    let message: string;
    if (updated === 0 && firstError) {
      message = `Company info backend error (e.g. ${list[0]?.code}): ${firstError}`;
    } else if (updated === 0 && notFound === list.length) {
      message =
        "Company info returned no data for any holding. The yfinance backend reached Yahoo but found nothing — check the Python analytics service has yfinance installed and is deployed.";
    } else {
      message = `Company info unavailable for ${failed} of ${list.length} holding${list.length === 1 ? "" : "s"}.`;
    }

    emit({ type: "error", section: "info", message, diagnostics });
  }

  const result = { updated, failed, total: list.length };
  emit({ type: "result", section: "info", data: result });
  return result;
}
