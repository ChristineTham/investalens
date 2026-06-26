import "server-only";
import { db } from "@/lib/db";
import {
  instantiateModel,
  defaultPurchaseDate,
  type Instantiation,
} from "@/lib/services/model-portfolio";
import { getPortfolioTimeSeriesBetween } from "@/lib/services/analytics-data";
import type { ValuePoint } from "@/components/charts/portfolio-chart-utils";

type DateRange = "1Y" | "3Y" | "5Y" | "10Y" | "MAX";

function dateRangeToFrom(range: DateRange): Date {
  if (range === "MAX") return new Date(2000, 0, 1);
  const now = new Date();
  const years = parseInt(range, 10);
  now.setFullYear(now.getFullYear() - years);
  return now;
}

function toNumber(val: unknown): number {
  if (val == null) return 0;
  return Number(val);
}

// ─── Model value series (Task 4.1) ────────────────────────────────────────────

/**
 * Daily value series for an instantiated model from purchase date → today,
 * shaped as ValuePoint[] for the /models dashboard. Reuses the date grid +
 * forward-fill approach of analytics-data.ts: each point carries the model
 * Total (Σ units·price_t + residualCash) plus a per-code column.
 */
export async function getModelValueSeries(
  modelPortfolioId: string,
  opts?: { asOfDate?: Date; notionalCapital?: number; from?: Date; to?: Date }
): Promise<{ valueSeries: ValuePoint[]; instantiation: Instantiation }> {
  const inst = await instantiateModel(modelPortfolioId, {
    asOfDate: opts?.asOfDate,
    notionalCapital: opts?.notionalCapital,
  });
  const purchase = new Date(inst.asOfDate);
  const from = opts?.from ?? purchase;
  const to = opts?.to ?? new Date();

  // Only priced (valid, units > 0) holdings contribute to the value curve.
  const priced = inst.holdings.filter((h) => h.units > 0 && !h.invalid);
  const ids = priced.map((h) => h.instrumentId);

  if (ids.length === 0) {
    // No priced holdings — flat line at residual cash for the range bounds.
    const flat: ValuePoint[] = [
      { date: from.toISOString().slice(0, 10), Total: inst.residualCash },
      { date: to.toISOString().slice(0, 10), Total: inst.residualCash },
    ];
    return { valueSeries: flat, instantiation: inst };
  }

  const prices = await db.price.findMany({
    where: { instrumentId: { in: ids }, date: { gte: from, lte: to } },
    orderBy: { date: "asc" },
    select: {
      instrumentId: true,
      date: true,
      close: true,
      adjustedClose: true,
    },
  });

  // Build price lookup: instrumentId → date → price; collect the date grid.
  const priceLookup = new Map<string, Map<string, number>>();
  const allDatesSet = new Set<string>();
  for (const p of prices) {
    const dateStr = p.date.toISOString().split("T")[0];
    allDatesSet.add(dateStr);
    if (!priceLookup.has(p.instrumentId)) {
      priceLookup.set(p.instrumentId, new Map());
    }
    priceLookup
      .get(p.instrumentId)!
      .set(dateStr, toNumber(p.adjustedClose ?? p.close));
  }

  const dates = [...allDatesSet].sort();

  // Forward-fill per instrument, seeded with the purchase-date price so the
  // series starts at the instantiated value even before the first grid date.
  const lastPrice = new Map<string, number>();
  for (const h of priced) lastPrice.set(h.instrumentId, h.price);

  const valueSeries: ValuePoint[] = [];
  for (const dateStr of dates) {
    let total = inst.residualCash;
    const point: ValuePoint = { date: dateStr, Total: 0 };
    for (const h of priced) {
      const dayPrice =
        priceLookup.get(h.instrumentId)?.get(dateStr) ??
        lastPrice.get(h.instrumentId) ??
        h.price;
      lastPrice.set(h.instrumentId, dayPrice);
      const value = h.units * dayPrice;
      point[h.code] = value;
      total += value;
    }
    point.Total = total;
    valueSeries.push(point);
  }

  return { valueSeries, instantiation: inst };
}

// ─── Model returns matrix (Task 4.2) ──────────────────────────────────────────

/**
 * Returns matrix for a model in the SAME shape as getPortfolioReturnsMatrix(),
 * so it can be passed unchanged to the Python optimiser/backtester via
 * analytics-client.ts. weights = constituent targetWeights; per-asset daily
 * returns from adjustedClose.
 */
export async function getModelReturnsMatrix(
  modelPortfolioId: string,
  range: DateRange
): Promise<{
  dates: string[];
  assets: string[];
  returns: number[][];
  weights: number[];
  prices: Record<string, number[]>;
}> {
  const model = await db.modelPortfolio.findUnique({
    where: { id: modelPortfolioId },
    include: { constituents: { include: { instrument: true } } },
  });
  if (!model) throw new Error("Model portfolio not found");

  if (model.constituents.length === 0) {
    return { dates: [], assets: [], returns: [], weights: [], prices: {} };
  }

  // Range floor, but never earlier than the model's own lookback period.
  const rangeFrom = dateRangeToFrom(range);
  const lookbackFrom = defaultPurchaseDate(model.defaultLookbackYears);
  const from = rangeFrom < lookbackFrom ? rangeFrom : lookbackFrom;
  const to = new Date();

  const instrumentIds = model.constituents.map((c) => c.instrumentId);

  const allPrices = await db.price.findMany({
    where: { instrumentId: { in: instrumentIds }, date: { gte: from, lte: to } },
    orderBy: { date: "asc" },
    select: {
      instrumentId: true,
      date: true,
      close: true,
      adjustedClose: true,
    },
  });

  // Build price lookup and the date grid.
  const priceLookup = new Map<string, Map<string, number>>();
  const allDatesSet = new Set<string>();
  for (const p of allPrices) {
    const dateStr = p.date.toISOString().split("T")[0];
    allDatesSet.add(dateStr);
    if (!priceLookup.has(p.instrumentId)) {
      priceLookup.set(p.instrumentId, new Map());
    }
    priceLookup
      .get(p.instrumentId)!
      .set(dateStr, toNumber(p.adjustedClose ?? p.close));
  }

  const dates = [...allDatesSet].sort();
  const assets = model.constituents.map((c) => c.instrument.code);
  const pricesOut: Record<string, number[]> = {};
  // Weights aligned to `assets` order (byte-compatible with
  // getPortfolioReturnsMatrix, so the Python layer can consume either).
  const weights: number[] = [];

  // Per-asset forward-filled price arrays + weights.
  for (const c of model.constituents) {
    const code = c.instrument.code;
    weights.push(Number(c.targetWeight));

    const instrPrices = priceLookup.get(c.instrumentId) ?? new Map();
    const assetPrices: number[] = [];
    let lastPrice: number | null = null;
    for (const dateStr of dates) {
      const price: number = instrPrices.get(dateStr) ?? lastPrice ?? 0;
      assetPrices.push(price);
      lastPrice = price;
    }
    pricesOut[code] = assetPrices;
  }

  // Returns matrix [date_idx][asset_idx].
  const returns: number[][] = [];
  for (let d = 0; d < dates.length; d++) {
    const dayReturns: number[] = [];
    for (const c of model.constituents) {
      const assetPrices = pricesOut[c.instrument.code];
      if (d === 0 || assetPrices[d - 1] === 0) {
        dayReturns.push(0);
      } else {
        dayReturns.push(
          (assetPrices[d] - assetPrices[d - 1]) / assetPrices[d - 1]
        );
      }
    }
    returns.push(dayReturns);
  }

  return { dates, assets, returns, weights, prices: pricesOut };
}

// ─── Consolidated value series (P1c Task 1) ───────────────────────────────────

/**
 * Sum every user portfolio into a single consolidated daily value series over a
 * range, reusing getPortfolioTimeSeriesBetween(). Each portfolio is aligned to
 * the union date grid and forward-filled (carry the last known value; zero
 * before its first dated value) before summing.
 */
export async function getConsolidatedValueSeries(
  userId: string,
  range: DateRange
): Promise<ValuePoint[]> {
  const portfolios = await db.portfolio.findMany({
    where: { userId },
    select: { id: true },
  });
  if (portfolios.length === 0) return [];

  const from = dateRangeToFrom(range);
  const to = new Date();

  const seriesList = await Promise.all(
    portfolios.map((p) => getPortfolioTimeSeriesBetween(p.id, from, to))
  );

  // Union of every dated point, sorted ascending.
  const allDatesSet = new Set<string>();
  for (const s of seriesList) for (const d of s.dates) allDatesSet.add(d);
  const dates = [...allDatesSet].sort();
  if (dates.length === 0) return [];

  // Per-portfolio date → value lookup for forward-fill alignment.
  const lookups = seriesList.map((s) => {
    const map = new Map<string, number>();
    for (let i = 0; i < s.dates.length; i++) map.set(s.dates[i], s.values[i]);
    return map;
  });

  const points: ValuePoint[] = [];
  const last = new Array(lookups.length).fill(0);
  for (const date of dates) {
    let total = 0;
    for (let i = 0; i < lookups.length; i++) {
      const v = lookups[i].get(date);
      if (v != null) last[i] = v;
      total += last[i];
    }
    points.push({ date, Total: total });
  }

  return points;
}

