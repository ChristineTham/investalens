/**
 * Risk metrics calculations: Sharpe, Sortino, Beta, Alpha, Volatility
 */

export interface RiskMetrics {
  annualisedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  beta: number;
  alpha: number;
  maxDrawdown: number;
  informationRatio: number;
  trackingError: number;
  calmarRatio: number;
  treynorRatio: number;
  omegaRatio: number;
  var5: number;
  cvar5: number;
  upsideCapture: number;
  downsideCapture: number;
  rSquared: number;
  skewness: number;
  kurtosis: number;
}

export interface DailyReturn {
  date: string;
  portfolioReturn: number;
  benchmarkReturn?: number;
}

const TRADING_DAYS_PER_YEAR = 252;
const RISK_FREE_RATE = 0.04; // 4% annual (AU cash rate approximation)

/**
 * Calculate daily returns from price series
 */
export function calculateDailyReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
  }
  return returns;
}

/**
 * Annualised return from daily returns
 */
export function annualisedReturn(dailyReturns: number[]): number {
  if (dailyReturns.length === 0) return 0;
  const totalReturn = dailyReturns.reduce((cum, r) => cum * (1 + r), 1) - 1;
  const years = dailyReturns.length / TRADING_DAYS_PER_YEAR;
  return years > 0 ? Math.pow(1 + totalReturn, 1 / years) - 1 : totalReturn;
}

/**
 * Annualised volatility (standard deviation of returns)
 */
export function annualisedVolatility(dailyReturns: number[]): number {
  if (dailyReturns.length < 2) return 0;
  const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) /
    (dailyReturns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

/**
 * Downside volatility (only negative returns)
 */
export function downsideVolatility(
  dailyReturns: number[],
  targetReturn: number = 0
): number {
  if (dailyReturns.length < 2) return 0;
  const downsideReturns = dailyReturns.filter((r) => r < targetReturn);
  if (downsideReturns.length === 0) return 0;
  const variance =
    downsideReturns.reduce((s, r) => s + Math.pow(r - targetReturn, 2), 0) /
    dailyReturns.length; // use full count as denominator
  return Math.sqrt(variance) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

/**
 * Sharpe Ratio = (Return - Rf) / Volatility
 */
export function sharpeRatio(
  annReturn: number,
  volatility: number,
  riskFreeRate: number = RISK_FREE_RATE
): number {
  if (volatility === 0) return 0;
  return (annReturn - riskFreeRate) / volatility;
}

/**
 * Sortino Ratio = (Return - Rf) / Downside Volatility
 */
export function sortinoRatio(
  annReturn: number,
  downsideVol: number,
  riskFreeRate: number = RISK_FREE_RATE
): number {
  if (downsideVol === 0) return 0;
  return (annReturn - riskFreeRate) / downsideVol;
}

/**
 * Beta = Cov(Rp, Rb) / Var(Rb)
 */
export function calculateBeta(
  portfolioReturns: number[],
  benchmarkReturns: number[]
): number {
  const n = Math.min(portfolioReturns.length, benchmarkReturns.length);
  if (n < 2) return 1;

  const pReturns = portfolioReturns.slice(0, n);
  const bReturns = benchmarkReturns.slice(0, n);

  const pMean = pReturns.reduce((s, r) => s + r, 0) / n;
  const bMean = bReturns.reduce((s, r) => s + r, 0) / n;

  let covariance = 0;
  let bVariance = 0;

  for (let i = 0; i < n; i++) {
    covariance += (pReturns[i] - pMean) * (bReturns[i] - bMean);
    bVariance += Math.pow(bReturns[i] - bMean, 2);
  }

  if (bVariance === 0) return 1;
  return covariance / bVariance;
}

/**
 * Alpha = Portfolio Return - [Rf + Beta * (Benchmark Return - Rf)]
 * (Jensen's Alpha)
 */
export function calculateAlpha(
  portfolioReturn: number,
  benchmarkReturn: number,
  beta: number,
  riskFreeRate: number = RISK_FREE_RATE
): number {
  return portfolioReturn - (riskFreeRate + beta * (benchmarkReturn - riskFreeRate));
}

/**
 * Maximum Drawdown from price series
 */
export function maxDrawdown(prices: number[]): number {
  if (prices.length < 2) return 0;
  let peak = prices[0];
  let maxDD = 0;

  for (const price of prices) {
    if (price > peak) peak = price;
    const dd = (peak - price) / peak;
    if (dd > maxDD) maxDD = dd;
  }

  return maxDD;
}

/**
 * Tracking Error = Std(Rp - Rb) annualised
 */
export function trackingError(
  portfolioReturns: number[],
  benchmarkReturns: number[]
): number {
  const n = Math.min(portfolioReturns.length, benchmarkReturns.length);
  if (n < 2) return 0;

  const excess = Array.from({ length: n }, (_, i) =>
    portfolioReturns[i] - benchmarkReturns[i]
  );
  const mean = excess.reduce((s, r) => s + r, 0) / n;
  const variance = excess.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (n - 1);

  return Math.sqrt(variance) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

/**
 * Information Ratio = Excess Return / Tracking Error
 */
export function informationRatio(
  portfolioReturn: number,
  benchmarkReturn: number,
  tError: number
): number {
  if (tError === 0) return 0;
  return (portfolioReturn - benchmarkReturn) / tError;
}

/**
 * Calculate all risk metrics from daily returns
 */
export function calculateRiskMetrics(
  portfolioReturns: number[],
  benchmarkReturns: number[],
  portfolioPrices: number[]
): RiskMetrics {
  const annReturn = annualisedReturn(portfolioReturns);
  const vol = annualisedVolatility(portfolioReturns);
  const dsVol = downsideVolatility(portfolioReturns);
  const beta = calculateBeta(portfolioReturns, benchmarkReturns);
  const benchReturn = annualisedReturn(benchmarkReturns);
  const alpha = calculateAlpha(annReturn, benchReturn, beta);
  const mdd = maxDrawdown(portfolioPrices);
  const tError = trackingError(portfolioReturns, benchmarkReturns);
  const infoRatio = informationRatio(annReturn, benchReturn, tError);

  return {
    annualisedReturn: annReturn * 100,
    volatility: vol * 100,
    sharpeRatio: sharpeRatio(annReturn, vol),
    sortinoRatio: sortinoRatio(annReturn, dsVol),
    beta,
    alpha: alpha * 100,
    maxDrawdown: mdd * 100,
    informationRatio: infoRatio,
    trackingError: tError * 100,
    calmarRatio: calmarRatio(annReturn, mdd),
    treynorRatio: treynorRatio(annReturn, beta),
    omegaRatio: omegaRatio(portfolioReturns),
    var5: valueAtRisk(portfolioReturns, 0.05) * 100,
    cvar5: conditionalVaR(portfolioReturns, 0.05) * 100,
    upsideCapture: captureRatio(portfolioReturns, benchmarkReturns, "up") * 100,
    downsideCapture: captureRatio(portfolioReturns, benchmarkReturns, "down") * 100,
    rSquared: rSquared(portfolioReturns, benchmarkReturns),
    skewness: skewness(portfolioReturns),
    kurtosis: kurtosis(portfolioReturns),
  };
}

// ─── New metrics ────────────────────────────────────────────────────────────

export function calmarRatio(annReturn: number, mdd: number): number {
  return mdd !== 0 ? annReturn / mdd : 0;
}

export function treynorRatio(
  annReturn: number,
  beta: number,
  riskFreeRate: number = RISK_FREE_RATE
): number {
  return beta !== 0 ? (annReturn - riskFreeRate) / beta : 0;
}

export function omegaRatio(
  dailyReturns: number[],
  threshold: number = 0
): number {
  let gains = 0;
  let losses = 0;
  for (const r of dailyReturns) {
    if (r > threshold) gains += r - threshold;
    else losses += threshold - r;
  }
  return losses !== 0 ? gains / losses : gains > 0 ? Infinity : 1;
}

export function valueAtRisk(
  dailyReturns: number[],
  confidence: number = 0.05
): number {
  if (dailyReturns.length === 0) return 0;
  const sorted = [...dailyReturns].sort((a, b) => a - b);
  const idx = Math.floor(confidence * sorted.length);
  return -sorted[idx];
}

export function conditionalVaR(
  dailyReturns: number[],
  confidence: number = 0.05
): number {
  if (dailyReturns.length === 0) return 0;
  const sorted = [...dailyReturns].sort((a, b) => a - b);
  const cutoffIdx = Math.floor(confidence * sorted.length);
  if (cutoffIdx === 0) return -sorted[0];
  const tail = sorted.slice(0, cutoffIdx);
  return -(tail.reduce((s, v) => s + v, 0) / tail.length);
}

export function captureRatio(
  portfolioReturns: number[],
  benchmarkReturns: number[],
  direction: "up" | "down"
): number {
  const n = Math.min(portfolioReturns.length, benchmarkReturns.length);
  let portSum = 0;
  let benchSum = 0;
  let count = 0;

  for (let i = 0; i < n; i++) {
    const include =
      direction === "up" ? benchmarkReturns[i] > 0 : benchmarkReturns[i] < 0;
    if (include) {
      portSum += portfolioReturns[i];
      benchSum += benchmarkReturns[i];
      count++;
    }
  }

  if (count === 0 || benchSum === 0) return 0;
  return (portSum / count) / (benchSum / count);
}

export function rSquared(
  portfolioReturns: number[],
  benchmarkReturns: number[]
): number {
  const n = Math.min(portfolioReturns.length, benchmarkReturns.length);
  if (n < 2) return 0;

  const pMean = portfolioReturns.slice(0, n).reduce((s, r) => s + r, 0) / n;
  const bMean = benchmarkReturns.slice(0, n).reduce((s, r) => s + r, 0) / n;

  let ssRes = 0;
  let ssTot = 0;
  const beta = calculateBeta(portfolioReturns, benchmarkReturns);
  const alphaVal = pMean - beta * bMean;

  for (let i = 0; i < n; i++) {
    const predicted = alphaVal + beta * benchmarkReturns[i];
    ssRes += (portfolioReturns[i] - predicted) ** 2;
    ssTot += (portfolioReturns[i] - pMean) ** 2;
  }

  return ssTot !== 0 ? 1 - ssRes / ssTot : 0;
}

export function skewness(returns: number[]): number {
  const n = returns.length;
  if (n < 3) return 0;
  const mean = returns.reduce((s, r) => s + r, 0) / n;
  const std = Math.sqrt(
    returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1)
  );
  if (std === 0) return 0;
  const m3 = returns.reduce((s, r) => s + ((r - mean) / std) ** 3, 0) / n;
  return m3;
}

export function kurtosis(returns: number[]): number {
  const n = returns.length;
  if (n < 4) return 0;
  const mean = returns.reduce((s, r) => s + r, 0) / n;
  const std = Math.sqrt(
    returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1)
  );
  if (std === 0) return 0;
  const m4 = returns.reduce((s, r) => s + ((r - mean) / std) ** 4, 0) / n;
  return m4 - 3; // excess kurtosis
}
