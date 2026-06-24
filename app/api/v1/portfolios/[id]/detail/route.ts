import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getBenchmarkTimeSeries } from "@/lib/services/analytics-data";
import { holdingColor } from "@/lib/constants/chart-colors";

type DateRange = "1M" | "6M" | "1Y" | "3Y" | "5Y" | "10Y" | "MAX";

const RANGE_DAYS: Record<DateRange, number | null> = {
  "1M": 31,
  "6M": 183,
  "1Y": 365,
  "3Y": 1095,
  "5Y": 1825,
  "10Y": 3650,
  MAX: null,
};

const INCOME_TYPES = new Set(["DIVIDEND", "INTEREST", "COUPON"]);
const BUY_TYPES = new Set(["BUY", "TRANSFER_IN"]);
const SELL_TYPES = new Set(["SELL", "TRANSFER_OUT", "RETURN_OF_CAPITAL"]);

function rangeFrom(range: DateRange): Date {
  const days = RANGE_DAYS[range];
  if (days == null) return new Date(2000, 0, 1);
  return new Date(Date.now() - days * 86_400_000);
}

function num(v: unknown): number {
  return v == null ? 0 : Number(v);
}

/** Downsample an array to at most `max` evenly-spaced points (keeps the last). */
function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(arr[Math.floor(i * step)]);
  out[out.length - 1] = arr[arr.length - 1];
  return out;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const range = (searchParams.get("range") || "1Y") as DateRange;
  const benchmarkCode = searchParams.get("benchmark") || "";

  const portfolio = await db.portfolio.findFirst({
    where: {
      id,
      OR: [
        { userId: session.user.id },
        { shares: { some: { email: session.user.email! } } },
      ],
    },
    include: {
      holdings: {
        include: {
          instrument: { select: { code: true } },
          transactions: { orderBy: { tradeDate: "asc" } },
        },
      },
    },
  });

  if (!portfolio) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const from = rangeFrom(range);
  const to = new Date();
  const instrumentIds = portfolio.holdings.map((h) => h.instrumentId);

  // Latest prices (for colour ordering by current market value).
  const latestPrices = new Map<string, number>();
  await Promise.all(
    instrumentIds.map(async (iid) => {
      const p = await db.price.findFirst({
        where: { instrumentId: iid },
        orderBy: { date: "desc" },
        select: { close: true },
      });
      latestPrices.set(iid, p ? num(p.close) : 0);
    })
  );

  // Prices within the range for every holding instrument.
  const prices = await db.price.findMany({
    where: { instrumentId: { in: instrumentIds }, date: { gte: from, lte: to } },
    orderBy: { date: "asc" },
  });

  const priceLookup = new Map<string, Map<string, number>>();
  const allDatesSet = new Set<string>();
  for (const p of prices) {
    const d = p.date.toISOString().split("T")[0];
    allDatesSet.add(d);
    if (!priceLookup.has(p.instrumentId)) priceLookup.set(p.instrumentId, new Map());
    priceLookup.get(p.instrumentId)!.set(d, num(p.close));
  }
  const allDates = [...allDatesSet].sort();

  // Order holdings by current market value (desc) and assign stable colours —
  // must match getPortfolioDetail so colours line up across page + charts.
  const ordered = [...portfolio.holdings]
    .map((h) => {
      let qty = 0;
      for (const tx of h.transactions) {
        const q = num(tx.quantity);
        if (BUY_TYPES.has(tx.transactionType) || tx.transactionType === "BONUS")
          qty += q;
        else if (
          tx.transactionType === "SELL" ||
          tx.transactionType === "TRANSFER_OUT"
        )
          qty -= q;
        else if (tx.transactionType === "SPLIT") qty *= q;
      }
      const mv = qty * (latestPrices.get(h.instrumentId) ?? 0);
      return { holding: h, marketValue: mv };
    })
    .sort((a, b) => b.marketValue - a.marketValue);

  const holdingsMeta = ordered.map((o, i) => ({
    id: o.holding.id,
    code: o.holding.instrument.code,
    colorVar: holdingColor(i).var,
    colorSwatch: holdingColor(i).swatch,
  }));

  // Per-holding quantity at each date.
  const qtyByHolding = new Map<string, Map<string, number>>();
  for (const { holding } of ordered) {
    const txs = holding.transactions;
    let qty = 0;
    let txIdx = 0;
    const byDate = new Map<string, number>();
    for (const d of allDates) {
      const ts = new Date(d).getTime();
      while (txIdx < txs.length && txs[txIdx].tradeDate.getTime() <= ts) {
        const tx = txs[txIdx];
        const q = num(tx.quantity);
        if (BUY_TYPES.has(tx.transactionType) || tx.transactionType === "BONUS")
          qty += q;
        else if (
          tx.transactionType === "SELL" ||
          tx.transactionType === "TRANSFER_OUT"
        )
          qty -= q;
        else if (tx.transactionType === "SPLIT") qty *= q;
        txIdx++;
      }
      byDate.set(d, qty);
    }
    qtyByHolding.set(holding.id, byDate);
  }

  // ── Stacked value series (per holding + Total) ──────────────────────────────
  const valueSeries = allDates.map((date) => {
    const point: Record<string, string | number> = { date };
    let total = 0;
    for (const { holding } of ordered) {
      const qty = qtyByHolding.get(holding.id)!.get(date) ?? 0;
      const price = priceLookup.get(holding.instrumentId)?.get(date) ?? 0;
      const v = qty * price;
      point[holding.instrument.code] = v;
      total += v;
    }
    point.Total = total;
    return point;
  });

  // ── Performance series (cumulative capital gain + income, % indexed) ────────
  // Walk dates, accumulating contributions and income from transactions, so the
  // tooltip can break the gain down as capital gain + income = total gain.
  const allTx = ordered
    .flatMap(({ holding }) =>
      holding.transactions.map((tx) => ({
        date: tx.tradeDate,
        type: tx.transactionType,
        amount: num(tx.quantity) * num(tx.price),
        brokerage: num(tx.brokerage),
        accrued: num(tx.accruedInterest),
      }))
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const startValue = valueSeries.length > 0 ? Number(valueSeries[0].Total) : 0;
  const startBoundary = allDates.length > 0 ? new Date(allDates[0]).getTime() : 0;

  let benchmarkSeries: { dates: string[]; values: number[] } | null = null;
  if (benchmarkCode) {
    try {
      const bRange = (
        ["1Y", "3Y", "5Y", "10Y", "MAX"].includes(range) ? range : "1Y"
      ) as "1Y" | "3Y" | "5Y" | "10Y" | "MAX";
      benchmarkSeries = await getBenchmarkTimeSeries(benchmarkCode, bRange);
    } catch {
      benchmarkSeries = null;
    }
  }
  const benchBase =
    benchmarkSeries && benchmarkSeries.values.length > 0
      ? benchmarkSeries.values[0]
      : 0;

  const performanceSeries = valueSeries.map((vp) => {
    const date = String(vp.date);
    const dateTs = new Date(date).getTime();
    const endValue = Number(vp.Total);

    let netInjected = 0;
    let brokerage = 0;
    let income = 0;
    for (const tx of allTx) {
      const txTs = tx.date.getTime();
      if (txTs > dateTs) break;
      if (txTs <= startBoundary) {
        // already reflected in startValue (only count income post-start)
      }
      if (INCOME_TYPES.has(tx.type)) {
        if (txTs > startBoundary) income += tx.amount;
      } else if (BUY_TYPES.has(tx.type)) {
        if (txTs > startBoundary) {
          netInjected += tx.amount;
          brokerage += tx.brokerage;
        }
      } else if (SELL_TYPES.has(tx.type)) {
        if (txTs > startBoundary) netInjected -= tx.amount;
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

  // ── Movement series (net cash flow by holding, bucketed by month) ───────────
  const bucketMap = new Map<string, Record<string, number>>();
  for (const { holding } of ordered) {
    const code = holding.instrument.code;
    for (const tx of holding.transactions) {
      if (tx.tradeDate.getTime() < from.getTime()) continue;
      const bucket = tx.tradeDate.toISOString().slice(0, 7); // YYYY-MM
      const amount = num(tx.quantity) * num(tx.price);
      let signed = 0;
      if (BUY_TYPES.has(tx.transactionType)) signed = amount;
      else if (
        tx.transactionType === "SELL" ||
        tx.transactionType === "TRANSFER_OUT"
      )
        signed = -amount;
      else if (INCOME_TYPES.has(tx.transactionType)) signed = amount;
      else continue;
      if (signed === 0) continue;
      if (!bucketMap.has(bucket)) bucketMap.set(bucket, {});
      const row = bucketMap.get(bucket)!;
      row[code] = (row[code] ?? 0) + signed;
    }
  }
  const movementSeries = [...bucketMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, row]) => ({ period, ...row }));

  // ── Sparklines for the holdings table (downsampled close prices) ────────────
  const sparklines: Record<string, { date: string; value: number }[]> = {};
  for (const { holding } of ordered) {
    const series = allDates
      .map((d) => ({
        date: d,
        value: priceLookup.get(holding.instrumentId)?.get(d) ?? 0,
      }))
      .filter((p) => p.value > 0);
    sparklines[holding.id] = downsample(series, 30);
  }

  return NextResponse.json({
    range,
    holdings: holdingsMeta,
    valueSeries,
    performanceSeries,
    movementSeries,
    sparklines,
  });
}
