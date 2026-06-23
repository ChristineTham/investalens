import { db } from "@/lib/db";
import { calculateIncome } from "@/lib/calculations/position";
import type { TransactionData } from "@/lib/calculations/performance";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TimeSeriesResult {
  dates: string[];
  values: number[];
  returns: number[];
  cumReturns: number[];
}

export interface PeriodMetrics {
  startDate: string | null;
  endDate: string | null;
  startValue: number;
  endValue: number;
  capitalGain: number;
  income: number;
  fees: number;
  totalGain: number;
  /** Capital base used for percentage returns (start value + new money in). */
  baseValue: number;
}

export interface ReturnsMatrix {
  dates: string[];
  assets: string[];
  returns: number[][];
  weights: number[];
  prices: Record<string, number[]>;
}

type DateRange = "1Y" | "3Y" | "5Y" | "10Y" | "MAX";

// ─── Helpers ────────────────────────────────────────────────────────────────

function dateRangeToFrom(range: DateRange): Date {
  if (range === "MAX") return new Date(2000, 0, 1);
  const now = new Date();
  const years = parseInt(range);
  now.setFullYear(now.getFullYear() - years);
  return now;
}

function toNumber(val: unknown): number {
  if (val == null) return 0;
  return Number(val);
}

function computeReturns(values: number[]): {
  returns: number[];
  cumReturns: number[];
} {
  const returns: number[] = [0];
  const cumReturns: number[] = [0];
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1];
    const r = prev !== 0 ? (values[i] - prev) / prev : 0;
    returns.push(r);
    cumReturns.push((1 + cumReturns[i - 1]) * (1 + r) - 1);
  }
  return { returns, cumReturns };
}

// ─── Portfolio Time Series ──────────────────────────────────────────────────

export async function getPortfolioTimeSeries(
  portfolioId: string,
  dateRange: DateRange
): Promise<TimeSeriesResult> {
  const from = dateRangeToFrom(dateRange);
  const to = new Date();

  // Get all holdings with their instruments
  const holdings = await db.holding.findMany({
    where: { portfolioId },
    include: {
      instrument: true,
      transactions: { orderBy: { tradeDate: "asc" } },
    },
  });

  if (holdings.length === 0) {
    return { dates: [], values: [], returns: [], cumReturns: [] };
  }

  // Get all instrument IDs
  const instrumentIds = holdings.map((h) => h.instrumentId);

  // Fetch all prices in the date range for these instruments
  const prices = await db.price.findMany({
    where: {
      instrumentId: { in: instrumentIds },
      date: { gte: from, lte: to },
    },
    orderBy: { date: "asc" },
  });

  // Build price lookup: instrumentId → date → close
  const priceLookup = new Map<string, Map<string, number>>();
  const allDatesSet = new Set<string>();

  for (const p of prices) {
    const dateStr = p.date.toISOString().split("T")[0];
    allDatesSet.add(dateStr);
    if (!priceLookup.has(p.instrumentId)) {
      priceLookup.set(p.instrumentId, new Map());
    }
    priceLookup.get(p.instrumentId)!.set(dateStr, toNumber(p.close));
  }

  const allDates = [...allDatesSet].sort();
  if (allDates.length === 0) {
    return { dates: [], values: [], returns: [], cumReturns: [] };
  }

  // For each holding, compute quantity at each date based on transactions
  const holdingQuantities = new Map<
    string,
    { instrumentId: string; dateQuantities: Map<string, number> }
  >();

  for (const holding of holdings) {
    const txs = holding.transactions.sort(
      (a, b) => a.tradeDate.getTime() - b.tradeDate.getTime()
    );
    let qty = 0;
    let txIdx = 0;
    const dateQuantities = new Map<string, number>();

    for (const dateStr of allDates) {
      const dateTs = new Date(dateStr).getTime();
      // Apply transactions up to this date
      while (txIdx < txs.length && txs[txIdx].tradeDate.getTime() <= dateTs) {
        const tx = txs[txIdx];
        const txQty = toNumber(tx.quantity);
        switch (tx.transactionType) {
          case "BUY":
          case "TRANSFER_IN":
          case "BONUS":
            qty += txQty;
            break;
          case "SELL":
          case "TRANSFER_OUT":
            qty -= txQty;
            break;
          case "SPLIT":
            qty *= txQty;
            break;
        }
        txIdx++;
      }
      dateQuantities.set(dateStr, qty);
    }

    holdingQuantities.set(holding.id, {
      instrumentId: holding.instrumentId,
      dateQuantities,
    });
  }

  // Compute portfolio value per date
  const values: number[] = [];
  for (const dateStr of allDates) {
    let dayValue = 0;
    for (const [, hq] of holdingQuantities) {
      const qty = hq.dateQuantities.get(dateStr) ?? 0;
      if (qty === 0) continue;
      const instrPrices = priceLookup.get(hq.instrumentId);
      const price = instrPrices?.get(dateStr);
      if (price != null) {
        dayValue += qty * price;
      }
    }
    values.push(dayValue);
  }

  const { returns, cumReturns } = computeReturns(values);
  return { dates: allDates, values, returns, cumReturns };
}

// ─── Portfolio Period Metrics ────────────────────────────────────────────────

const EMPTY_PERIOD_METRICS: PeriodMetrics = {
  startDate: null,
  endDate: null,
  startValue: 0,
  endValue: 0,
  capitalGain: 0,
  income: 0,
  fees: 0,
  totalGain: 0,
  baseValue: 0,
};

/**
 * Period KPIs (capital gain, income, fees, total gain) for a single portfolio
 * over the window covered by a pre-computed time series.
 *
 * Capital gain isolates price appreciation by removing contributions and
 * withdrawals during the window:
 *   capitalGain = (endValue − startValue) − netInjected − brokerage
 * where netInjected is the market value added by share transactions (buys add;
 * sells and returns of capital remove). Bonus issues and splits change quantity
 * without a cash contribution, so they are left in capital gain as appreciation.
 *
 * The window is exclusive of the first series date (those transactions are
 * already reflected in startValue) and inclusive of the last.
 */
export async function getPortfolioPeriodMetricsFromSeries(
  portfolioId: string,
  ts: TimeSeriesResult
): Promise<PeriodMetrics> {
  if (ts.dates.length === 0) return { ...EMPTY_PERIOD_METRICS };

  const startDate = ts.dates[0];
  const endDate = ts.dates[ts.dates.length - 1];
  const startValue = ts.values[0];
  const endValue = ts.values[ts.values.length - 1];

  const startBoundary = new Date(`${startDate}T00:00:00.000Z`);
  const endBoundary = new Date(`${endDate}T23:59:59.999Z`);

  const [txs, feeAgg] = await Promise.all([
    db.transaction.findMany({
      where: {
        holding: { portfolioId },
        tradeDate: { gt: startBoundary, lte: endBoundary },
      },
      select: {
        id: true,
        transactionType: true,
        tradeDate: true,
        quantity: true,
        price: true,
        brokerage: true,
        exchangeRate: true,
        currency: true,
        accruedInterest: true,
      },
    }),
    db.fee.aggregate({
      where: {
        portfolioId,
        invoiceDate: { gt: startBoundary, lte: endBoundary },
      },
      _sum: { total: true },
    }),
  ]);

  let netInjected = 0;
  let brokerage = 0;
  for (const tx of txs) {
    const amount = toNumber(tx.quantity) * toNumber(tx.price);
    brokerage += toNumber(tx.brokerage);
    switch (tx.transactionType) {
      case "BUY":
      case "TRANSFER_IN":
        netInjected += amount;
        break;
      case "SELL":
      case "TRANSFER_OUT":
      case "RETURN_OF_CAPITAL":
        netInjected -= amount;
        break;
      // BONUS and SPLIT change quantity without a contribution → appreciation.
    }
  }

  const income = calculateIncome(txs as unknown as TransactionData[]);
  const fees = toNumber(feeAgg._sum.total);
  const capitalGain = endValue - startValue - netInjected - brokerage;
  const totalGain = capitalGain + income - fees;
  const baseValue = startValue + Math.max(netInjected + brokerage, 0);

  return {
    startDate,
    endDate,
    startValue,
    endValue,
    capitalGain,
    income,
    fees,
    totalGain,
    baseValue,
  };
}

/** Convenience wrapper: compute period metrics for a portfolio over a range. */
export async function getPortfolioPeriodMetrics(
  portfolioId: string,
  dateRange: DateRange
): Promise<PeriodMetrics> {
  const ts = await getPortfolioTimeSeries(portfolioId, dateRange);
  return getPortfolioPeriodMetricsFromSeries(portfolioId, ts);
}

// ─── Benchmark Time Series ──────────────────────────────────────────────────

export async function getBenchmarkTimeSeries(
  benchmarkCode: string,
  dateRange: DateRange
): Promise<TimeSeriesResult> {
  const from = dateRangeToFrom(dateRange);
  const to = new Date();

  // Find the benchmark instrument
  const instrument = await db.instrument.findFirst({
    where: { code: benchmarkCode },
  });

  if (!instrument) {
    throw new Error(`Benchmark instrument not found: ${benchmarkCode}`);
  }

  const prices = await db.price.findMany({
    where: {
      instrumentId: instrument.id,
      date: { gte: from, lte: to },
    },
    orderBy: { date: "asc" },
  });

  if (prices.length === 0) {
    return { dates: [], values: [], returns: [], cumReturns: [] };
  }

  const dates = prices.map((p) => p.date.toISOString().split("T")[0]);
  const values = prices.map((p) => toNumber(p.close));
  const { returns, cumReturns } = computeReturns(values);

  return { dates, values, returns, cumReturns };
}

// ─── Holding Time Series ────────────────────────────────────────────────────

export async function getHoldingTimeSeries(
  holdingId: string,
  dateRange: DateRange
): Promise<TimeSeriesResult> {
  const from = dateRangeToFrom(dateRange);
  const to = new Date();

  const holding = await db.holding.findUnique({
    where: { id: holdingId },
    include: {
      instrument: true,
      transactions: { orderBy: { tradeDate: "asc" } },
    },
  });

  if (!holding) throw new Error(`Holding not found: ${holdingId}`);

  const prices = await db.price.findMany({
    where: {
      instrumentId: holding.instrumentId,
      date: { gte: from, lte: to },
    },
    orderBy: { date: "asc" },
  });

  if (prices.length === 0) {
    return { dates: [], values: [], returns: [], cumReturns: [] };
  }

  // Compute quantity per date
  const txs = holding.transactions.sort(
    (a, b) => a.tradeDate.getTime() - b.tradeDate.getTime()
  );

  const dates: string[] = [];
  const values: number[] = [];
  let qty = 0;
  let txIdx = 0;

  for (const p of prices) {
    const dateTs = p.date.getTime();
    while (txIdx < txs.length && txs[txIdx].tradeDate.getTime() <= dateTs) {
      const tx = txs[txIdx];
      const txQty = toNumber(tx.quantity);
      switch (tx.transactionType) {
        case "BUY":
        case "TRANSFER_IN":
        case "BONUS":
          qty += txQty;
          break;
        case "SELL":
        case "TRANSFER_OUT":
          qty -= txQty;
          break;
        case "SPLIT":
          qty *= txQty;
          break;
      }
      txIdx++;
    }
    dates.push(p.date.toISOString().split("T")[0]);
    values.push(qty * toNumber(p.close));
  }

  const { returns, cumReturns } = computeReturns(values);
  return { dates, values, returns, cumReturns };
}

// ─── Returns Matrix ─────────────────────────────────────────────────────────

export async function getPortfolioReturnsMatrix(
  portfolioId: string,
  dateRange: DateRange
): Promise<ReturnsMatrix> {
  const from = dateRangeToFrom(dateRange);
  const to = new Date();

  const holdings = await db.holding.findMany({
    where: { portfolioId },
    include: {
      instrument: true,
      transactions: { orderBy: { tradeDate: "asc" } },
    },
  });

  if (holdings.length === 0) {
    return { dates: [], assets: [], returns: [], weights: [], prices: {} };
  }

  const instrumentIds = holdings.map((h) => h.instrumentId);

  // Fetch prices
  const allPrices = await db.price.findMany({
    where: {
      instrumentId: { in: instrumentIds },
      date: { gte: from, lte: to },
    },
    orderBy: { date: "asc" },
  });

  // Build price lookup
  const priceLookup = new Map<string, Map<string, number>>();
  const allDatesSet = new Set<string>();

  for (const p of allPrices) {
    const dateStr = p.date.toISOString().split("T")[0];
    allDatesSet.add(dateStr);
    if (!priceLookup.has(p.instrumentId)) {
      priceLookup.set(p.instrumentId, new Map());
    }
    priceLookup.get(p.instrumentId)!.set(dateStr, toNumber(p.close));
  }

  const dates = [...allDatesSet].sort();
  const assets = holdings.map((h) => h.instrument.code);
  const pricesOut: Record<string, number[]> = {};
  const returnsMatrix: number[][] = [];

  // Build per-asset price arrays and returns
  for (const holding of holdings) {
    const instrPrices = priceLookup.get(holding.instrumentId) ?? new Map();
    const assetPrices: number[] = [];
    let lastPrice: number | null = null;

    for (const dateStr of dates) {
      const price: number = instrPrices.get(dateStr) ?? lastPrice ?? 0;
      assetPrices.push(price);
      lastPrice = price;
    }

    pricesOut[holding.instrument.code] = assetPrices;
  }

  // Compute returns matrix [date_idx][asset_idx]
  for (let d = 0; d < dates.length; d++) {
    const dayReturns: number[] = [];
    for (const holding of holdings) {
      const assetPrices = pricesOut[holding.instrument.code];
      if (d === 0 || assetPrices[d - 1] === 0) {
        dayReturns.push(0);
      } else {
        dayReturns.push(
          (assetPrices[d] - assetPrices[d - 1]) / assetPrices[d - 1]
        );
      }
    }
    returnsMatrix.push(dayReturns);
  }

  // Compute current weights based on latest market value
  const latestDate = dates[dates.length - 1];
  let totalValue = 0;
  const holdingValues: number[] = [];

  for (const holding of holdings) {
    // Compute current quantity
    let qty = 0;
    for (const tx of holding.transactions) {
      const txQty = toNumber(tx.quantity);
      switch (tx.transactionType) {
        case "BUY":
        case "TRANSFER_IN":
        case "BONUS":
          qty += txQty;
          break;
        case "SELL":
        case "TRANSFER_OUT":
          qty -= txQty;
          break;
        case "SPLIT":
          qty *= txQty;
          break;
      }
    }
    const price =
      priceLookup.get(holding.instrumentId)?.get(latestDate) ?? 0;
    const value = qty * price;
    holdingValues.push(value);
    totalValue += value;
  }

  const weights = holdingValues.map((v) =>
    totalValue > 0 ? v / totalValue : 0
  );

  return { dates, assets, returns: returnsMatrix, weights, prices: pricesOut };
}
