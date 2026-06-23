/**
 * CPI cost-base indexation helpers (Australian CGT).
 *
 * Used by:
 *  - the current-law **indexation method** for assets acquired before
 *    11:45am 21 September 1999 (CPI frozen at the September 1999 quarter); and
 *  - the proposed **1 July 2027 indexation regime** (no freeze).
 *
 * The indexation factor is a ratio of CPI index numbers, so any internally
 * consistent CPI series (we source RBA Statistical Table G1, All Groups CPI)
 * yields the correct factor regardless of the index reference base.
 *
 * These functions are pure (CPI values are injected via a `CpiMap`) so they can
 * be unit-tested without a database. `loadCpiMap()` is the only DB-bound helper.
 */

/** Map of CPI quarter label (`"YYYY-Qn"`) → index value. */
export type CpiMap = Map<string, number>;

/** The September 1999 quarter — the freeze point for the current-law method. */
export const SEP_1999_FREEZE_KEY = "1999-Q3";

/** 21 September 1999, 11:45am — assets acquired on/after this date cannot use
 * the current-law indexation method. */
export const INDEXATION_CUTOFF = new Date("1999-09-21T11:45:00+10:00");

/** Calendar-quarter number (1–4) for a date: Jan–Mar=1 … Oct–Dec=4. */
function quarterNumber(date: Date): number {
  return Math.floor(date.getUTCMonth() / 3) + 1;
}

/** CPI quarter label for a date, e.g. `"1999-Q3"`. */
export function cpiQuarterKey(date: Date): string {
  return `${date.getUTCFullYear()}-Q${quarterNumber(date)}`;
}

/** Last calendar day of the CPI reference quarter containing `date` (UTC). */
export function quarterEndDate(date: Date): Date {
  const q = quarterNumber(date);
  const endMonth = q * 3; // 3, 6, 9, 12
  // Day 0 of the following month = last day of `endMonth`.
  return new Date(Date.UTC(date.getUTCFullYear(), endMonth, 0));
}

/**
 * Indexation factor from two CPI index numbers, rounded to 3 decimal places.
 * Never returns less than 1 — indexation cannot create or increase a loss.
 */
export function indexationFactor(cpiAcquisition: number, cpiEvent: number): number {
  if (!cpiAcquisition || cpiAcquisition <= 0 || !cpiEvent || cpiEvent <= 0) {
    return 1;
  }
  const factor = Math.round((cpiEvent / cpiAcquisition) * 1000) / 1000;
  return factor < 1 ? 1 : factor;
}

/**
 * Current-law indexation factor for an asset acquired before 21 Sep 1999.
 * The CGT-event quarter is frozen at the September 1999 quarter.
 *
 * Returns `null` when the asset is not eligible (acquired on/after the cutoff)
 * or when CPI data is missing for either quarter.
 */
export function currentLawIndexationFactor(
  acquisitionDate: Date,
  cgtEventDate: Date,
  cpi: CpiMap
): number | null {
  if (acquisitionDate.getTime() >= INDEXATION_CUTOFF.getTime()) return null;

  const acqKey = cpiQuarterKey(acquisitionDate);

  // Freeze the event quarter at September 1999.
  const sep1999End = quarterEndDate(new Date(Date.UTC(1999, 8, 15)));
  const eventEnd = quarterEndDate(cgtEventDate);
  const frozenEnd = eventEnd.getTime() < sep1999End.getTime() ? eventEnd : sep1999End;
  const eventKey = cpiQuarterKey(frozenEnd);

  const cpiAcq = cpi.get(acqKey);
  const cpiEvent = cpi.get(eventKey);
  if (cpiAcq == null || cpiEvent == null) return null;

  return indexationFactor(cpiAcq, cpiEvent);
}

/**
 * Proposed 2027-regime indexation factor: CPI at disposal ÷ CPI at the base date
 * (acquisition, or 1 July 2027 for straddle/pre-CGT assets). No freeze.
 *
 * Returns `null` when CPI data is missing for either quarter.
 */
export function proposedIndexationFactor(
  baseDate: Date,
  disposalDate: Date,
  cpi: CpiMap
): number | null {
  const baseKey = cpiQuarterKey(baseDate);
  const disposalKey = cpiQuarterKey(disposalDate);

  const cpiBase = cpi.get(baseKey);
  const cpiDisposal = cpi.get(disposalKey);
  if (cpiBase == null || cpiDisposal == null) return null;

  return indexationFactor(cpiBase, cpiDisposal);
}

/** Load all CPI quarters from the database into a `CpiMap` (label → value). */
export async function loadCpiMap(): Promise<CpiMap> {
  const { db } = await import("@/lib/db");
  const rows = await db.cpiIndex.findMany({
    select: { label: true, indexValue: true },
  });
  const map: CpiMap = new Map();
  for (const r of rows) map.set(r.label, Number(r.indexValue));
  return map;
}
