import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import type {
  DefaultConstituent,
  DefaultModel,
} from "../lib/constants/default-models";

async function main() {
  const { db } = await import("../lib/db");
  const { DEFAULT_MODELS } = await import("../lib/constants/default-models");

  async function upsertInstrument(c: DefaultConstituent) {
    return db.instrument.upsert({
      where: { code_marketCode: { code: c.code, marketCode: c.marketCode } },
      create: {
        code: c.code,
        marketCode: c.marketCode,
        name: c.name,
        instrumentType: c.instrumentType ?? "etf",
        currency: "AUD",
        country: "AU",
      },
      update: {},
    });
  }

  /**
   * Resolve constituent weights. For market-weighted models, derive weights from
   * InstrumentInfo.marketCap (normalised); fall back to the supplied (equal)
   * weights with a warning when market-cap data is unavailable.
   */
  async function resolveConstituents(
    m: DefaultModel,
    instruments: { id: string; constituent: DefaultConstituent }[]
  ) {
    if (!m.marketWeighted) {
      return instruments.map(({ id, constituent }) => ({
        instrumentId: id,
        targetWeight: constituent.weight,
      }));
    }

    const infos = await db.instrumentInfo.findMany({
      where: { instrumentId: { in: instruments.map((i) => i.id) } },
      select: { instrumentId: true, marketCap: true },
    });
    const capById = new Map(
      infos.map((i) => [i.instrumentId, i.marketCap ? Number(i.marketCap) : 0])
    );
    const totalCap = instruments.reduce(
      (a, { id }) => a + (capById.get(id) ?? 0),
      0
    );

    if (totalCap <= 0) {
      console.warn(
        `  ⚠ ${m.slug}: no market-cap data — falling back to equal weight.`
      );
      const w = 1 / instruments.length;
      return instruments.map(({ id }) => ({
        instrumentId: id,
        targetWeight: w,
      }));
    }

    return instruments.map(({ id }) => ({
      instrumentId: id,
      targetWeight: (capById.get(id) ?? 0) / totalCap,
    }));
  }

  console.log(`Seeding ${DEFAULT_MODELS.length} system models...\n`);

  for (const m of DEFAULT_MODELS) {
    // 1. Resolve all constituent instruments.
    const instruments = await Promise.all(
      m.constituents.map(async (c) => ({
        id: (await upsertInstrument(c)).id,
        constituent: c,
      }))
    );

    const constituents = await resolveConstituents(m, instruments);

    // 2. Upsert the system model by slug; replace constituents.
    const existing = await db.modelPortfolio.findUnique({
      where: { slug: m.slug },
    });

    if (existing) {
      await db.modelConstituent.deleteMany({
        where: { modelPortfolioId: existing.id },
      });
      await db.modelPortfolio.update({
        where: { id: existing.id },
        data: {
          name: m.name,
          description: m.description,
          category: m.category,
          provider: m.provider,
          isSystem: true,
          userId: null,
          notionalCapital: m.notionalCapital ?? 1_000_000,
          minCashWeight: m.minCashWeight ?? 0,
          constituents: { create: constituents },
        },
      });
    } else {
      await db.modelPortfolio.create({
        data: {
          slug: m.slug,
          userId: null,
          isSystem: true,
          name: m.name,
          description: m.description,
          category: m.category,
          provider: m.provider,
          notionalCapital: m.notionalCapital ?? 1_000_000,
          minCashWeight: m.minCashWeight ?? 0,
          constituents: { create: constituents },
        },
      });
    }

    console.log(`  ✓ ${m.slug} (${constituents.length} holdings)`);
  }

  console.log(`\nDone — ${DEFAULT_MODELS.length} system models seeded.`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
