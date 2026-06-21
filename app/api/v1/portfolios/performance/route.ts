import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPortfolioTimeSeries, getBenchmarkTimeSeries } from "@/lib/services/analytics-data";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const range = (searchParams.get("range") || "1Y") as "1Y" | "3Y" | "5Y" | "10Y" | "MAX";
  const benchmarkCode = searchParams.get("benchmark") || "";

  // Get all user portfolios
  const portfolios = await db.portfolio.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
  });

  // Get time series for each portfolio
  const portfolioSeries = await Promise.all(
    portfolios.map(async (p) => {
      const ts = await getPortfolioTimeSeries(p.id, range);
      return { id: p.id, name: p.name, ...ts };
    })
  );

  // Get benchmark if requested
  let benchmarkSeries = null;
  if (benchmarkCode) {
    try {
      benchmarkSeries = await getBenchmarkTimeSeries(benchmarkCode, range);
    } catch {
      // Benchmark not found or no data - ignore
    }
  }

  // Build consolidated dates (union of all portfolio dates)
  const allDatesSet = new Set<string>();
  for (const ps of portfolioSeries) {
    for (const d of ps.dates) allDatesSet.add(d);
  }
  const allDates = [...allDatesSet].sort();

  // Build data points for each date
  const chartData = allDates.map((date) => {
    const point: Record<string, string | number> = { date };
    let total = 0;

    for (const ps of portfolioSeries) {
      const idx = ps.dates.indexOf(date);
      const value = idx >= 0 ? ps.values[idx] : 0;
      point[ps.name] = value;
      total += value;
    }
    point["Total"] = total;

    if (benchmarkSeries && benchmarkSeries.dates.length > 0) {
      const idx = benchmarkSeries.dates.indexOf(date);
      if (idx >= 0) {
        // Rebase benchmark to match total portfolio value at start
        const benchBase = benchmarkSeries.values[0];
        const firstTotal = chartData.length === 0 ? total : (chartData[0] as Record<string, number>)["Total"] || total;
        point["Benchmark"] = benchBase > 0
          ? (benchmarkSeries.values[idx] / benchBase) * firstTotal
          : 0;
      }
    }

    return point;
  });

  // Fix benchmark rebasing - use the first total value
  if (benchmarkSeries && benchmarkSeries.dates.length > 0 && chartData.length > 0) {
    const firstTotal = chartData[0]["Total"] as number;
    const benchBase = benchmarkSeries.values[0];
    for (const point of chartData) {
      const date = point.date as string;
      const idx = benchmarkSeries.dates.indexOf(date);
      if (idx >= 0 && benchBase > 0) {
        point["Benchmark"] = (benchmarkSeries.values[idx] / benchBase) * firstTotal;
      }
    }
  }

  return NextResponse.json({
    portfolioNames: portfolios.map((p) => p.name),
    chartData,
  });
}
