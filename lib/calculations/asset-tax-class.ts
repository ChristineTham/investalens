/**
 * Australian CGT vs ordinary-income tax treatment for an instrument.
 *
 * - `"cgt"`: shares, ETFs, and **listed / exchange-traded** debt and hybrid
 *   securities (convertible notes, capital notes). Disposals are CGT events.
 * - `"income"`: **traditional** (non-listed) bonds — generally exempt from CGT
 *   under the Income Tax Assessment Act. Any discount/premium realised on sale
 *   or at maturity is **ordinary income**, declared in full with no CGT discount.
 *
 * `instrument.taxClass` ("cgt" | "income") is an explicit per-instrument
 * override. When it is null, traditional bonds (`instrumentType === "bond"`)
 * default to income treatment and everything else to CGT.
 */
export type TaxTreatment = "cgt" | "income";

export interface TaxClassifiable {
  instrumentType: string;
  taxClass?: string | null;
}

export function classifyTaxTreatment(instrument: TaxClassifiable): TaxTreatment {
  const override = instrument.taxClass?.toLowerCase();
  if (override === "cgt" || override === "income") return override;
  return instrument.instrumentType?.toLowerCase() === "bond" ? "income" : "cgt";
}

/** True when disposals of this instrument are CGT events. */
export function isCgtAsset(instrument: TaxClassifiable): boolean {
  return classifyTaxTreatment(instrument) === "cgt";
}

/** True when this instrument's gains are ordinary income (traditional bonds). */
export function isIncomeAsset(instrument: TaxClassifiable): boolean {
  return classifyTaxTreatment(instrument) === "income";
}
