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
  };
}
