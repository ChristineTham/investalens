import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPortfolioTimeSeriesBetween } from "@/lib/services/analytics-data";
import { holdingColor } from "@/lib/constants/chart-colors";
import {
  type ChartRange,
  resolveChartRange,
} from "@/lib/constants/chart-ranges";

const INCOME_TYPES = new Set(["DIVIDEND", "INTEREST", "COUPON"]);
const BUY_TYPES = new Set(["BUY", "TRANSFER_IN"]);

function num(v: unknown): number {
  return v == null ? 0 : Number(v);
}

/**
 * Consolidated dashboard chart data, broken down by portfolio (not holding):
 * a stacked value series and a monthly movement series. Mirrors the
 * portfolio-detail endpoint so the same chart components can render both.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const range = (searchParams.get("range") || "1Y") as ChartRange;

  const portfolios = await db.portfolio.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, financialYearEnd: true },
    orderBy: { name: "asc" },
  });

  const fye = portfolios[0]?.financialYearEnd ?? 6;
  const { from, to } = resolveChartRange(range, fye);

  // Per-portfolio value time series.
  const seriesByName = new Map<string, Map<string, number>>();
  const finalValue = new Map<string, number>();
  const allDatesSet = new Set<string>();

  await Promise.all(
    portfolios.map(async (p) => {
      const ts = await getPortfolioTimeSeriesBetween(p.id, from, to);
      const m = new Map<string, number>();
      ts.dates.forEach((d, i) => {
        m.set(d, ts.values[i]);
        allDatesSet.add(d);
      });
      seriesByName.set(p.name, m);
      finalValue.set(p.name, ts.values[ts.values.length - 1] ?? 0);
    })
  );

  // Order portfolios by latest value (desc) and assign stable colours.
  const ordered = [...portfolios].sort(
    (a, b) => (finalValue.get(b.name) ?? 0) - (finalValue.get(a.name) ?? 0)
  );
  const seriesMeta = ordered.map((p, i) => ({
    id: p.id,
    code: p.name,
    colorVar: holdingColor(i).var,
    colorSwatch: holdingColor(i).swatch,
  }));

  const allDates = [...allDatesSet].sort();

  // Stacked value series with carry-forward so a portfolio without a price on a
  // given date keeps its last known value instead of dropping to zero.
  const lastVal: Record<string, number> = {};
  const valueSeries = allDates.map((date) => {
    const point: Record<string, string | number> = { date };
    let total = 0;
    for (const p of ordered) {
      const m = seriesByName.get(p.name)!;
      if (m.has(date)) lastVal[p.name] = m.get(date)!;
      const v = lastVal[p.name] ?? 0;
      point[p.name] = v;
      total += v;
    }
    point.Total = total;
    return point;
  });

  // Monthly movement (net cash flow) per portfolio.
  const bucketMap = new Map<string, Record<string, number>>();
  await Promise.all(
    portfolios.map(async (p) => {
      const txs = await db.transaction.findMany({
        where: {
          holding: { portfolioId: p.id },
          tradeDate: { gte: from, lte: to },
        },
        select: {
          transactionType: true,
          tradeDate: true,
          quantity: true,
          price: true,
        },
      });
      for (const tx of txs) {
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
        const bucket = tx.tradeDate.toISOString().slice(0, 7); // YYYY-MM
        if (!bucketMap.has(bucket)) bucketMap.set(bucket, {});
        const row = bucketMap.get(bucket)!;
        row[p.name] = (row[p.name] ?? 0) + signed;
      }
    })
  );
  const movementSeries = [...bucketMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, row]) => ({ period, ...row }));

  return NextResponse.json({
    range,
    series: seriesMeta,
    valueSeries,
    movementSeries,
  });
}
