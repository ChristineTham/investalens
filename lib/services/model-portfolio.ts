import "server-only";
import { db } from "@/lib/db";

// ─── Instantiation types ──────────────────────────────────────────────────────

export interface InstantiatedHolding {
  instrumentId: string;
  code: string;
  marketCode: string;
  name: string;
  targetWeight: number;
  price: number; // purchase-date price (forward-filled)
  units: number; // whole units
  cost: number; // units * price
  actualWeight: number; // cost / notionalCapital
  /**
   * True when the constituent has no valid price at the purchase date (newly
   * listed) or no recent price (delisted/suspended). Such a holding must NOT
   * silently roll its allocation into residual cash — the UI surfaces it.
   */
  invalid: boolean;
}

export interface Instantiation {
  modelPortfolioId: string;
  asOfDate: string; // ISO date
  notionalCapital: number;
  holdings: InstantiatedHolding[];
  investedCash: number;
  residualCash: number;
  residualWeight: number;
  /** False when any constituent is invalid (see InstantiatedHolding.invalid). */
  valid: boolean;
  /** Codes of constituents that failed the coverage check. */
  invalidCodes: string[];
}

// ─── Coverage types ───────────────────────────────────────────────────────────

export interface ConstituentCoverage {
  instrumentId: string;
  code: string;
  firstPrice: string | null; // ISO date of earliest price
  lastPrice: string | null; // ISO date of latest price
  coversStart: boolean; // firstPrice <= periodStart (can be bought at t0)
  stale: boolean; // lastPrice older than staleDays ⇒ likely delisted
  valid: boolean; // coversStart && !stale
}

export interface ModelCoverage {
  modelPortfolioId: string;
  periodStart: string;
  valid: boolean; // every constituent valid
  constituents: ConstituentCoverage[];
  invalidCodes: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve the price for an instrument on/just-before a date (forward fill). */
async function priceAsOf(
  instrumentId: string,
  date: Date
): Promise<number | null> {
  const row = await db.price.findFirst({
    where: { instrumentId, date: { lte: date } },
    orderBy: { date: "desc" },
    select: { close: true, adjustedClose: true },
  });
  if (!row) return null;
  return Number(row.adjustedClose ?? row.close);
}

export function defaultPurchaseDate(
  lookbackYears: number,
  today = new Date()
): Date {
  const d = new Date(today);
  d.setFullYear(d.getFullYear() - lookbackYears);
  return d;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── Coverage service (Task 6) ────────────────────────────────────────────────

/**
 * A model is "valid across the period" iff every constituent has price history
 * that (a) starts on/before the purchase date and (b) is not stale (still
 * actively priced). Stale ⇒ delisted/suspended (e.g. an acquired company like
 * NCM — Newcrest, delisted 2023).
 */
export async function getModelCoverage(
  modelPortfolioId: string,
  opts?: { asOfDate?: Date; staleDays?: number }
): Promise<ModelCoverage> {
  const staleDays = opts?.staleDays ?? 10;

  const model = await db.modelPortfolio.findUnique({
    where: { id: modelPortfolioId },
    include: { constituents: { include: { instrument: true } } },
  });
  if (!model) throw new Error("Model portfolio not found");

  const periodStart =
    opts?.asOfDate ?? defaultPurchaseDate(model.defaultLookbackYears);
  const staleCutoff = new Date();
  staleCutoff.setDate(staleCutoff.getDate() - staleDays);

  const constituents: ConstituentCoverage[] = [];

  for (const c of model.constituents) {
    const first = await db.price.findFirst({
      where: { instrumentId: c.instrumentId },
      orderBy: { date: "asc" },
      select: { date: true },
    });
    const last = await db.price.findFirst({
      where: { instrumentId: c.instrumentId },
      orderBy: { date: "desc" },
      select: { date: true },
    });

    const coversStart = first ? first.date <= periodStart : false;
    const stale = last ? last.date < staleCutoff : true;
    const valid = coversStart && !stale;

    constituents.push({
      instrumentId: c.instrumentId,
      code: c.instrument.code,
      firstPrice: first ? toIsoDate(first.date) : null,
      lastPrice: last ? toIsoDate(last.date) : null,
      coversStart,
      stale,
      valid,
    });
  }

  const invalidCodes = constituents.filter((c) => !c.valid).map((c) => c.code);

  return {
    modelPortfolioId,
    periodStart: toIsoDate(periodStart),
    valid: constituents.every((c) => c.valid),
    constituents,
    invalidCodes,
  };
}

// ─── Instantiation engine (Task 3) ────────────────────────────────────────────

export async function instantiateModel(
  modelPortfolioId: string,
  opts?: { asOfDate?: Date; notionalCapital?: number; staleDays?: number }
): Promise<Instantiation> {
  const model = await db.modelPortfolio.findUnique({
    where: { id: modelPortfolioId },
    include: { constituents: { include: { instrument: true } } },
  });
  if (!model) throw new Error("Model portfolio not found");

  const notional = opts?.notionalCapital ?? Number(model.notionalCapital);
  const asOf = opts?.asOfDate ?? defaultPurchaseDate(model.defaultLookbackYears);
  // minCashWeight guarantees the reserve is *at least* that fraction; rounding
  // units down only ever increases residual cash, so the floor is respected.
  const minCash = Number(model.minCashWeight);
  const allocatable = notional * (1 - minCash);

  // Coverage powers the per-holding `invalid` flag and the overall `valid`
  // flag. A constituent that fails coverage (delisted / insufficient history)
  // must not silently roll its allocation into residual cash.
  const coverage = await getModelCoverage(modelPortfolioId, {
    asOfDate: asOf,
    staleDays: opts?.staleDays,
  });
  const coverageByInstrument = new Map(
    coverage.constituents.map((c) => [c.instrumentId, c])
  );

  const holdings: InstantiatedHolding[] = [];
  let investedCash = 0;

  for (const c of model.constituents) {
    const weight = Number(c.targetWeight);
    const cov = coverageByInstrument.get(c.instrumentId);
    const price = await priceAsOf(c.instrumentId, asOf);

    // No usable price on/before the purchase date (newly listed) or coverage
    // says delisted/stale ⇒ mark invalid; its budget falls to residual cash but
    // is surfaced via `invalid` rather than silently absorbed.
    if (!price || price <= 0 || !cov?.valid) {
      holdings.push({
        instrumentId: c.instrumentId,
        code: c.instrument.code,
        marketCode: c.instrument.marketCode,
        name: c.instrument.name,
        targetWeight: weight,
        price: price && price > 0 ? price : 0,
        units: 0,
        cost: 0,
        actualWeight: 0,
        invalid: true,
      });
      continue;
    }

    const budget = allocatable * weight;
    const units = Math.floor(budget / price); // whole units only
    const cost = units * price;
    investedCash += cost;
    holdings.push({
      instrumentId: c.instrumentId,
      code: c.instrument.code,
      marketCode: c.instrument.marketCode,
      name: c.instrument.name,
      targetWeight: weight,
      price,
      units,
      cost,
      actualWeight: cost / notional,
      invalid: false,
    });
  }

  const invalidCodes = holdings.filter((h) => h.invalid).map((h) => h.code);
  const residualCash = notional - investedCash;

  return {
    modelPortfolioId,
    asOfDate: toIsoDate(asOf),
    notionalCapital: notional,
    holdings,
    investedCash,
    residualCash,
    residualWeight: residualCash / notional,
    valid: invalidCodes.length === 0,
    invalidCodes,
  };
}

// TODO(R3): non-AUD constituents — apply ExchangeRate at the purchase date.
// P1 assumes AUD instruments only.
