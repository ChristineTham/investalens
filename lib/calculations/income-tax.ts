/**
 * Australian resident income-tax calculator for the proposed 2027-28 scale.
 *
 * Used to estimate the effective marginal rate on a capital gain (for the 30%
 * minimum-tax comparison) and to compare estimated tax under the current vs
 * proposed CGT regimes. This is an estimate only — it ignores offsets (LITO,
 * franking, etc.), the Medicare levy surcharge, and other income-specific rules.
 */

export interface TaxBracket {
  /** Lower bound of the bracket (inclusive). */
  threshold: number;
  /** Marginal rate applied to income above this threshold. */
  rate: number;
}

/**
 * Projected resident marginal scale for the 2027-28 income year (the first full
 * year of the proposed CGT regime). Reflects the legislated stage-3 cuts plus
 * the announced reduction of the second rate to 14% from 1 July 2027.
 */
export const RESIDENT_SCALE_2027_28: TaxBracket[] = [
  { threshold: 0, rate: 0 },
  { threshold: 18_200, rate: 0.14 },
  { threshold: 45_000, rate: 0.3 },
  { threshold: 135_000, rate: 0.37 },
  { threshold: 190_000, rate: 0.45 },
];

/** Income bands offered to the user to indicate their other taxable income. */
export const INCOME_BANDS: { label: string; income: number }[] = [
  { label: "$0 – $18,200 (tax-free)", income: 0 },
  { label: "$18,201 – $45,000 (14%)", income: 18_201 },
  { label: "$45,001 – $135,000 (30%)", income: 45_001 },
  { label: "$135,001 – $190,000 (37%)", income: 135_001 },
  { label: "$190,001+ (45%)", income: 190_001 },
];

/** Income tax (marginal scale only) on a taxable income. */
export function incomeTax(
  taxableIncome: number,
  scale: TaxBracket[] = RESIDENT_SCALE_2027_28
): number {
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  for (let i = 0; i < scale.length; i++) {
    const lower = scale[i].threshold;
    const upper = i + 1 < scale.length ? scale[i + 1].threshold : Infinity;
    if (taxableIncome > lower) {
      tax += (Math.min(taxableIncome, upper) - lower) * scale[i].rate;
    }
  }
  return tax;
}

/**
 * Simplified Medicare levy (single, 2% with the standard low-income phase-in).
 * Ignores family thresholds and the surcharge.
 */
export function medicareLevy(taxableIncome: number): number {
  const lower = 27_222;
  const upper = 34_027;
  if (taxableIncome <= lower) return 0;
  if (taxableIncome >= upper) return taxableIncome * 0.02;
  return (taxableIncome - lower) * 0.1; // 10% phase-in of the excess over `lower`
}

/** Income tax + Medicare levy (Medicare included unless explicitly disabled). */
export function totalTax(
  taxableIncome: number,
  opts: { medicare?: boolean } = {}
): number {
  const levy = opts.medicare === false ? 0 : medicareLevy(taxableIncome);
  return incomeTax(taxableIncome) + levy;
}

/**
 * Effective marginal rate (0–1) on a capital `gain` stacked on top of
 * `otherIncome` — i.e. the extra tax the gain attracts divided by the gain.
 */
export function marginalRateOnGain(
  otherIncome: number,
  gain: number,
  opts: { medicare?: boolean } = {}
): number {
  if (gain <= 0) return 0;
  const before = totalTax(Math.max(0, otherIncome), opts);
  const after = totalTax(Math.max(0, otherIncome) + gain, opts);
  return (after - before) / gain;
}

/** Extra tax attributable to a `gain` stacked on top of `otherIncome`. */
export function taxOnGain(
  otherIncome: number,
  gain: number,
  opts: { medicare?: boolean } = {}
): number {
  if (gain <= 0) return 0;
  return (
    totalTax(Math.max(0, otherIncome) + gain, opts) -
    totalTax(Math.max(0, otherIncome), opts)
  );
}
