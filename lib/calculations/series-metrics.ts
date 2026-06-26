/**
 * Pure summary metrics over a numeric value series. Used by the /models
 * comparison dashboard stat cards and reusable elsewhere. All functions are
 * defensive against short/empty series and zero/negative bases.
 */

/** Total return over the series: v[last] / v[0] − 1. */
export function totalReturn(values: number[]): number {
  if (values.length < 2) return 0;
  const first = values[0];
  if (first === 0) return 0;
  return values[values.length - 1] / first - 1;
}

/** Compound annual growth rate over `years` whole years. */
export function cagr(values: number[], years: number): number {
  if (values.length < 2 || years <= 0) return 0;
  const first = values[0];
  const last = values[values.length - 1];
  if (first <= 0 || last <= 0) return 0;
  return Math.pow(last / first, 1 / years) - 1;
}

/** Most negative peak-to-trough drawdown (a value ≤ 0, e.g. −0.23 = −23%). */
export function maxDrawdown(values: number[]): number {
  if (values.length === 0) return 0;
  let peak = values[0];
  let maxDd = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    if (peak > 0) {
      const dd = v / peak - 1;
      if (dd < maxDd) maxDd = dd;
    }
  }
  return maxDd;
}

/** Annualised volatility of daily simple returns. */
export function annualisedVol(values: number[], periodsPerYear = 252): number {
  if (values.length < 3) return 0;
  const returns: number[] = [];
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1];
    if (prev !== 0) returns.push(values[i] / prev - 1);
  }
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, r) => a + r, 0) / returns.length;
  const variance =
    returns.reduce((a, r) => a + (r - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(periodsPerYear);
}
