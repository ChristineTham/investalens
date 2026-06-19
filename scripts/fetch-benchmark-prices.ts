import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { db } from "../lib/db";
import { fetchHistoricalPrices } from "../lib/services/price-service";

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

  for (const benchmark of benchmarks) {
    try {
      console.log(`  Fetching ${benchmark.code} (${benchmark.name})...`);
      const stored = await fetchHistoricalPrices(
        benchmark.id,
        benchmark.code,
        benchmark.marketCode,
        from,
        to
      );
      totalStored += stored;
      console.log(`    ✓ ${stored} prices stored`);
    } catch (err) {
      console.error(`    ✗ Failed: ${err instanceof Error ? err.message : err}`);
    }

    // Respect Yahoo Finance rate limits — pause between instruments
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`\nDone — ${totalStored} total prices stored across ${benchmarks.length} benchmarks.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
