const TRADING_DAYS = 252;

export function upsideCapture(returns: number[], benchReturns: number[]): number {
  const n = Math.min(returns.length, benchReturns.length);
  let portfolioUp = 0;
  let benchUp = 0;
  let count = 0;

  for (let i = 0; i < n; i++) {
    if (benchReturns[i] > 0) {
      portfolioUp += returns[i];
      benchUp += benchReturns[i];
      count++;
    }
  }

  if (count === 0 || benchUp === 0) return 0;
  return (portfolioUp / count) / (benchUp / count);
}

export function downsideCapture(returns: number[], benchReturns: number[]): number {
  const n = Math.min(returns.length, benchReturns.length);
  let portfolioDown = 0;
  let benchDown = 0;
  let count = 0;

  for (let i = 0; i < n; i++) {
    if (benchReturns[i] < 0) {
      portfolioDown += returns[i];
      benchDown += benchReturns[i];
      count++;
    }
  }

  if (count === 0 || benchDown === 0) return 0;
  return (portfolioDown / count) / (benchDown / count);
}

export function trackingError(returns: number[], benchReturns: number[]): number {
  const n = Math.min(returns.length, benchReturns.length);
  const diffs = returns.slice(0, n).map((r, i) => r - benchReturns[i]);
  const m = diffs.reduce((s, v) => s + v, 0) / diffs.length;
  const variance =
    diffs.reduce((s, v) => s + (v - m) ** 2, 0) / (diffs.length - 1);
  return Math.sqrt(variance) * Math.sqrt(TRADING_DAYS);
}

export function informationRatio(returns: number[], benchReturns: number[]): number {
  const te = trackingError(returns, benchReturns);
  if (te === 0) return 0;
  const ar = activeReturn(returns, benchReturns);
  return ar / te;
}

export function activeReturn(returns: number[], benchReturns: number[]): number {
  const n = Math.min(returns.length, benchReturns.length);
  const portAnn =
    (returns.slice(0, n).reduce((s, v) => s + v, 0) / n) * TRADING_DAYS;
  const benchAnn =
    (benchReturns.slice(0, n).reduce((s, v) => s + v, 0) / n) * TRADING_DAYS;
  return portAnn - benchAnn;
}
