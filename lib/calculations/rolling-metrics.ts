const TRADING_DAYS = 252;

export interface RollingResult {
  dates: string[];
  values: number[];
}

export function rollingMetric(
  returns: number[],
  benchmarkReturns: number[],
  windowSize: number,
  metric: "sharpe" | "sortino" | "beta" | "alpha" | "tracking_error",
  dates: string[],
  riskFreeRate = 0.0435
): RollingResult {
  const dailyRf = riskFreeRate / TRADING_DAYS;
  const resultDates: string[] = [];
  const resultValues: number[] = [];

  for (let i = windowSize - 1; i < returns.length; i++) {
    const window = returns.slice(i - windowSize + 1, i + 1);
    const benchWindow = benchmarkReturns.slice(i - windowSize + 1, i + 1);

    let value: number;
    switch (metric) {
      case "sharpe":
        value = computeSharpe(window, dailyRf);
        break;
      case "sortino":
        value = computeSortino(window, dailyRf);
        break;
      case "beta":
        value = computeBeta(window, benchWindow);
        break;
      case "alpha":
        value = computeAlpha(window, benchWindow, riskFreeRate);
        break;
      case "tracking_error":
        value = computeTrackingError(window, benchWindow);
        break;
    }

    resultDates.push(dates[i]);
    resultValues.push(value);
  }

  return { dates: resultDates, values: resultValues };
}

function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function std(arr: number[]): number {
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function computeSharpe(returns: number[], dailyRf: number): number {
  const excessReturns = returns.map((r) => r - dailyRf);
  const m = mean(excessReturns);
  const s = std(excessReturns);
  return s !== 0 ? (m / s) * Math.sqrt(TRADING_DAYS) : 0;
}

function computeSortino(returns: number[], dailyRf: number): number {
  const excessReturns = returns.map((r) => r - dailyRf);
  const m = mean(excessReturns);
  const downside = excessReturns.filter((r) => r < 0);
  const downsideStd =
    downside.length > 1
      ? Math.sqrt(
          downside.reduce((s, v) => s + v ** 2, 0) / (downside.length - 1)
        )
      : 0;
  return downsideStd !== 0 ? (m / downsideStd) * Math.sqrt(TRADING_DAYS) : 0;
}

function computeBeta(returns: number[], benchReturns: number[]): number {
  const n = Math.min(returns.length, benchReturns.length);
  const rMean = mean(returns.slice(0, n));
  const bMean = mean(benchReturns.slice(0, n));

  let covariance = 0;
  let benchVariance = 0;
  for (let i = 0; i < n; i++) {
    const rDiff = returns[i] - rMean;
    const bDiff = benchReturns[i] - bMean;
    covariance += rDiff * bDiff;
    benchVariance += bDiff * bDiff;
  }

  return benchVariance !== 0 ? covariance / benchVariance : 1;
}

function computeAlpha(
  returns: number[],
  benchReturns: number[],
  annualRf: number
): number {
  const beta = computeBeta(returns, benchReturns);
  const annPortfolio = mean(returns) * TRADING_DAYS;
  const annBench = mean(benchReturns) * TRADING_DAYS;
  return annPortfolio - (annualRf + beta * (annBench - annualRf));
}

function computeTrackingError(
  returns: number[],
  benchReturns: number[]
): number {
  const n = Math.min(returns.length, benchReturns.length);
  const diffs = returns.slice(0, n).map((r, i) => r - benchReturns[i]);
  return std(diffs) * Math.sqrt(TRADING_DAYS);
}
