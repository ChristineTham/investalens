import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getBenchmarkTimeSeriesBetween } from "@/lib/services/analytics-data";
import { type ChartRange, resolveChartRange } from "@/lib/constants/chart-ranges";

const INCOME_TYPES = new Set(["DIVIDEND", "INTEREST", "COUPON"]);
const BUY_TYPES = new Set(["BUY", "TRANSFER_IN"]);
const SELL_TYPES = new Set(["SELL", "TRANSFER_OUT", "RETURN_OF_CAPITAL"]);

function num(v: unknown): number {
  return v == null ? 0 : Number(v);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; holdingId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, holdingId } = await params;
  const { searchParams } = new URL(request.url);
  const range = (searchParams.get("range") || "1Y") as ChartRange;
  const benchmarkCode = searchParams.get("benchmark") || "";

  const holding = await db.holding.findFirst({
    where: {
      id: holdingId,
      portfolioId: id,
      portfolio: {
        OR: [
          { userId: session.user.id },
          { shares: { some: { email: session.user.email! } } },
        ],
      },
    },
    include: {
      instrument: true,
      portfolio: true,
      transactions: { orderBy: { tradeDate: "asc" } },
    },
  });

  if (!holding) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { from, to } = resolveChartRange(range, holding.portfolio.financialYearEnd);

  // Fetch prices in range
  const prices = await db.price.findMany({
    where: { instrumentId: holding.instrumentId, date: { gte: from, lte: to } },
    orderBy: { date: "asc" },
  });

  if (prices.length === 0) {
    return NextResponse.json({
      ohlcSeries: [],
      performanceSeries: [],
      movementSeries: [],
      dividends: [],
    });
  }


  // OHLC series
  const ohlcSeries = prices.map((p) => ({
    date: p.date.toISOString().split("T")[0],
    open: num(p.open || p.close),
    high: num(p.high || p.close),
    low: num(p.low || p.close),
    close: num(p.close),
    volume: num(p.volume || 0),
  }));

  // Dividends in range
  const dividends = holding.transactions
    .filter(
      (tx) =>
        tx.transactionType === "DIVIDEND" &&
        tx.tradeDate >= from &&
        tx.tradeDate <= to
    )
    .map((tx) => ({
      date: tx.tradeDate.toISOString().split("T")[0],
      amount: num(tx.quantity) * num(tx.price),
    }));

  // Benchmark series
  let benchmarkSeries: { dates: string[]; values: number[] } | null = null;
  if (benchmarkCode) {
    try {
      benchmarkSeries = await getBenchmarkTimeSeriesBetween(benchmarkCode, from, to);
    } catch {
      benchmarkSeries = null;
    }
  }
  const benchBase =
    benchmarkSeries && benchmarkSeries.values.length > 0
      ? benchmarkSeries.values[0]
      : 0;

  // Compute quantity at start
  const txs = holding.transactions;
  const startTs = from.getTime();
  let startQty = 0;
  let txIdx = 0;

  // Process transactions before range start to get initial quantity
  while (txIdx < txs.length && txs[txIdx].tradeDate.getTime() < startTs) {
    const tx = txs[txIdx];
    const q = num(tx.quantity);
    if (BUY_TYPES.has(tx.transactionType) || tx.transactionType === "BONUS") {
      startQty += q;
    } else if (
      tx.transactionType === "SELL" ||
      tx.transactionType === "TRANSFER_OUT"
    ) {
      startQty -= q;
    } else if (tx.transactionType === "SPLIT") {
      startQty *= q;
    }
    txIdx++;
  }

  const startPrice = num(prices[0].close);
  const startValue = startQty * startPrice;

  // Performance series
  let currentQty = startQty;
  const performanceSeries = prices.map((p) => {
    const date = p.date.toISOString().split("T")[0];
    const dateTs = p.date.getTime();

    // Process transactions up to this date within the range
    while (txIdx < txs.length && txs[txIdx].tradeDate.getTime() <= dateTs) {
      const tx = txs[txIdx];
      const q = num(tx.quantity);
      if (BUY_TYPES.has(tx.transactionType) || tx.transactionType === "BONUS") {
        currentQty += q;
      } else if (
        tx.transactionType === "SELL" ||
        tx.transactionType === "TRANSFER_OUT"
      ) {
        currentQty -= q;
      } else if (tx.transactionType === "SPLIT") {
        currentQty *= q;
      }
      txIdx++;
    }

    const endValue = currentQty * num(p.close);

    let netInjected = 0;
    let brokerage = 0;
    let income = 0;

    for (const tx of txs) {
      const txTs = tx.tradeDate.getTime();
      if (txTs > dateTs) break;
      if (txTs < startTs) continue; // Already reflected in startValue

      const amt = num(tx.quantity) * num(tx.price);
      if (INCOME_TYPES.has(tx.transactionType)) {
        income += amt;
      } else if (BUY_TYPES.has(tx.transactionType)) {
        netInjected += amt;
        brokerage += num(tx.brokerage);
      } else if (SELL_TYPES.has(tx.transactionType)) {
        netInjected -= amt;
      }
    }

    const capitalGain = endValue - startValue - netInjected - brokerage;
    const totalGain = capitalGain + income;
    const base = startValue + Math.max(netInjected + brokerage, 0);

    const point: Record<string, string | number> = {
      date,
      capitalGain,
      income,
      totalGain,
      Portfolio: base > 0 ? (totalGain / base) * 100 : 0,
      priceGain: base > 0 ? (capitalGain / base) * 100 : 0,
    };

    if (benchmarkSeries && benchBase > 0) {
      const idx = benchmarkSeries.dates.indexOf(date);
      if (idx >= 0) {
        point.Benchmark =
          ((benchmarkSeries.values[idx] - benchBase) / benchBase) * 100;
      }
    }

    return point;
  });

  // Movement series: cash flows grouped by month
  const monthlyFlows: Record<string, number> = {};
  for (const tx of txs) {
    if (tx.tradeDate.getTime() < startTs || tx.tradeDate.getTime() > to.getTime()) {
      continue;
    }
    const month = tx.tradeDate.toISOString().slice(0, 7); // YYYY-MM
    const amt = num(tx.quantity) * num(tx.price);
    let flow = 0;
    if (BUY_TYPES.has(tx.transactionType)) {
      flow = amt;
    } else if (
      tx.transactionType === "SELL" ||
      tx.transactionType === "TRANSFER_OUT"
    ) {
      flow = -amt;
    } else if (INCOME_TYPES.has(tx.transactionType)) {
      flow = amt;
    }

    if (flow !== 0) {
      monthlyFlows[month] = (monthlyFlows[month] ?? 0) + flow;
    }
  }

  const movementSeries = Object.entries(monthlyFlows)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, amount]) => ({
      period,
      Amount: amount,
    }));

  return NextResponse.json({
    ohlcSeries,
    performanceSeries,
    movementSeries,
    dividends,
  });
}
