"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculatePosition } from "@/lib/calculations/position";
import { getPortfolioTimeSeries } from "@/lib/services/analytics-data";

export interface PortfolioCardReturns {
  m1: number | null;
  m6: number | null;
  y1: number | null;
  y3: number | null;
}

export interface PortfolioCardAlloc {
  code: string;
  value: number;
}

export interface PortfolioCardTx {
  id: string;
  code: string;
  type: string;
  date: Date;
  amount: number;
}

export interface PortfolioCard {
  id: string;
  name: string;
  currency: string;
  entityType: string;
  holdingsCount: number;
  currentValue: number;
  allocation: PortfolioCardAlloc[];
  returns: PortfolioCardReturns;
  recent: PortfolioCardTx[];
}

export interface PortfolioCardsResult {
  cards: PortfolioCard[];
  totalValue: number;
  totalHoldings: number;
  byPortfolio: { name: string; value: number }[];
}

interface FlatTx {
  type: string;
  date: Date;
  qty: number;
  price: number;
  brokerage: number;
}

const DAY = 86_400_000;
const PERIODS = [
  { key: "m1", days: 30 },
  { key: "m6", days: 182 },
  { key: "y1", days: 365 },
  { key: "y3", days: 1095 },
] as const;

/**
 * Capital return (%) over a trailing window, isolating price movement from
 * contributions: return = (endValue − startValue − netInjected) ÷ base.
 * Returns null when the series doesn't reach back far enough for the window.
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

  // Insufficient history if the data doesn't reach back to the window start.
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

/** Build enriched summary cards for every portfolio the user owns. */
export async function getPortfolioCards(): Promise<PortfolioCardsResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const portfolios = await db.portfolio.findMany({
    where: { userId: session.user.id },
    include: {
      holdings: {
        include: {
          instrument: { select: { code: true } },
          transactions: { orderBy: { tradeDate: "asc" } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const cards: PortfolioCard[] = [];

  for (const p of portfolios) {
    const allocation: PortfolioCardAlloc[] = [];
    const flatTx: FlatTx[] = [];
    const recentSource: PortfolioCardTx[] = [];
    let currentValue = 0;

    for (const h of p.holdings) {
      const latest = await db.price.findFirst({
        where: { instrumentId: h.instrumentId },
        orderBy: { date: "desc" },
        select: { close: true },
      });
      const currentPrice = latest ? Number(latest.close) : 0;

      const txData = h.transactions.map((tx) => ({
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
      if (position.marketValue > 0) {
        allocation.push({ code: h.instrument.code, value: position.marketValue });
        currentValue += position.marketValue;
      }

      for (const tx of h.transactions) {
        flatTx.push({
          type: tx.transactionType,
          date: tx.tradeDate,
          qty: Number(tx.quantity),
          price: Number(tx.price),
          brokerage: Number(tx.brokerage),
        });
        recentSource.push({
          id: tx.id,
          code: h.instrument.code,
          type: tx.transactionType,
          date: tx.tradeDate,
          amount: Number(tx.quantity) * Number(tx.price),
        });
      }
    }

    allocation.sort((a, b) => b.value - a.value);

    const ts = await getPortfolioTimeSeries(p.id, "3Y");
    const returns = {
      m1: periodReturn(ts.dates, ts.values, flatTx, PERIODS[0].days),
      m6: periodReturn(ts.dates, ts.values, flatTx, PERIODS[1].days),
      y1: periodReturn(ts.dates, ts.values, flatTx, PERIODS[2].days),
      y3: periodReturn(ts.dates, ts.values, flatTx, PERIODS[3].days),
    };

    const recent = recentSource
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 3);

    cards.push({
      id: p.id,
      name: p.name,
      currency: p.baseCurrency,
      entityType: p.taxEntityType,
      holdingsCount: p.holdings.length,
      currentValue,
      allocation,
      returns,
      recent,
    });
  }

  const totalValue = cards.reduce((s, c) => s + c.currentValue, 0);
  const totalHoldings = cards.reduce((s, c) => s + c.holdingsCount, 0);
  const byPortfolio = cards
    .map((c) => ({ name: c.name, value: c.currentValue }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);

  return { cards, totalValue, totalHoldings, byPortfolio };
}
