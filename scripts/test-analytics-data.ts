import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

const { db } = await import("../lib/db");
const {
  getPortfolioTimeSeries,
  getBenchmarkTimeSeries,
  getPortfolioReturnsMatrix,
} = await import("../lib/services/analytics-data");

async function main() {
  console.log("=== Analytics Data Pipeline Verification ===\n");

  // 1. Find a portfolio with holdings
  const portfolio = await db.portfolio.findFirst({
    include: {
      holdings: { include: { instrument: true } },
      _count: { select: { holdings: true } },
    },
  });

  if (!portfolio || portfolio.holdings.length === 0) {
    console.log("⚠ No portfolios with holdings found. Skipping portfolio tests.");
    console.log("  Run 'pnpm exec prisma db seed' to create test data first.\n");
  } else {
    console.log(`Portfolio: "${portfolio.name}" (${portfolio._count.holdings} holdings)`);
    console.log(`  Holdings: ${portfolio.holdings.map((h) => h.instrument.code).join(", ")}\n`);

    // 2. Test getPortfolioTimeSeries
    console.log("--- getPortfolioTimeSeries(1Y) ---");
    try {
      const ts = await getPortfolioTimeSeries(portfolio.id, "1Y");
      console.log(`  Dates: ${ts.dates.length} data points`);
      if (ts.dates.length > 0) {
        console.log(`  Range: ${ts.dates[0]} → ${ts.dates[ts.dates.length - 1]}`);
        console.log(`  First value: $${ts.values[0]?.toFixed(2)}`);
        console.log(`  Last value:  $${ts.values[ts.values.length - 1]?.toFixed(2)}`);
        console.log(`  Cum. return: ${(ts.cumReturns[ts.cumReturns.length - 1] * 100).toFixed(2)}%`);
      } else {
        console.log("  ⚠ No price data found for this date range.");
      }
      console.log("  ✓ OK\n");
    } catch (err) {
      console.error(`  ✗ Failed: ${err instanceof Error ? err.message : err}\n`);
    }

    // 3. Test getPortfolioReturnsMatrix
    console.log("--- getPortfolioReturnsMatrix(1Y) ---");
    try {
      const matrix = await getPortfolioReturnsMatrix(portfolio.id, "1Y");
      console.log(`  Dates: ${matrix.dates.length}`);
      console.log(`  Assets: ${matrix.assets.join(", ")}`);
      console.log(`  Weights: ${matrix.weights.map((w) => (w * 100).toFixed(1) + "%").join(", ")}`);
      if (matrix.returns.length > 0) {
        const lastRow = matrix.returns[matrix.returns.length - 1];
        console.log(`  Last day returns: ${lastRow.map((r) => (r * 100).toFixed(3) + "%").join(", ")}`);
      }
      console.log("  ✓ OK\n");
    } catch (err) {
      console.error(`  ✗ Failed: ${err instanceof Error ? err.message : err}\n`);
    }
  }

  // 4. Test getBenchmarkTimeSeries
  const benchmarkCode = "^AXJO";
  console.log(`--- getBenchmarkTimeSeries("${benchmarkCode}", 1Y) ---`);
  try {
    const bts = await getBenchmarkTimeSeries(benchmarkCode, "1Y");
    console.log(`  Dates: ${bts.dates.length} data points`);
    if (bts.dates.length > 0) {
      console.log(`  Range: ${bts.dates[0]} → ${bts.dates[bts.dates.length - 1]}`);
      console.log(`  First close: ${bts.values[0]?.toFixed(2)}`);
      console.log(`  Last close:  ${bts.values[bts.values.length - 1]?.toFixed(2)}`);
      console.log(`  Cum. return: ${(bts.cumReturns[bts.cumReturns.length - 1] * 100).toFixed(2)}%`);
    } else {
      console.log("  ⚠ No benchmark price data found. Run fetch-benchmark-prices.ts first.");
    }
    console.log("  ✓ OK\n");
  } catch (err) {
    console.error(`  ✗ Failed: ${err instanceof Error ? err.message : err}\n`);
  }

  // 5. Quick summary of benchmark data coverage
  console.log("--- Benchmark Data Coverage ---");
  const benchmarks = await db.instrument.findMany({
    where: { instrumentType: { in: ["INDEX", "ETF"] } },
    select: { id: true, code: true, name: true },
  });

  for (const b of benchmarks) {
    const count = await db.price.count({ where: { instrumentId: b.id } });
    const earliest = await db.price.findFirst({
      where: { instrumentId: b.id },
      orderBy: { date: "asc" },
      select: { date: true },
    });
    const latest = await db.price.findFirst({
      where: { instrumentId: b.id },
      orderBy: { date: "desc" },
      select: { date: true },
    });
    const range =
      earliest && latest
        ? `${earliest.date.toISOString().split("T")[0]} → ${latest.date.toISOString().split("T")[0]}`
        : "no data";
    console.log(`  ${b.code.padEnd(10)} ${count.toString().padStart(5)} prices  (${range})`);
  }

  console.log("\n=== Verification Complete ===");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
