import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

const { db } = await import("../lib/db");
const { fetchHistoricalPrices } = await import("../lib/services/price-service");

const DEFAULT_YEARS = 5;

async function main() {
  const yearsArg = process.argv.find((a) => a.startsWith("--years="));
  const years = yearsArg ? parseInt(yearsArg.split("=")[1], 10) : DEFAULT_YEARS;

  const to = new Date();
  const from = new Date();
  from.setFullYear(from.getFullYear() - years);

  // Fetch all benchmark instruments (INDEX and ETF types used in seed)
  const benchmarks = await db.instrument.findMany({
    where: { instrumentType: { in: ["INDEX", "ETF"] } },
    select: { id: true, code: true, marketCode: true, name: true },
  });

  if (benchmarks.length === 0) {
    console.error("No benchmark instruments found. Run seed-benchmarks.ts first.");
    process.exit(1);
  }

  console.log(`Fetching ${years} years of prices for ${benchmarks.length} benchmarks...\n`);

  let totalStored = 0;
  let totalSkipped = 0;

  for (let i = 0; i < benchmarks.length; i++) {
    const benchmark = benchmarks[i];
    const progress = `[${i + 1}/${benchmarks.length}]`;

    // Check existing price coverage to avoid refetching
    const existingCount = await db.price.count({
      where: { instrumentId: benchmark.id, date: { gte: from, lte: to } },
    });
    const latestPrice = await db.price.findFirst({
      where: { instrumentId: benchmark.id },
      orderBy: { date: "desc" },
      select: { date: true },
    });

    if (existingCount > 0 && latestPrice) {
      const daysSinceLatest = Math.floor(
        (to.getTime() - latestPrice.date.getTime()) / (1000 * 60 * 60 * 24)
      );
      // Skip if we already have data and the latest price is within 3 days
      if (daysSinceLatest <= 3) {
        console.log(
          `${progress} ${benchmark.code} (${benchmark.name}) — ${existingCount} prices exist, up to date ✓`
        );
        totalSkipped += existingCount;
        continue;
      }
      // Only fetch from the day after latest existing price
      const fetchFrom = new Date(latestPrice.date);
      fetchFrom.setDate(fetchFrom.getDate() + 1);
      console.log(
        `${progress} ${benchmark.code} (${benchmark.name}) — ${existingCount} exist, fetching from ${fetchFrom.toISOString().split("T")[0]}...`
      );
      try {
        const stored = await fetchHistoricalPrices(
          benchmark.id,
          benchmark.code,
          benchmark.marketCode,
          fetchFrom,
          to
        );
        totalStored += stored;
        console.log(`     ✓ +${stored} new prices`);
      } catch (err) {
        console.error(`     ✗ Failed: ${err instanceof Error ? err.message : err}`);
      }
    } else {
      // No existing data — full fetch
      console.log(
        `${progress} ${benchmark.code} (${benchmark.name}) — fetching full ${years}Y history...`
      );
      try {
        const stored = await fetchHistoricalPrices(
          benchmark.id,
          benchmark.code,
          benchmark.marketCode,
          from,
          to
        );
        totalStored += stored;
        if (stored === 0) {
          console.log(`     ⚠ 0 prices returned — ticker may not exist on Yahoo Finance`);
        } else {
          console.log(`     ✓ ${stored} prices stored`);
        }
      } catch (err) {
        console.error(`     ✗ Failed: ${err instanceof Error ? err.message : err}`);
      }
    }

    // Respect Yahoo Finance rate limits — pause between instruments
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Done — ${totalStored} new prices stored, ${totalSkipped} already existed.`);

  // Show coverage summary
  console.log(`\nBenchmark coverage:`);
  for (const b of benchmarks) {
    const count = await db.price.count({ where: { instrumentId: b.id } });
    console.log(`  ${b.code.padEnd(10)} ${count.toString().padStart(5)} prices`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
