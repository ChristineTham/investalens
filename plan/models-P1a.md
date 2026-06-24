# Model Portfolios — P1a: Schema & Data Layer

**Environment:** Windows (coding only — no execution). Migration runs in P2 (Codespaces).

## Objective

Define the Prisma data model for model portfolios and build the **instantiation engine**
and **model analytics services** (value & returns time series). These services are the
foundation that the UI, optimisation and backtesting phases consume.

## Recommended skills

- **prisma-client-api** — model relations, Decimal handling.
- **vercel-react-best-practices** — keep services server-only and tree-shakeable.

## Prerequisites

- R1 + R2 complete (holdings, prices, `analytics-data.ts`, analytics client all exist).
- Read `lib/services/analytics-data.ts` (`getPortfolioTimeSeriesBetween`, `getPortfolioReturnsMatrix`) and `lib/calculations/position.ts`.

---

## Task 1: Prisma schema additions

**File: `prisma/schema.prisma`** — append a new `MODEL PORTFOLIOS` section and add the
back-relation on `User` and `Instrument`.

```prisma
// ─── MODEL PORTFOLIOS ────────────────────────────────────────────────────────

model ModelPortfolio {
  id          String  @id @default(cuid())
  // null userId ⇒ system/default (seeded) model, readable by every user.
  userId      String?
  name        String
  // Stable slug for seeded defaults (e.g. "vanguard-balanced", "asx20-equal").
  slug        String? @unique
  description String?
  // conservative | moderately_conservative | balanced | growth | high_growth | high_yield | index
  category    String  @default("balanced")
  // Vanguard | Betashares | ASX | Custom
  provider    String?
  isSystem    Boolean @default(false)
  archived    Boolean @default(false)

  baseCurrency         String  @default("AUD")
  // Notional opening cash used to "buy" the model. Default AUD $1m.
  notionalCapital      Decimal @default(1000000) @db.Decimal(18, 2)
  // Strategic minimum cash reserve as a fraction (0..1) of notional capital.
  minCashWeight        Decimal @default(0) @db.Decimal(9, 6)
  // Default instantiation lookback in whole years before "today".
  defaultLookbackYears Int     @default(3)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user           User?                @relation(fields: [userId], references: [id], onDelete: Cascade)
  constituents   ModelConstituent[]
  instantiations ModelInstantiation[]

  @@index([userId])
  @@index([category])
}

model ModelConstituent {
  id               String  @id @default(cuid())
  modelPortfolioId String
  instrumentId     String
  // Target weight as a fraction (0..1). Non-cash weights sum to 1.
  targetWeight     Decimal @db.Decimal(9, 6)
  notes            String?
  createdAt        DateTime @default(now())

  modelPortfolio ModelPortfolio @relation(fields: [modelPortfolioId], references: [id], onDelete: Cascade)
  instrument     Instrument     @relation(fields: [instrumentId], references: [id])

  @@unique([modelPortfolioId, instrumentId])
  @@index([modelPortfolioId])
}

// Optional cache of a computed instantiation (whole-unit purchase) at a date.
// Computed lazily; safe to delete/rebuild. Keyed by model + date + capital.
model ModelInstantiation {
  id               String   @id @default(cuid())
  modelPortfolioId String
  asOfDate         DateTime @db.Date
  notionalCapital  Decimal  @db.Decimal(18, 2)
  // [{ instrumentId, code, units, price, cost, weight }]
  holdings         Json
  residualCash     Decimal  @db.Decimal(18, 2)
  createdAt        DateTime @default(now())

  modelPortfolio ModelPortfolio @relation(fields: [modelPortfolioId], references: [id], onDelete: Cascade)

  @@unique([modelPortfolioId, asOfDate, notionalCapital])
  @@index([modelPortfolioId])
}
```

**Back-relations** — add to existing models:

```prisma
model User {
  // ...existing fields...
  modelPortfolios ModelPortfolio[]
}

model Instrument {
  // ...existing fields...
  modelConstituents ModelConstituent[]
}
```

> **Migration note (P2 only):** in Codespaces run
> `pnpm prisma migrate dev --name add_model_portfolios`. Do **not** run on Windows.

---

## Task 2: Validators

**File: `lib/validators/model.ts`** (new) — mirror `lib/validators/portfolio.ts` style.

```typescript
import { z } from "zod";

export const MODEL_CATEGORIES = [
  "conservative",
  "moderately_conservative",
  "balanced",
  "growth",
  "high_growth",
  "high_yield",
  "index",
] as const;

export const constituentSchema = z.object({
  instrumentCode: z.string().min(1),
  marketCode: z.string().min(1).default("ASX"),
  instrumentName: z.string().optional(),
  targetWeight: z.number().min(0).max(1),
});

export const createModelSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  category: z.enum(MODEL_CATEGORIES).default("balanced"),
  provider: z.string().max(40).optional(),
  baseCurrency: z.string().length(3).default("AUD"),
  notionalCapital: z.number().positive().default(1_000_000),
  minCashWeight: z.number().min(0).max(0.95).default(0),
  defaultLookbackYears: z.number().int().min(1).max(30).default(3),
  constituents: z.array(constituentSchema).min(1),
});

export const updateModelSchema = createModelSchema.partial().extend({
  id: z.string().min(1),
});

// Non-cash weights must sum to ~1 (allow tiny float error). Validate in the action.
export function assertWeightsSumToOne(weights: number[], tolerance = 1e-4) {
  const total = weights.reduce((a, w) => a + w, 0);
  if (Math.abs(total - 1) > tolerance) {
    throw new Error(`Constituent weights must sum to 1 (got ${total.toFixed(4)}).`);
  }
}
```

---

## Task 3: Instantiation engine

**File: `lib/services/model-portfolio.ts`** (new).

Implements the whole-unit notional purchase described in `models-overview.md`. Uses the
`Price` table with forward-fill (same approach as `analytics-data.ts`).

```typescript
import "server-only";
import { db } from "@/lib/db";

export interface InstantiatedHolding {
  instrumentId: string;
  code: string;
  marketCode: string;
  name: string;
  targetWeight: number;
  price: number;        // purchase-date price (forward-filled)
  units: number;        // whole units
  cost: number;         // units * price
  actualWeight: number; // cost / notionalCapital
}

export interface Instantiation {
  modelPortfolioId: string;
  asOfDate: string;             // ISO date
  notionalCapital: number;
  holdings: InstantiatedHolding[];
  investedCash: number;
  residualCash: number;
  residualWeight: number;
}

/** Resolve the price for an instrument on/just-before a date (forward fill). */
async function priceAsOf(instrumentId: string, date: Date): Promise<number | null> {
  const row = await db.price.findFirst({
    where: { instrumentId, date: { lte: date } },
    orderBy: { date: "desc" },
    select: { close: true, adjustedClose: true },
  });
  if (!row) return null;
  return Number(row.adjustedClose ?? row.close);
}

export function defaultPurchaseDate(lookbackYears: number, today = new Date()): Date {
  const d = new Date(today);
  d.setFullYear(d.getFullYear() - lookbackYears);
  return d;
}

export async function instantiateModel(
  modelPortfolioId: string,
  opts?: { asOfDate?: Date; notionalCapital?: number },
): Promise<Instantiation> {
  const model = await db.modelPortfolio.findUnique({
    where: { id: modelPortfolioId },
    include: { constituents: { include: { instrument: true } } },
  });
  if (!model) throw new Error("Model portfolio not found");

  const notional = opts?.notionalCapital ?? Number(model.notionalCapital);
  const asOf = opts?.asOfDate ?? defaultPurchaseDate(model.defaultLookbackYears);
  const minCash = Number(model.minCashWeight);
  const allocatable = notional * (1 - minCash);

  const holdings: InstantiatedHolding[] = [];
  let investedCash = 0;

  for (const c of model.constituents) {
    const weight = Number(c.targetWeight);
    const price = await priceAsOf(c.instrumentId, asOf);
    if (!price || price <= 0) {
      // No price ⇒ allocation falls through to residual cash. Surface in UI.
      holdings.push({
        instrumentId: c.instrumentId,
        code: c.instrument.code,
        marketCode: c.instrument.marketCode,
        name: c.instrument.name,
        targetWeight: weight,
        price: 0,
        units: 0,
        cost: 0,
        actualWeight: 0,
      });
      continue;
    }
    const budget = allocatable * weight;
    const units = Math.floor(budget / price); // whole units only
    const cost = units * price;
    investedCash += cost;
    holdings.push({
      instrumentId: c.instrumentId,
      code: c.instrument.code,
      marketCode: c.instrument.marketCode,
      name: c.instrument.name,
      targetWeight: weight,
      price,
      units,
      cost,
      actualWeight: cost / notional,
    });
  }

  const residualCash = notional - investedCash;
  return {
    modelPortfolioId,
    asOfDate: asOf.toISOString().slice(0, 10),
    notionalCapital: notional,
    holdings,
    investedCash,
    residualCash,
    residualWeight: residualCash / notional,
  };
}
```

> **Edge cases to document in code comments:**
> - Missing price on the exact date → forward-fill via `date: { lte }`.
> - **Delisted / insufficient-history constituents** must NOT silently roll into residual
>   cash. If a constituent has no valid price at the purchase date (newly listed) or no
>   recent price (delisted), `instantiateModel` sets `holding.invalid = true` and the
>   instantiation's `valid` flag to `false`, listing offending codes. The UI surfaces this
>   prominently; **system/default models must never be invalid** (guaranteed by the P1e seed
>   validation). See Task 6.
> - `minCashWeight` guarantees the reserve is _at least_ that fraction; rounding-down of
>   units only ever increases residual cash, so the floor is always respected.
> - Currency: P1 assumes AUD instruments. Non-AUD constituents are out of scope until R3
>   (note a TODO to apply `ExchangeRate` at the purchase date).

Add `invalid: boolean` to `InstantiatedHolding` and `valid: boolean` + `invalidCodes:
string[]` to `Instantiation`; populate them from the coverage check in Task 6.

---

## Task 4: Model analytics — value & returns series

**File: `lib/services/model-analytics.ts`** (new).

Two outputs:

1. **Value series** — `V_t = Σ(units_i × price_{i,t}) + residualCash` from `asOfDate` to today,
   for the `/models` dashboard (reuses the date grid + forward-fill from `analytics-data.ts`).
2. **Returns adapter** — produce the same shape as `getPortfolioReturnsMatrix()` so the
   optimiser/backtester can treat a model exactly like a real portfolio (weights from
   `targetWeight`, per-asset returns from `Price`).

```typescript
import "server-only";
import { db } from "@/lib/db";
import { instantiateModel } from "@/lib/services/model-portfolio";
import type { ValuePoint } from "@/components/charts/portfolio-chart-utils";

/** Daily value series for an instantiated model from purchase date → today. */
export async function getModelValueSeries(
  modelPortfolioId: string,
  opts?: { asOfDate?: Date; notionalCapital?: number; from?: Date; to?: Date },
): Promise<{ valueSeries: ValuePoint[]; instantiation: Awaited<ReturnType<typeof instantiateModel>> }> {
  const inst = await instantiateModel(modelPortfolioId, opts);
  const purchase = new Date(inst.asOfDate);
  const from = opts?.from ?? purchase;
  const to = opts?.to ?? new Date();

  // Load prices for all priced holdings across [from, to].
  const ids = inst.holdings.filter((h) => h.units > 0).map((h) => h.instrumentId);
  const prices = await db.price.findMany({
    where: { instrumentId: { in: ids }, date: { gte: from, lte: to } },
    orderBy: { date: "asc" },
    select: { instrumentId: true, date: true, close: true, adjustedClose: true },
  });

  // Build a date grid and forward-fill per instrument (see analytics-data.ts pattern).
  // For each date: Total = Σ(units * price_t) + residualCash. Also expose per-code columns.
  // ...assemble ValuePoint[] with { date, Total, [code]: value } ...
  return { valueSeries: /* assembled */ [], instantiation: inst };
}

/**
 * Returns matrix for a model in the SAME shape as getPortfolioReturnsMatrix(), so it can
 * be passed unchanged to the Python optimiser/backtester via analytics-client.ts.
 * weights = constituent targetWeights; per-asset daily returns from adjustedClose.
 */
export async function getModelReturnsMatrix(
  modelPortfolioId: string,
  range: "1Y" | "3Y" | "5Y" | "10Y" | "MAX",
): Promise<{
  dates: string[];
  assets: string[];
  returns: number[][];
  weights: Record<string, number>;
  prices: Record<string, number[]>;
}> {
  // 1. Load model + constituents.
  // 2. Resolve range → from date.
  // 3. Load adjustedClose per constituent instrument over [from, today], forward-fill.
  // 4. Compute daily returns r_t = price_t / price_{t-1} - 1.
  // 5. weights = { code: targetWeight }.
  // Mirror the column ordering / return shape of getPortfolioReturnsMatrix().
  return { dates: [], assets: [], returns: [], weights: {}, prices: {} };
}
```

> Keep the column/return shape **byte-compatible** with `getPortfolioReturnsMatrix()` so
> P1d can swap a model for a real portfolio without touching the Python layer.

---

## Task 5: Extend market-data sync ("Update" button) to model constituents

The user-facing **Update** button streams through `/api/v1/market/sync-prices` →
`lib/services/price-sync.ts` (`syncSharePrices`, `syncBondPrices`, `syncStockInfo`). Today it
refreshes **benchmarks + the user's holdings only**. Model-portfolio constituents must also
be kept current — including **system/default models** so every user's defaults stay valid.

**File: `lib/services/price-sync.ts`** — extend the instrument-collection in each phase.

```typescript
// Distinct instruments referenced by any model the user can see (own + system).
const modelInstruments = await db.modelConstituent.findMany({
  where: { modelPortfolio: { OR: [{ userId }, { userId: null }] } },
  select: {
    modelPortfolio: { select: { defaultLookbackYears: true } },
    instrument: { select: { id: true, code: true, marketCode: true, currency: true, instrumentType: true } },
  },
});

// Dedupe across benchmarks + holdings + model constituents (avoid double-fetch).
// Track, per instrument, the MAX lookback of any model referencing it.
```

**`from` date for model instruments (validity across the time period):** models have **no
transactions**, so there is no earliest-trade date to anchor the backfill. Use a
lookback-aware floor so prices cover the whole instantiation period:

```typescript
const MIN_MODEL_YEARS = 5; // floor so 3y default + buffer always covered
const years = Math.max(MIN_MODEL_YEARS, maxLookbackForInstrument + 1);
const windowStart = new Date(now);
windowStart.setFullYear(windowStart.getFullYear() - years);
const from = latestPrice ? new Date(latestPrice.date.getTime() + 86400000) : windowStart;
```

Apply the same dedup/extension to:

- **`syncSharePrices`** — add model equity/ETF instruments to the shares phase (skip dividend
  auto-posting for model-only instruments — that logic is holding-specific).
- **`syncBondPrices`** — include any model constituents with `instrumentType in (bond, fixed_interest)`.
- **`syncStockInfo`** — refresh `InstrumentInfo` for model constituents too (so model detail/
  X-ray views show company info). Reuse `supportsStockInfo()` / `toYahooSymbol()`.
- Update each phase's `total` count so the streamed progress bar is accurate.

> Result: clicking **Update** now fetches prices **and** info for holdings **and** all model
> portfolios, over a window that always covers the default 3-year (and longer) lookback.

---

## Task 6: Model time-period validity & coverage service

**File: `lib/services/model-portfolio.ts`** — add a coverage check that powers the
instantiation `valid` flag, the create/update warnings (P1b), the Share Checker (P1f) and
the seed guard (P1e).

```typescript
export interface ConstituentCoverage {
  instrumentId: string;
  code: string;
  firstPrice: string | null;  // ISO date of earliest price
  lastPrice: string | null;   // ISO date of latest price
  coversStart: boolean;       // firstPrice <= periodStart (can be bought at t0)
  stale: boolean;             // lastPrice older than staleDays ⇒ likely delisted
  valid: boolean;             // coversStart && !stale
}

export interface ModelCoverage {
  modelPortfolioId: string;
  periodStart: string;
  valid: boolean;             // every constituent valid
  constituents: ConstituentCoverage[];
  invalidCodes: string[];
}

/**
 * A model is "valid across the period" iff every constituent has price history that
 * (a) starts on/before the purchase date and (b) is not stale (still actively priced).
 * Stale ⇒ delisted/suspended (e.g. an acquired company like NCM).
 */
export async function getModelCoverage(
  modelPortfolioId: string,
  opts?: { asOfDate?: Date; staleDays?: number },
): Promise<ModelCoverage> {
  const staleDays = opts?.staleDays ?? 10;
  // 1. Load model + constituents + lookback.
  // 2. periodStart = opts.asOfDate ?? defaultPurchaseDate(model.defaultLookbackYears).
  // 3. For each constituent: min(date) and max(date) from Price.
  //    coversStart = firstPrice <= periodStart; stale = max(date) < today - staleDays.
  //    valid = coversStart && !stale.
  // 4. valid = constituents.every(c => c.valid); invalidCodes = failing codes.
  return /* ... */ {} as ModelCoverage;
}
```

`instantiateModel` calls `getModelCoverage` (or shares its per-instrument min/max query) to
set `holding.invalid` / `Instantiation.valid` / `invalidCodes`.

---

## Deliverables (P1a)

- [ ] `prisma/schema.prisma` — `ModelPortfolio`, `ModelConstituent`, `ModelInstantiation` + back-relations.
- [ ] `lib/validators/model.ts`.
- [ ] `lib/services/model-portfolio.ts` (instantiation engine + `getModelCoverage`, validity flags).
- [ ] `lib/services/model-analytics.ts` (value series + returns adapter).
- [ ] `lib/services/price-sync.ts` — Update button extended to model constituents (prices + info) with lookback-aware `from`.
- [ ] No execution — migration deferred to P2.

## Commit

```
feat(models): add model-portfolio schema, instantiation engine and analytics services
```
