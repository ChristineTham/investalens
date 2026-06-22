/**
 * Types and helpers for the rich stock information fetched from the Python
 * yfinance backend (`POST /api/analytics/stock-info`).
 */

export interface StockProfile {
  longName: string | null;
  shortName: string | null;
  summary: string | null;
  website: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  city: string | null;
  employees: number | null;
  exchange: string | null;
  quoteType: string | null;
  currency: string | null;
}

export type StockStats = Record<string, number | string>;

export interface AnalystTargets {
  current: number | null;
  low: number | null;
  high: number | null;
  mean: number | null;
  median: number | null;
}

export interface RecommendationRow {
  period: string | null;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export interface UpgradeRow {
  date: string | null;
  firm: string | null;
  toGrade: string | null;
  fromGrade: string | null;
  action: string | null;
}

export interface StockCalendar {
  earningsDates: string[];
  exDividendDate: string | null;
  dividendDate: string | null;
  earningsHigh: number | null;
  earningsLow: number | null;
  earningsAverage: number | null;
  revenueHigh: number | null;
  revenueLow: number | null;
  revenueAverage: number | null;
}

export interface NewsItem {
  title: string | null;
  summary: string | null;
  publisher: string | null;
  link: string | null;
  publishedAt: string | null;
}

export interface StockFinancials {
  years: string[];
  revenue: (number | null)[];
  netIncome: (number | null)[];
  grossProfit: (number | null)[];
  ebitda: (number | null)[];
}

export interface StockActions {
  dividends: { date: string | null; amount: number | null }[];
  splits: { date: string | null; ratio: number | null }[];
}

export interface StockInfoResponse {
  symbol: string;
  found: boolean;
  profile: StockProfile;
  stats: StockStats;
  analystTargets: AnalystTargets | null;
  recommendations: RecommendationRow[];
  upgrades: UpgradeRow[];
  calendar: StockCalendar | null;
  news: NewsItem[];
  financials: StockFinancials | null;
  actions: StockActions | null;
}

const MARKET_SUFFIX: Record<string, string> = {
  ASX: ".AX",
  LSE: ".L",
  TSX: ".TO",
  HKG: ".HK",
  SGX: ".SI",
  NZX: ".NZ",
};

/** Build the Yahoo Finance symbol for an instrument code + market code. */
export function toYahooSymbol(code: string, market: string): string {
  if (code.startsWith("^")) return code; // index
  if (code.includes(".")) return code; // already suffixed
  const suffix = MARKET_SUFFIX[market.toUpperCase()] || "";
  return `${code}${suffix}`;
}

/** Instrument types we attempt to enrich with stock info (skip bonds/cash). */
export function supportsStockInfo(instrumentType: string): boolean {
  const t = instrumentType.toLowerCase();
  return !["bond", "fixed_interest", "cash", "currency"].includes(t);
}
