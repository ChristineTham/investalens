import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

const DEFAULT_YEARS = 10;

async function main() {
  const { db } = await import("../lib/db");
  const { fetchHistoricalPrices } = await import(
    "../lib/services/price-service"
  );
  const yearsArg = process.argv.find((a) => a.startsWith("--years="));
  const years = yearsArg ? parseInt(yearsArg.split("=")[1], 10) : DEFAULT_YEARS;

  const to = new Date();
  const from = new Date();
  from.setFullYear(from.getFullYear() - years);

  // Distinct instruments referenced by any system/model constituent.
  const rows = await db.modelConstituent.findMany({
    select: {
      instrument: {
        select: { id: true, code: true, marketCode: true, name: true },
      },
    },
  });

  const instruments = [
    ...new Map(rows.map((r) => [r.instrument.id, r.instrument])).values(),
  ];

  if (instruments.length === 0) {
    console.error("No model constituents found. Run seed-models.ts first.");
    process.exit(1);
  }

  console.log(
    `Fetching up to ${years}Y of prices for ${instruments.length} model constituents...\n`
  );

  let totalStored = 0;
  let totalSkipped = 0;

  for (let i = 0; i < instruments.length; i++) {
    const inst = instruments[i];
    const progress = `[${i + 1}/${instruments.length}]`;

    const existingCount = await db.price.count({
      where: { instrumentId: inst.id, date: { gte: from, lte: to } },
    });
    const latestPrice = await db.price.findFirst({
      where: { instrumentId: inst.id },
      orderBy: { date: "desc" },
      select: { date: true },
    });

    // Incremental: skip if up to date, else fetch only the missing tail.
    if (existingCount > 0 && latestPrice) {
      const daysSinceLatest = Math.floor(
        (to.getTime() - latestPrice.date.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLatest <= 3) {
        console.log(
          `${progress} ${inst.code} (${inst.name}) — ${existingCount} prices exist, up to date ✓`
        );
        totalSkipped += existingCount;
        continue;
      }
      const fetchFrom = new Date(latestPrice.date);
      fetchFrom.setDate(fetchFrom.getDate() + 1);
      console.log(
        `${progress} ${inst.code} (${inst.name}) — ${existingCount} exist, fetching from ${fetchFrom.toISOString().split("T")[0]}...`
      );
      try {
        const stored = await fetchHistoricalPrices(
          inst.id,
          inst.code,
          inst.marketCode,
          fetchFrom,
          to
        );
        totalStored += stored;
        console.log(`     ✓ +${stored} new prices`);
      } catch (err) {
        console.error(
          `     ✗ Failed: ${err instanceof Error ? err.message : err}`
        );
      }
    } else {
      console.log(
        `${progress} ${inst.code} (${inst.name}) — fetching full ${years}Y history...`
      );
      try {
        const stored = await fetchHistoricalPrices(
          inst.id,
          inst.code,
          inst.marketCode,
          from,
          to
        );
        totalStored += stored;
        if (stored === 0) {
          console.log(
            `     ⚠ 0 prices returned — ticker may not exist on Yahoo Finance`
          );
        } else {
          console.log(`     ✓ ${stored} prices stored`);
        }
      } catch (err) {
        console.error(
          `     ✗ Failed: ${err instanceof Error ? err.message : err}`
        );
      }
    }

    // Respect Yahoo Finance rate limits.
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(
    `Done — ${totalStored} new prices stored, ${totalSkipped} already existed.`
  );

  console.log(`\nModel constituent coverage:`);
  for (const inst of instruments) {
    const count = await db.price.count({ where: { instrumentId: inst.id } });
    console.log(`  ${inst.code.padEnd(8)} ${count.toString().padStart(5)} prices`);
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
