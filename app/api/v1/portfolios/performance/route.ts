import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getPortfolioTimeSeriesBetween,
  getBenchmarkTimeSeriesBetween,
  getPortfolioPeriodMetricsFromSeries,
} from "@/lib/services/analytics-data";
import {
  type ChartRange,
  resolveChartRange,
} from "@/lib/constants/chart-ranges";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const range = (searchParams.get("range") || "1Y") as ChartRange;
  const benchmarkCode = searchParams.get("benchmark") || "";

  // Get all user portfolios
  const portfolios = await db.portfolio.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, financialYearEnd: true },
  });

  const fye = portfolios[0]?.financialYearEnd ?? 6;
  const { from, to } = resolveChartRange(range, fye);

  // Get time series + period metrics for each portfolio
  const portfolioSeries = await Promise.all(
    portfolios.map(async (p) => {
      const ts = await getPortfolioTimeSeriesBetween(p.id, from, to);
      const metrics = await getPortfolioPeriodMetricsFromSeries(p.id, ts);
      return { id: p.id, name: p.name, ...ts, metrics };
    })
  );

  // Aggregate period KPIs across all portfolios for the selected range
  const kpiTotals = portfolioSeries.reduce(
    (acc, ps) => {
      acc.capitalGain += ps.metrics.capitalGain;
      acc.income += ps.metrics.income;
      acc.fees += ps.metrics.fees;
      acc.totalGain += ps.metrics.totalGain;
      acc.baseValue += ps.metrics.baseValue;
      if (ps.metrics.startDate && (!acc.startDate || ps.metrics.startDate < acc.startDate)) {
        acc.startDate = ps.metrics.startDate;
      }
      if (ps.metrics.endDate && (!acc.endDate || ps.metrics.endDate > acc.endDate)) {
        acc.endDate = ps.metrics.endDate;
      }
      return acc;
    },
    {
      capitalGain: 0,
      income: 0,
      fees: 0,
      totalGain: 0,
      baseValue: 0,
      startDate: null as string | null,
      endDate: null as string | null,
    }
  );

  const kpis = {
    range,
    startDate: kpiTotals.startDate,
    endDate: kpiTotals.endDate,
    capitalGain: kpiTotals.capitalGain,
    income: kpiTotals.income,
    fees: kpiTotals.fees,
    totalGain: kpiTotals.totalGain,
    totalGainPercent:
      kpiTotals.baseValue > 0
        ? (kpiTotals.totalGain / kpiTotals.baseValue) * 100
        : 0,
  };

  // Get benchmark if requested
  let benchmarkSeries = null;
  if (benchmarkCode) {
    try {
      benchmarkSeries = await getBenchmarkTimeSeriesBetween(
        benchmarkCode,
        from,
        to
      );
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

  // Compute raw values per date first
  const rawData = allDates.map((date) => {
    const values: Record<string, number> = {};
    let total = 0;

    for (const ps of portfolioSeries) {
      const idx = ps.dates.indexOf(date);
      const value = idx >= 0 ? ps.values[idx] : 0;
      values[ps.name] = value;
      total += value;
    }
    values["Total"] = total;
    return { date, values };
  });

  // Get base values (first data point) for percentage indexing
  const baseValues: Record<string, number> = {};
  if (rawData.length > 0) {
    for (const ps of portfolioSeries) {
      baseValues[ps.name] = rawData[0].values[ps.name] || 0;
    }
    baseValues["Total"] = rawData[0].values["Total"] || 0;
  }

  // Get benchmark base value
  let benchBase = 0;
  if (benchmarkSeries && benchmarkSeries.values.length > 0) {
    benchBase = benchmarkSeries.values[0];
  }

  // Convert to percentage gain/loss indexed from start
  const chartData = rawData.map(({ date, values }) => {
    const point: Record<string, string | number> = { date };

    for (const ps of portfolioSeries) {
      const base = baseValues[ps.name];
      const value = values[ps.name] || 0;
      point[ps.name] = base > 0 ? ((value - base) / base) * 100 : 0;
    }

    const totalBase = baseValues["Total"];
    const totalValue = values["Total"] || 0;
    point["Total"] = totalBase > 0 ? ((totalValue - totalBase) / totalBase) * 100 : 0;

    // Benchmark percentage gain from start
    if (benchmarkSeries && benchmarkSeries.dates.length > 0 && benchBase > 0) {
      const idx = benchmarkSeries.dates.indexOf(date);
      if (idx >= 0) {
        point["Benchmark"] = ((benchmarkSeries.values[idx] - benchBase) / benchBase) * 100;
      }
    }

    return point;
  });

  return NextResponse.json({
    portfolioNames: portfolios.map((p) => p.name),
    chartData,
    kpis,
  });
}
