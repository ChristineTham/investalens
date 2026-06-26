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
  let failed = 0;

  const total = instruments.length;
  const isTTY = Boolean(process.stdout.isTTY);
  const BAR_WIDTH = 24;

  function drawBar(current: number, label: string) {
    const pct = total > 0 ? current / total : 0;
    const filled = Math.round(pct * BAR_WIDTH);
    const tally = `+${totalStored} prices, ${failed} failed`;
    const body = `[${"█".repeat(filled)}${"░".repeat(BAR_WIDTH - filled)}] ${current}/${total} ${Math.round(pct * 100)
      .toString()
      .padStart(3)}% · ${tally} · ${label}`;
    if (isTTY) {
      process.stdout.write(`\r\x1b[K${body}`);
    } else if (current === total || current % 10 === 0) {
      // Non-interactive (CI): emit an occasional plain progress line.
      console.log(body);
    }
  }

  /** Print a message above the live bar without leaving a stray fragment. */
  function note(msg: string) {
    if (isTTY) process.stdout.write("\r\x1b[K");
    console.log(msg);
  }

  for (let i = 0; i < instruments.length; i++) {
    const inst = instruments[i];
    drawBar(i, `${inst.code} …`);

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
        totalSkipped += existingCount;
        drawBar(i + 1, `${inst.code} up to date ✓`);
        continue;
      }
      const fetchFrom = new Date(latestPrice.date);
      fetchFrom.setDate(fetchFrom.getDate() + 1);
      try {
        totalStored += await fetchHistoricalPrices(
          inst.id,
          inst.code,
          inst.marketCode,
          fetchFrom,
          to
        );
      } catch (err) {
        failed++;
        note(`  ✗ ${inst.code}: ${err instanceof Error ? err.message : err}`);
      }
    } else {
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
          note(`  ⚠ ${inst.code}: 0 prices returned — may not exist on Yahoo Finance`);
        }
      } catch (err) {
        failed++;
        note(`  ✗ ${inst.code}: ${err instanceof Error ? err.message : err}`);
      }
    }

    drawBar(i + 1, inst.code);

    // Respect Yahoo Finance rate limits.
    await new Promise((r) => setTimeout(r, 2000));
  }

  if (isTTY) process.stdout.write("\n");

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
