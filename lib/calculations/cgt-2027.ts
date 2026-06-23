/**
 * Proposed 1 July 2027 CGT regime engine.
 *
 * Models the *Treasury Laws Amendment (Tax Reform No. 1) Bill 2026* (introduced
 * 28 May 2026 — **NOT YET LAW**). Used only as an opt-in projection.
 *
 * Key mechanics implemented:
 *  - **Deemed disposal & reacquisition** at 1 July 2027 for assets held on
 *    30 June 2027 ("straddle" assets). The total gain is split into:
 *      • a **pre-2027 component** taxed under existing law (incl. the 50% CGT
 *        discount where the asset was held > 12 months at 1 July 2027); and
 *      • a **post-2027 component** with a CPI-indexed cost base (no discount).
 *  - Two transition methods to set the 1 July 2027 base / split the gain:
 *      • **market_value**: pre-gain = MV@1Jul2027 − cost base; post base = MV.
 *      • **apportionment** (ATO safe harbour, default when MV is unknown):
 *        pre-gain = total gain × (days held before 1 Jul 2027 ÷ total days held).
 *  - **Pre-CGT assets** (acquired before 20 Sep 1985): pre-2027 growth stays
 *    exempt; cost base reset to MV@1Jul2027; only post-2027 growth is taxed.
 *  - **Indexation**: indexed cost base = base × (CPI at disposal ÷ CPI at the
 *    1 Jul 2027 base, or acquisition for fully post-2027 assets). Cannot create
 *    or increase a loss. Not available to foreign/temporary residents or to
 *    assets held < 12 months.
 *  - **Asymmetric losses**: losses are nominal (never indexed).
 *  - **30% minimum tax** on the post-2027 ("minimum tax capital gain") portion,
 *    topping up to an effective 30% where the marginal rate is lower. Income
 *    support recipients are exempt.
 *
 * All functions are pure (CPI injected via a CpiMap) for unit testing.
 */
import { proposedIndexationFactor, type CpiMap } from "./indexation";

/** 1 July 2027 — commencement of the proposed regime. */
export const TRANSITION_DATE = new Date("2027-07-01T00:00:00Z");

/** Assets acquired before 20 September 1985 are pre-CGT. */
export const PRE_CGT_CUTOFF = new Date("1985-09-20T00:00:00Z");

/** Statutory minimum effective tax rate on post-2027 capital gains. */
export const MINIMUM_TAX_RATE = 0.3;

export type TransitionMethod = "market_value" | "apportionment";

const DAY_MS = 1000 * 60 * 60 * 24;
function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / DAY_MS);
}

function discountRateFor(taxEntityType: string, isForeignResident: boolean): number {
  return cgtDiscountRate(taxEntityType, isForeignResident);
}

/** CGT discount rate by entity type (0 for foreign residents and companies). */
export function cgtDiscountRate(
  taxEntityType: string,
  isForeignResident: boolean
): number {
  if (isForeignResident) return 0;
  switch (taxEntityType) {
    case "individual":
    case "trust":
      return 0.5;
    case "smsf":
      return 1 / 3;
    default:
      return 0; // company / other
  }
}

export interface Cgt2027Input {
  acquisitionDate: Date;
  disposalDate: Date;
  costBase: number;
  proceeds: number;
  taxEntityType: string;
  isForeignResident?: boolean;
  /** Market value at 1 July 2027 (required for market_value method & pre-CGT). */
  marketValueAt2027?: number;
  /** Preferred transition method; defaults to apportionment when MV is absent. */
  transitionMethod?: TransitionMethod;
  cpi: CpiMap;
}

export interface Cgt2027Result {
  isPreCgt: boolean;
  isStraddle: boolean;
  methodUsed: TransitionMethod | "none";
  /** Pre-2027 component (existing law). */
  preGrossGain: number;
  preDiscount: number;
  preAssessable: number;
  /** Post-2027 component (indexed). */
  postBaseCostBase: number;
  postIndexationFactor: number;
  postIndexedCostBase: number;
  postGrossGain: number;
  postAssessable: number;
  /** Combined assessable gain (pre + post). */
  totalAssessable: number;
  /** Post-2027 portion subject to the 30% minimum tax. */
  minTaxCapitalGain: number;
  notes: string[];
}

/**
 * Compute the assessable capital gain for a single parcel under the proposed
 * 2027 regime. `disposalDate` is expected to be on/after 1 July 2027; earlier
 * disposals are unaffected by the new regime and should use the current-law
 * engine instead.
 */
export function assessableUnder2027(input: Cgt2027Input): Cgt2027Result {
  const {
    acquisitionDate,
    disposalDate,
    costBase,
    proceeds,
    taxEntityType,
    isForeignResident = false,
    marketValueAt2027,
    transitionMethod,
    cpi,
  } = input;

  const notes: string[] = [];
  const isPreCgt = acquisitionDate.getTime() < PRE_CGT_CUTOFF.getTime();
  const isStraddle = acquisitionDate.getTime() < TRANSITION_DATE.getTime();
  const totalHoldingDays = daysBetween(acquisitionDate, disposalDate);
  const heldAtLeast12m = totalHoldingDays >= 365;

  // Post-component indexation factor (CPI from the base date to disposal).
  // Indexation under the proposed regime is available only to resident
  // individuals and trusts; companies and super funds keep existing settings.
  const indexationEligibleEntity =
    taxEntityType === "individual" || taxEntityType === "trust";
  let postIndexationFactor = 1;
  if (isForeignResident) {
    notes.push("Foreign/temporary resident: no CGT indexation applies.");
  } else if (!indexationEligibleEntity) {
    notes.push(
      "Companies and super funds keep existing settings — no indexation."
    );
  } else if (!heldAtLeast12m) {
    notes.push("Held < 12 months: no CGT indexation applies.");
  } else {
    const baseDate = isStraddle ? TRANSITION_DATE : acquisitionDate;
    const f = proposedIndexationFactor(baseDate, disposalDate, cpi);
    if (f != null && f > 1) postIndexationFactor = f;
    else if (f == null) notes.push("CPI data missing for the indexation period.");
  }

  // ── Fully post-2027 asset (acquired on/after 1 July 2027) ──
  if (!isStraddle) {
    const postIndexedCostBase = costBase * postIndexationFactor;
    const postGrossGain = proceeds - costBase;
    const postAssessable =
      postGrossGain > 0 ? Math.max(0, proceeds - postIndexedCostBase) : postGrossGain;
    return {
      isPreCgt: false,
      isStraddle: false,
      methodUsed: "none",
      preGrossGain: 0,
      preDiscount: 0,
      preAssessable: 0,
      postBaseCostBase: costBase,
      postIndexationFactor,
      postIndexedCostBase,
      postGrossGain,
      postAssessable,
      totalAssessable: postAssessable,
      minTaxCapitalGain: Math.max(0, postAssessable),
      notes,
    };
  }

  // ── Straddle asset (acquired before 1 July 2027) ──
  let method: TransitionMethod;
  let postBaseCostBase: number; // deemed 1 Jul 2027 reacquisition cost base
  let preGrossGain: number;

  if (isPreCgt) {
    // Pre-CGT: cost base reset to MV@1Jul2027; pre-2027 growth exempt.
    method = "market_value";
    if (marketValueAt2027 == null) {
      notes.push(
        "Pre-CGT asset needs a 1 Jul 2027 market value; defaulting post base to proceeds (nil post-gain)."
      );
      postBaseCostBase = proceeds;
    } else {
      postBaseCostBase = marketValueAt2027;
    }
    preGrossGain = 0;
    notes.push("Pre-CGT asset: pre-1 Jul 2027 gain exempt; cost base reset to market value.");
  } else if (
    transitionMethod === "market_value" ||
    (transitionMethod == null && marketValueAt2027 != null)
  ) {
    method = "market_value";
    if (marketValueAt2027 == null) {
      notes.push("Market-value method selected but no 1 Jul 2027 value supplied; using cost base.");
      postBaseCostBase = costBase;
      preGrossGain = 0;
    } else {
      postBaseCostBase = marketValueAt2027;
      preGrossGain = marketValueAt2027 - costBase;
    }
  } else {
    // Apportionment (days-based) safe harbour.
    method = "apportionment";
    const totalGain = proceeds - costBase;
    const daysBefore = Math.max(0, daysBetween(acquisitionDate, TRANSITION_DATE));
    const totalDays = Math.max(1, totalHoldingDays);
    const preFraction = Math.min(1, daysBefore / totalDays);
    preGrossGain = totalGain * preFraction;
    postBaseCostBase = costBase + preGrossGain;
  }

  // Pre-2027 component under existing law (incl. 50% discount if eligible).
  const heldAtLeast12mAt2027 = daysBetween(acquisitionDate, TRANSITION_DATE) >= 365;
  const preRate = heldAtLeast12mAt2027
    ? discountRateFor(taxEntityType, isForeignResident)
    : 0;
  const preDiscount = preGrossGain > 0 ? preGrossGain * preRate : 0;
  const preAssessable = preGrossGain > 0 ? preGrossGain - preDiscount : preGrossGain;

  // Post-2027 component with indexation from the 1 Jul 2027 base.
  const postIndexedCostBase = postBaseCostBase * postIndexationFactor;
  const postGrossGain = proceeds - postBaseCostBase;
  const postAssessable =
    postGrossGain > 0 ? Math.max(0, proceeds - postIndexedCostBase) : postGrossGain;

  return {
    isPreCgt,
    isStraddle: true,
    methodUsed: method,
    preGrossGain,
    preDiscount,
    preAssessable,
    postBaseCostBase,
    postIndexationFactor,
    postIndexedCostBase,
    postGrossGain,
    postAssessable,
    totalAssessable: preAssessable + postAssessable,
    minTaxCapitalGain: Math.max(0, postAssessable),
    notes,
  };
}

/**
 * The 30% minimum-tax top-up on the post-2027 capital gain.
 *
 * `marginalRateOnGain` is the effective rate (0–1) the gain would otherwise bear
 * under the ordinary marginal rates. Income support recipients are exempt.
 */
export function minimumTaxTopUp(
  minTaxCapitalGain: number,
  marginalRateOnGain: number,
  incomeSupportRecipient = false
): number {
  if (incomeSupportRecipient || minTaxCapitalGain <= 0) return 0;
  if (marginalRateOnGain >= MINIMUM_TAX_RATE) return 0;
  return (MINIMUM_TAX_RATE - marginalRateOnGain) * minTaxCapitalGain;
}

export interface LossOrderingInput {
  /** Discountable pre-2027 gross gains. */
  discountGains: number;
  /** Non-discountable pre-2027 gross gains. */
  nonDiscountGains: number;
  /** Post-2027 indexed gains. */
  indexedGains: number;
  /** Total nominal capital losses (incl. carried-forward). */
  losses: number;
  /** CGT discount rate applied to remaining discountable gains. */
  discountRate: number;
}

export interface LossOrderingResult {
  preAssessable: number;
  postAssessable: number;
  totalAssessable: number;
  lossesApplied: number;
  carryForwardLoss: number;
}

/**
 * Apply capital losses under the Bill's prescribed ordering: against discount
 * (deferred) gains first, then non-discountable pre-2027 gains, then indexed
 * (post-2027) gains. The CGT discount is applied to the remaining discountable
 * gains *after* losses. Losses are nominal (never indexed).
 */
export function applyLossOrdering(input: LossOrderingInput): LossOrderingResult {
  let loss = Math.max(0, input.losses);
  const absorb = (pool: number) => {
    const p = Math.max(0, pool);
    const used = Math.min(loss, p);
    loss -= used;
    return p - used;
  };
  const remainingDiscount = absorb(input.discountGains);
  const remainingNonDiscount = absorb(input.nonDiscountGains);
  const remainingIndexed = absorb(input.indexedGains);

  const preAssessable =
    remainingDiscount * (1 - input.discountRate) + remainingNonDiscount;
  const postAssessable = remainingIndexed;
  return {
    preAssessable,
    postAssessable,
    totalAssessable: preAssessable + postAssessable,
    lossesApplied: Math.max(0, input.losses) - loss,
    carryForwardLoss: loss,
  };
}
