"use client";

/** Shared types and helpers for the portfolio-detail client charts. */

export type ChartRange = "1M" | "6M" | "1Y" | "3Y" | "5Y" | "10Y" | "MAX";

export interface HoldingMeta {
  id: string;
  code: string;
  colorVar: string;
  colorSwatch: string;
}

export type ValuePoint = { date: string; Total: number } & Record<
  string,
  string | number
>;

export type PerformancePoint = {
  date: string;
  Portfolio: number;
  Benchmark?: number;
  capitalGain: number;
  income: number;
  totalGain: number;
};

export type MovementPoint = { period: string } & Record<
  string,
  string | number
>;

export interface SparkPoint {
  date: string;
  value: number;
}

export interface PortfolioDetailSeries {
  range: ChartRange;
  holdings: HoldingMeta[];
  valueSeries: ValuePoint[];
  performanceSeries: PerformancePoint[];
  movementSeries: MovementPoint[];
  sparklines: Record<string, SparkPoint[]>;
}

/** Compact currency, e.g. $12.3k / $1.2M — for axis ticks. */
export function compactCurrency(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

/** Format an ISO date for an axis tick, scaled to the selected range. */
export function formatAxisDate(date: string, range: ChartRange): string {
  if (range === "1M" || range === "6M") return date.slice(5); // MM-DD
  return date.slice(0, 7); // YYYY-MM
}

/** Format a YYYY-MM bucket for the movement axis. */
export function formatMonth(period: string): string {
  return period; // already YYYY-MM
}
