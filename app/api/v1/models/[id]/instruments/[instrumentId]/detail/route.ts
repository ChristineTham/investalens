import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getBenchmarkTimeSeriesBetween } from "@/lib/services/analytics-data";
import { getModelForUser } from "@/lib/services/model-list";
import { type ChartRange, resolveChartRange } from "@/lib/constants/chart-ranges";

function num(v: unknown): number {
  return v == null ? 0 : Number(v);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; instrumentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, instrumentId } = await params;
  const { searchParams } = new URL(request.url);
  const range = (searchParams.get("range") || "1Y") as ChartRange;
  const benchmarkCode = searchParams.get("benchmark") || "";

  // Verify access and existence of constituent in model
  const model = await getModelForUser(session.user.id, id);
  if (!model) {
    return NextResponse.json({ error: "Model not found" }, { status: 404 });
  }

  const constituent = model.constituents.find(
    (c) => c.instrumentId === instrumentId
  );
  if (!constituent) {
    return NextResponse.json({ error: "Instrument not found in model" }, { status: 404 });
  }

  const { from, to } = resolveChartRange(range, 6); // Default financial year end (6 = June)

  // Fetch prices in range
  const prices = await db.price.findMany({
    where: { instrumentId, date: { gte: from, lte: to } },
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

  const startPrice = num(prices[0].close);

  // Performance series (price percentage change relative to start of range)
  const performanceSeries = prices.map((p) => {
    const date = p.date.toISOString().split("T")[0];
    const endPrice = num(p.close);
    const instrumentReturn = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;

    const point: Record<string, string | number> = {
      date,
      capitalGain: 0,
      income: 0,
      totalGain: 0,
      Portfolio: instrumentReturn, // we map to Portfolio key for compatibility with performance chart component
      priceGain: instrumentReturn,
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

  return NextResponse.json({
    ohlcSeries,
    performanceSeries,
    movementSeries: [],
    dividends: [],
  });
}
