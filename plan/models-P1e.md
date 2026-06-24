# Model Portfolios — P1e: Default Model Seed Library

**Environment:** Windows (coding only — authoring definitions + seed script source). The
seed itself **runs in Codespaces (P2)**.

## Objective

Ship a curated library of **system** model portfolios (`userId = null`, `isSystem = true`,
visible read-only to every user) so the feature is useful out of the box. Covers diversified
multi-asset ETF strategies (Stockspot/Vanguard-style risk bands), all-in-one single-fund
ETFs, an income/high-yield model, and direct-share ASX index models in equal- and
market-weight.

> **Documentation-first:** ETF tickers, current constituents and any weights below are a
> _starting specification_. Before seeding, **verify** each ticker exists and the index
> membership is current (issuers change tickers; index reviews add/drop names). Record
> verified facts in `docs/KNOWLEDGE.md`. Sources used to draft this list: Stockspot
> portfolios page, Vanguard AU diversified ETFs, Betashares, Wikipedia S&P/ASX 20.

> **No delisted names (hard rule):** every system-model constituent must be a **currently
> listed, actively priced** instrument with price history covering the model's lookback
> period (default 3 years). Delisted/acquired/renamed tickers are **eliminated** — the seed
> script aborts if any constituent fails the coverage check (Task 4). Known casualties to
> replace: `NCM` (Newcrest — acquired by Newmont, delisted Nov 2023), and any other name that
> has since been removed from its index.

## Prerequisites

- P1a (schema) + P1b (`resolveInstrument`-style upsert) complete.
- Read `prisma/seed.ts`, `scripts/seed-benchmarks.ts`, `scripts/fetch-benchmark-prices.ts`,
  and `lib/services/price-service.ts` / `lib/providers/yahoo-finance.ts`.

---

## Task 1: Default model definitions

**File: `lib/constants/default-models.ts`** (new) — single source of truth, consumed by the
seed script (and optionally surfaced in docs/UI).

```typescript
export interface DefaultConstituent {
  code: string;        // ASX ticker WITHOUT suffix as stored in Instrument.code
  marketCode: string;  // "ASX"
  name: string;
  weight: number;      // 0..1; per-model constituent weights sum to 1
}

export interface DefaultModel {
  slug: string;        // stable unique id
  name: string;
  category: "conservative" | "moderately_conservative" | "balanced" | "growth" | "high_growth" | "high_yield" | "index";
  provider: "Vanguard" | "Betashares" | "ASX" | "Custom";
  description: string;
  notionalCapital?: number; // default 1_000_000
  minCashWeight?: number;   // default 0
  constituents: DefaultConstituent[];
}
```

### 1a. Diversified blended ETF strategies (5-asset, Stockspot-style)

Building blocks: `VAS` (AU shares), `VGS` (global shares), `VGE` (emerging mkts),
`VAF` (AU bonds), `GOLD` (physical gold). Growth-asset % shown for reference.

| Model (slug) | Category | VAS | VGS | VGE | VAF | GOLD | minCash | ~Growth |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `blend-conservative` | conservative | 12% | 13% | 5% | 60% | 10% | 5% | ~30% |
| `blend-moderately-conservative` | moderately_conservative | 18% | 20% | 7% | 45% | 10% | 3% | ~45% |
| `blend-balanced` | balanced | 24% | 27% | 9% | 32% | 8% | 2% | ~60% |
| `blend-growth` | growth | 30% | 34% | 12% | 19% | 5% | 0% | ~78% |
| `blend-high-growth` | high_growth | 36% | 42% | 15% | 5% | 2% | 0% | ~95% |

### 1b. All-in-one single-fund ETF strategies

| Slug | Category | Provider | Constituent (100%) |
| --- | --- | --- | --- |
| `vanguard-vdco` | conservative | Vanguard | `VDCO` Vanguard Diversified Conservative |
| `vanguard-vdba` | balanced | Vanguard | `VDBA` Vanguard Diversified Balanced |
| `vanguard-vdgr` | growth | Vanguard | `VDGR` Vanguard Diversified Growth |
| `vanguard-vdhg` | high_growth | Vanguard | `VDHG` Vanguard Diversified High Growth |
| `betashares-dhhf` | high_growth | Betashares | `DHHF` Betashares Diversified All Growth |

### 1c. Income / high-yield model

| Slug | Category | Constituents |
| --- | --- | --- |
| `income-high-yield` | high_yield | `VHY` 45%, `IHD` 20%, `RDV` 15%, `VGS` 10%, `VAF` 10% |

### 1d. Direct-share ASX index models

Constituent universe (verify membership at seed time — the S&P/ASX 20 draft list):
`CBA, BHP, CSL, NAB, WBC, ANZ, MQG, WES, GMG, FMG, TLS, WOW, TCL, RIO, ALL, WDS, COL, STO, S32, NCM`.

> **NCM (Newcrest) was acquired in 2023 and is delisted** — it must be removed and the 20th
> slot filled with the **current** ASX-20 constituent (resolve from a live source at seed
> time, e.g. via index membership or top-20 by market cap among priced ASX instruments).
> Generate ASX-50 membership from a current source rather than hand-coding. The seed guard
> (Task 4) will reject any model that still contains a delisted name, so this cannot ship
> accidentally.

| Slug | Category | Definition |
| --- | --- | --- |
| `asx10-equal` | index | Top 10 by market cap, **equal weight** (10% each) |
| `asx20-equal` | index | All 20, **equal weight** (5% each) |
| `asx20-market` | index | All 20, **market-cap weight** (computed at seed time) |
| `asx50-equal` | index | All 50, **equal weight** (2% each) — membership resolved at seed time |

```typescript
// Helper to build equal-weight index models from a ticker list.
export function equalWeightModel(slug: string, name: string, tickers: Array<{ code: string; name: string }>): DefaultModel {
  const w = 1 / tickers.length;
  return {
    slug, name, category: "index", provider: "ASX",
    description: `${tickers.length} largest ASX companies, equal weighted.`,
    constituents: tickers.map((t) => ({ code: t.code, marketCode: "ASX", name: t.name, weight: w })),
  };
}
```

For `asx20-market`, leave `weight` to be computed by the seed script from
`marketCap` (via `InstrumentInfo`) or `price × sharesOutstanding`, then normalised. If
market-cap data is unavailable at seed time, fall back to equal weight and log a warning.

---

## Task 2: Seed script

**File: `scripts/seed-models.ts`** (new) — idempotent upsert by `slug`. Mirrors
`scripts/seed-benchmarks.ts` structure (standalone `tsx` script using the Prisma client).

```typescript
import { db } from "@/lib/db";
import { DEFAULT_MODELS } from "@/lib/constants/default-models";

async function upsertInstrument(code: string, marketCode: string, name: string) {
  return db.instrument.upsert({
    where: { code_marketCode: { code, marketCode } },
    create: { code, marketCode, name, instrumentType: "etf", currency: "AUD", country: "AU" },
    update: {},
  });
}

async function main() {
  for (const m of DEFAULT_MODELS) {
    // 1. Resolve all constituent instruments.
    const constituents = await Promise.all(
      m.constituents.map(async (c) => ({
        instrumentId: (await upsertInstrument(c.code, c.marketCode, c.name)).id,
        targetWeight: c.weight,
      })),
    );

    // 2. Upsert the system model by slug; replace constituents.
    const existing = await db.modelPortfolio.findUnique({ where: { slug: m.slug } });
    if (existing) {
      await db.modelConstituent.deleteMany({ where: { modelPortfolioId: existing.id } });
      await db.modelPortfolio.update({
        where: { id: existing.id },
        data: {
          name: m.name, description: m.description, category: m.category, provider: m.provider,
          notionalCapital: m.notionalCapital ?? 1_000_000, minCashWeight: m.minCashWeight ?? 0,
          constituents: { create: constituents },
        },
      });
    } else {
      await db.modelPortfolio.create({
        data: {
          slug: m.slug, userId: null, isSystem: true,
          name: m.name, description: m.description, category: m.category, provider: m.provider,
          notionalCapital: m.notionalCapital ?? 1_000_000, minCashWeight: m.minCashWeight ?? 0,
          constituents: { create: constituents },
        },
      });
    }
    console.log(`seeded model: ${m.slug} (${constituents.length} holdings)`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
```

Add an npm script to `package.json` (P2 runs it):

```jsonc
{
  "scripts": {
    "seed:models": "tsx scripts/seed-models.ts"
  }
}
```

---

## Task 3: Price coverage for model instruments

Model instantiation and value series need historical prices for every unique constituent
ticker (default lookback 3 years; allow up to 10Y for charts). Extend the existing benchmark
price-fetch approach.

**File: `scripts/fetch-model-prices.ts`** (new, or extend `fetch-benchmark-prices.ts`):

```typescript
// 1. Collect distinct instrumentIds across all ModelConstituent rows.
// 2. For each, fetch ~10 years daily history via lib/providers/yahoo-finance.ts
//    (Yahoo symbol = `${code}.AX` for ASX), incremental: skip dates already present.
// 3. Upsert into Price (instrumentId+date unique).
```

Add script:

```jsonc
{ "scripts": { "fetch:model-prices": "tsx scripts/fetch-model-prices.ts" } }
```

> Reuse the incremental "only fetch missing dates" logic already in
> `scripts/fetch-benchmark-prices.ts` to stay within rate limits and keep re-runs cheap.

---

## Task 4: Seed validation guard (eliminate delisted / period-invalid names)

After prices are fetched, **validate every system model is valid across its lookback period**
and contains **no delisted** constituents. This guarantees default models never ship broken.

**File: `scripts/validate-models.ts`** (new) — reuse `getModelCoverage` from
`lib/services/model-portfolio.ts`.

```typescript
import { db } from "@/lib/db";
import { getModelCoverage } from "@/lib/services/model-portfolio";

async function main() {
  const models = await db.modelPortfolio.findMany({ where: { isSystem: true } });
  const failures: string[] = [];

  for (const m of models) {
    const cov = await getModelCoverage(m.id); // default lookback period
    if (!cov.valid) {
      failures.push(`${m.slug}: invalid/delisted constituents → ${cov.invalidCodes.join(", ")}`);
    }
  }

  if (failures.length) {
    console.error("Model validation FAILED:\n" + failures.join("\n"));
    process.exit(1); // non-zero ⇒ CI / P2 run fails loudly
  }
  console.log(`All ${models.length} system models valid across their lookback period.`);
  process.exit(0);
}
main();
```

Add script:

```jsonc
{ "scripts": { "validate:models": "tsx scripts/validate-models.ts" } }
```

Optionally call `validate-models` at the end of `seed-models.ts` (after prices exist) and in
the create/update path-warning, but the standalone script is the gate run in P2.

> **Definition of "valid across the period":** every constituent has a price on/before the
> purchase date (`today − defaultLookbackYears`) **and** a recent (non-stale) price today. A
> delisted name fails the second test; a too-new listing fails the first. Either way the seed
> guard rejects it, forcing a currently-listed replacement.

---

## Deliverables (P1e)

- [ ] `lib/constants/default-models.ts` — all model definitions (1a–1d) + `equalWeightModel` helper.
- [ ] `scripts/seed-models.ts` + `seed:models` npm script.
- [ ] `scripts/fetch-model-prices.ts` + `fetch:model-prices` npm script.
- [ ] `scripts/validate-models.ts` + `validate:models` npm script (no-delisted / period-valid guard).
- [ ] `package.json` script entries.
- [ ] No delisted constituents (e.g. `NCM` removed); ASX-20/50 membership resolved from a current source.
- [ ] Notes in plan to verify tickers/membership before seeding (update `docs/KNOWLEDGE.md` in P2).

## Commit

```
feat(models): default model library, seed script and price-fetch script
```
