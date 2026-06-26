import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

/**
 * Seed guard: every system model must be valid across its lookback period —
 * every constituent priced on/before the purchase date (today − lookbackYears)
 * AND still actively priced today (not stale ⇒ not delisted).
 *
 * The coverage logic is inlined (rather than importing getModelCoverage) because
 * lib/services/model-portfolio.ts is marked `server-only`, which throws when
 * imported from a plain tsx script. This mirrors that function exactly.
 */

const STALE_DAYS = 10;

async function main() {
  const { db } = await import("../lib/db");

  const models = await db.modelPortfolio.findMany({
    where: { isSystem: true },
    select: {
      id: true,
      slug: true,
      defaultLookbackYears: true,
      constituents: {
        select: { instrumentId: true, instrument: { select: { code: true } } },
      },
    },
  });

  if (models.length === 0) {
    console.error("No system models found. Run seed-models.ts first.");
    process.exit(1);
  }

  const today = new Date();
  const staleCutoff = new Date(today);
  staleCutoff.setDate(staleCutoff.getDate() - STALE_DAYS);

  const failures: string[] = [];

  for (const m of models) {
    const periodStart = new Date(today);
    periodStart.setFullYear(periodStart.getFullYear() - m.defaultLookbackYears);

    const invalidCodes: string[] = [];

    for (const c of m.constituents) {
      const first = await db.price.findFirst({
        where: { instrumentId: c.instrumentId },
        orderBy: { date: "asc" },
        select: { date: true },
      });
      const last = await db.price.findFirst({
        where: { instrumentId: c.instrumentId },
        orderBy: { date: "desc" },
        select: { date: true },
      });

      const coversStart = first ? first.date <= periodStart : false;
      const stale = last ? last.date < staleCutoff : true;
      if (!(coversStart && !stale)) invalidCodes.push(c.instrument.code);
    }

    if (invalidCodes.length > 0) {
      failures.push(
        `${m.slug}: invalid/delisted constituents → ${invalidCodes.join(", ")}`
      );
    } else {
      console.log(`  ✓ ${m.slug} — valid across lookback period`);
    }
  }

  await db.$disconnect();

  if (failures.length) {
    console.error(
      `\nModel validation FAILED:\n${failures.map((f) => `  ✗ ${f}`).join("\n")}`
    );
    process.exit(1); // non-zero ⇒ CI / P2 run fails loudly
  }

  console.log(
    `\nAll ${models.length} system models valid across their lookback period.`
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
