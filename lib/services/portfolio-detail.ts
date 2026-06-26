"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  calculatePosition,
  calculateIncome,
} from "@/lib/calculations/position";
import type { TransactionData } from "@/lib/calculations/performance";
import { annualiseReturn } from "@/lib/calculations/performance";
import { getPortfolioTimeSeries } from "@/lib/services/analytics-data";
import { holdingColor, MUTED_COLOR } from "@/lib/constants/chart-colors";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PortfolioReturns {
  m1: number | null;
  m6: number | null;
  y1: number | null;
  y3: number | null;
  y5: number | null;
  y10: number | null;
  max: number | null;
}

export interface HoldingMetric {
  /** Holding id (stable key for charts/colours). */
  id: string;
  code: string;
  name: string;
  instrumentType: string;
  sector: string;
  currency: string;
  marketCode: string;
  /** CSS var for Recharts props. */
  colorVar: string;
  /** Tailwind class for swatches. */
  colorSwatch: string;
  quantity: number;
  currentPrice: number;
  /** Cost base of the current position. */
  purchaseAmount: number;
  /** Current market value. */
  currentValue: number;
  capitalGain: number;
  income: number;
  totalGain: number;
  totalGainPercent: number;
  /** Annualised total return (%), or null when the holding is too new. */
  annualisedReturn: number | null;
  firstTradeDate: string | null;
}

export interface SectorAlloc {
  sector: string;
  value: number;
  percent: number;
  colorVar: string;
  colorSwatch: string;
}

export interface PortfolioDetail {
  id: string;
  name: string;
  currency: string;
  entityType: string;
  holdingsCount: number;
  icon: string | null;
  color: string | null;
  brokerName: string | null;
  brokerWebsite: string | null;
  clientNumber: string | null;
  accountNumber: string | null;
  currentValue: number;
  costBase: number;
  capitalGain: number;
  income: number;
  totalGain: number;
  totalGainPercent: number;
  returns: PortfolioReturns;
  holdings: HoldingMetric[];
  sectorAllocation: SectorAlloc[];
  topPerformers: HoldingMetric[];
  bottomPerformers: HoldingMetric[];
}

interface FlatTx {
  type: string;
  date: Date;
  qty: number;
  price: number;
  brokerage: number;
}

const DAY = 86_400_000;
const YEAR_MS = 365 * DAY;

/**
 * Capital return (%) over a trailing window, isolating price movement from
 * contributions: return = (endValue − startValue − netInjected − brokerage) ÷ base.
 * Returns null when the series doesn't reach back far enough for the window.
 * (Mirrors the logic used for the portfolio summary cards.)
 */
function periodReturn(
  dates: string[],
  values: number[],
  txs: FlatTx[],
  periodDays: number
): number | null {
  if (dates.length < 2) return null;
  const now = Date.now();
  const startMs = now - periodDays * DAY;

  if (new Date(dates[0]).getTime() > startMs + 20 * DAY) return null;

  let idx = dates.findIndex((d) => new Date(d).getTime() >= startMs);
  if (idx < 0) idx = dates.length - 1;
  const startValue = values[idx];
  const endValue = values[values.length - 1];
  if (!startValue || startValue <= 0) return null;

  const boundary = new Date(dates[idx]).getTime();
  let netInjected = 0;
  let brokerage = 0;
  for (const tx of txs) {
    if (tx.date.getTime() <= boundary) continue;
    brokerage += tx.brokerage;
    if (tx.type === "BUY" || tx.type === "TRANSFER_IN") {
      netInjected += tx.qty * tx.price;
    } else if (
      tx.type === "SELL" ||
      tx.type === "TRANSFER_OUT" ||
      tx.type === "RETURN_OF_CAPITAL"
    ) {
      netInjected -= tx.qty * tx.price;
    }
  }

  const capitalGain = endValue - startValue - netInjected - brokerage;
  const base = startValue + Math.max(netInjected + brokerage, 0);
  if (base <= 0) return null;
  return (capitalGain / base) * 100;
}

/** Whole-series (inception) return (%). */
function maxReturn(values: number[], txs: FlatTx[]): number | null {
  if (values.length < 2) return null;
  const startValue = values[0];
  const endValue = values[values.length - 1];
  let netInjected = 0;
  let brokerage = 0;
  for (const tx of txs) {
    brokerage += tx.brokerage;
    if (tx.type === "BUY" || tx.type === "TRANSFER_IN") {
      netInjected += tx.qty * tx.price;
    } else if (
      tx.type === "SELL" ||
      tx.type === "TRANSFER_OUT" ||
      tx.type === "RETURN_OF_CAPITAL"
    ) {
      netInjected -= tx.qty * tx.price;
    }
  }
  const base = (startValue || 0) + Math.max(netInjected + brokerage, 0);
  if (base <= 0) return null;
  const capitalGain = endValue - startValue - netInjected - brokerage;
  return (capitalGain / base) * 100;
}

/**
 * Build the full static (range-independent) detail for a single portfolio:
 * summary KPIs, period returns, per-holding metrics, sector allocation and
 * top/bottom performers — with consistent per-holding colours.
 */
export async function getPortfolioDetail(
  portfolioId: string
): Promise<PortfolioDetail> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const portfolio = await db.portfolio.findFirst({
    where: {
      id: portfolioId,
      OR: [
        { userId: session.user.id },
        { shares: { some: { email: session.user.email! } } },
      ],
    },
    include: {
      holdings: {
        include: {
          instrument: true,
          transactions: { orderBy: { tradeDate: "asc" } },
        },
      },
    },
  });

  if (!portfolio) throw new Error("Portfolio not found");

  const flatTx: FlatTx[] = [];
  const holdingMetrics: HoldingMetric[] = [];

  let currentValue = 0;
  let costBase = 0;
  let income = 0;

  for (const h of portfolio.holdings) {
    const latest = await db.price.findFirst({
      where: { instrumentId: h.instrumentId },
      orderBy: { date: "desc" },
      select: { close: true },
    });
    const currentPrice = latest ? Number(latest.close) : 0;

    const txData: TransactionData[] = h.transactions.map((tx) => ({
      id: tx.id,
      transactionType: tx.transactionType,
      tradeDate: tx.tradeDate,
      quantity: tx.quantity,
      price: tx.price,
      brokerage: tx.brokerage,
      exchangeRate: tx.exchangeRate,
      currency: tx.currency,
      accruedInterest: tx.accruedInterest,
    }));

    const position = calculatePosition(txData, currentPrice);
    const holdingIncome = calculateIncome(txData);
    const capitalGain = position.marketValue - position.totalCostBase;
    const totalGain = capitalGain + holdingIncome;
    const totalGainPercent =
      position.totalCostBase > 0
        ? (totalGain / position.totalCostBase) * 100
        : 0;

    const firstTrade = h.transactions[0]?.tradeDate ?? null;
    let annualisedReturn: number | null = null;
    if (firstTrade && position.totalCostBase > 0) {
      const years = (Date.now() - firstTrade.getTime()) / YEAR_MS;
      const totalReturn = totalGain / position.totalCostBase;
      annualisedReturn =
        years >= 0.5
          ? (Math.pow(1 + totalReturn, 1 / years) - 1) * 100
          : totalReturn * 100;
    }

    for (const tx of h.transactions) {
      flatTx.push({
        type: tx.transactionType,
        date: tx.tradeDate,
        qty: Number(tx.quantity),
        price: Number(tx.price),
        brokerage: Number(tx.brokerage),
      });
    }

    currentValue += position.marketValue;
    costBase += position.totalCostBase;
    income += holdingIncome;

    holdingMetrics.push({
      id: h.id,
      code: h.instrument.code,
      name: h.instrument.name,
      instrumentType: h.instrument.instrumentType,
      sector: h.instrument.sector?.trim() || "Unclassified",
      currency: h.instrument.currency,
      marketCode: h.instrument.marketCode,
      colorVar: "",
      colorSwatch: "",
      quantity: position.quantity,
      currentPrice,
      purchaseAmount: position.totalCostBase,
      currentValue: position.marketValue,
      capitalGain,
      income: holdingIncome,
      totalGain,
      totalGainPercent,
      annualisedReturn,
      firstTradeDate: firstTrade ? firstTrade.toISOString().split("T")[0] : null,
    });
  }

  // Assign stable colours, ordered by current value (largest first) so the most
  // significant holdings get the most distinct hues. Colour is keyed to the
  // holding for the lifetime of this render and reused across all charts.
  holdingMetrics.sort((a, b) => b.currentValue - a.currentValue);
  holdingMetrics.forEach((h, i) => {
    const c = holdingColor(i);
    h.colorVar = c.var;
    h.colorSwatch = c.swatch;
  });

  // Sector allocation (by current value).
  const sectorMap = new Map<string, number>();
  for (const h of holdingMetrics) {
    if (h.currentValue <= 0) continue;
    sectorMap.set(h.sector, (sectorMap.get(h.sector) ?? 0) + h.currentValue);
  }
  const sectorEntries = [...sectorMap.entries()].sort((a, b) => b[1] - a[1]);
  const sectorAllocation: SectorAlloc[] = sectorEntries.map(
    ([sector, value], i) => {
      const c = sector === "Unclassified" ? MUTED_COLOR : holdingColor(i);
      return {
        sector,
        value,
        percent: currentValue > 0 ? (value / currentValue) * 100 : 0,
        colorVar: c.var,
        colorSwatch: c.swatch,
      };
    }
  );

  // Period returns from a single MAX time series. Periods of a year or more are
  // annualised (CAGR); sub-year periods stay as outright returns.
  const ts = await getPortfolioTimeSeries(portfolioId, "MAX");
  const ann = (days: number): number | null => {
    const r = periodReturn(ts.dates, ts.values, flatTx, days);
    return r == null ? null : annualiseReturn(r, days);
  };
  const spanDays =
    ts.dates.length >= 2
      ? Math.max(
          1,
          (new Date(ts.dates[ts.dates.length - 1]).getTime() -
            new Date(ts.dates[0]).getTime()) /
            86_400_000
        )
      : 365;
  const maxRaw = maxReturn(ts.values, flatTx);
  const returns: PortfolioReturns = {
    m1: periodReturn(ts.dates, ts.values, flatTx, 30),
    m6: periodReturn(ts.dates, ts.values, flatTx, 182),
    y1: ann(365),
    y3: ann(1095),
    y5: ann(1825),
    y10: ann(3650),
    max: maxRaw == null ? maxRaw : annualiseReturn(maxRaw, spanDays),
  };

  // Performers ranked by total-gain %, among holdings with a real position.
  const ranked = holdingMetrics
    .filter((h) => h.purchaseAmount > 0 && h.currentValue > 0)
    .sort((a, b) => b.totalGainPercent - a.totalGainPercent);
  const topPerformers = ranked.slice(0, 3);
  const bottomPerformers = ranked.slice(-3).reverse();

  const capitalGain = currentValue - costBase;
  const totalGain = capitalGain + income;
  const totalGainPercent = costBase > 0 ? (totalGain / costBase) * 100 : 0;

  return {
    id: portfolio.id,
    name: portfolio.name,
    currency: portfolio.baseCurrency,
    entityType: portfolio.taxEntityType,
    holdingsCount: portfolio.holdings.length,
    icon: portfolio.icon,
    color: portfolio.color,
    brokerName: portfolio.brokerName,
    brokerWebsite: portfolio.brokerWebsite,
    clientNumber: portfolio.clientNumber,
    accountNumber: portfolio.accountNumber,
    currentValue,
    costBase,
    capitalGain,
    income,
    totalGain,
    totalGainPercent,
    returns,
    holdings: holdingMetrics,
    sectorAllocation,
    topPerformers,
    bottomPerformers,
  };
}
