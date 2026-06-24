# Model Portfolios — Overview

> **Status:** Planned enhancement (cross-cutting feature, builds on R1 + R2).
> **Theme:** Make _model portfolios_ first-class citizens used across the dashboard,
> optimisation and backtesting features.

## Objective

Introduce **model portfolios**: virtual, weight-based target portfolios that can be
_instantiated_ (notionally purchased) over a historical period and compared against the
user's real, consolidated portfolio. Model portfolios feed three existing surfaces —
a new `/models` dashboard, the portfolio **optimisation** feature (write optimal weights
back out as a model), and the **backtesting** feature (compare real + model portfolios
against each other and a benchmark).

Ship a library of **pre-seeded default models** (diversified-ETF strategies + direct-share
index models) so the feature is immediately useful.

## Domain definition

A **model portfolio** is defined by:

| Concept | Description |
| --- | --- |
| **Constituents** | A set of holdings (instruments), each with a target **weight** (0–1). Non-cash weights sum to 1. |
| **Notional capital** | Opening cash used to notionally buy the portfolio. Default **AUD $1,000,000**, user-configurable per model. |
| **Min cash weight** | Optional strategic minimum cash reserve (0 by default). Allocatable capital = `notionalCapital × (1 − minCashWeight)`. |
| **Lookback** | Default instantiation period — **3 years** before "today", user-configurable. |

**Instantiation** (computed dynamically, optionally cached):

1. Pick a purchase date = `today − lookbackYears` (configurable).
2. `allocatable = notionalCapital × (1 − minCashWeight)`.
3. For each constituent: `budget = allocatable × targetWeight`.
4. Look up the instrument's price on the purchase date (forward-fill from `Price`).
5. `units = floor(budget / price)` — **whole units only, no fractional purchases**.
6. `cost = units × price`.
7. `residualCash = notionalCapital − Σ cost` (≥ the strategic reserve).
8. Value over time `V_t = Σ(units_i × price_{i,t}) + residualCash`.

**Comparison scaling** — on the `/models` dashboard the model's value series is rebased so
that `V_model(t0) == V_consolidated(t0)` at the start of the selected chart range
(`scale = V_consolidated(t0) / V_model(t0)`), so the curves are directly comparable
regardless of notional capital.

**Time-period validity (no delisted names)** — a model is _valid across the period_ only if
**every** constituent has price history that starts on/before the purchase date **and** is
still actively priced today (not stale). Delisted/acquired names (e.g. `NCM` — Newcrest,
delisted 2023) and too-recent listings fail this test. **System/default models are guaranteed
valid** by a seed-time guard (`models-P1e.md` Task 4); user models surface a warning. See
`getModelCoverage` in `models-P1a.md`.

**Keeping models current ("Update" button)** — the existing market-data **Update** flow
(`/api/v1/market/sync-prices` → `lib/services/price-sync.ts`) is extended to fetch **prices
and company info for every model constituent** (own + system models), over a lookback-aware
window that always covers the default 3-year (and longer) period. See `models-P1a.md` Task 5.

## Scope

### In scope

- New `ModelPortfolio` + `ModelConstituent` Prisma models (+ optional `ModelInstantiation` cache).
- Instantiation engine + model value/return time-series services (reusing `lib/services/analytics-data.ts` primitives).
- `/models` route group: list, detail, create, edit, **and a dashboard comparing the consolidated portfolio vs models** (scaled).
- Sidebar nav item **Models**.
- Optimisation integration: start from a real **or** model portfolio; **save optimal weights as a new model** (one per selected strategy).
- Backtesting integration: select any mix of real + model portfolios + a benchmark and compare.
- **Market-data "Update" extended** to fetch prices + info for all model constituents (own + system).
- **Time-period validity / no-delisted guard** — coverage service + seed-time validation.
- **Cross-feature integrations** (P1f): source picker across analytics, frontier model point, Black-Litterman prior, what-if auto-fill, Share Checker model mode, ETF X-ray look-through, model-comparison report, "rebalance to model" CGT estimate, dashboard vs-model card, and a new rebalancing/drift tool.
- Seed library of default models (Vanguard/Betashares diversified-ETF strategies + ASX10/20/50 equal- & market-weight direct-share models).

### Out of scope (deferred)

- Auto-rebalancing alerts / drift notifications against a target model (future).
- "One-click convert model → real portfolio" trade ticket generation (future).
- Tax-aware model transition / CGT impact of switching to a model (future — hooks noted).
- Model sharing between users (reuse `PortfolioShare` pattern later).

## Architecture

```
Frontend (/models, /analytics/optimize, /analytics/backtest)
  → Server Actions (lib/actions/model.ts)            # CRUD, save-from-optimiser
  → lib/services/model-portfolio.ts                  # instantiation engine
  → lib/services/model-analytics.ts                  # model value & returns series
       ↘ reuses lib/services/analytics-data.ts        # price loading, forward-fill
       ↘ reuses lib/services/analytics-client.ts      # calls Python for optimise/backtest
  → api/analytics/*.py                                # unchanged compute engine
```

Model portfolios are **weight-based**, not transaction-based — they do **not** create
`Holding`/`Transaction` rows. Instantiation is a pure computation over the `Price` table,
mirroring `getPortfolioTimeSeriesBetween()` but driven by `units` derived from weights.

## Data model (summary — full DDL in `models-P1a.md`)

```prisma
model ModelPortfolio {
  id             String  @id @default(cuid())
  userId         String?            // null ⇒ system/default model (visible to all users)
  name           String
  slug           String? @unique    // stable id for seeded defaults
  description    String?
  category       String             // conservative | moderately_conservative | balanced | growth | high_growth | high_yield | index
  provider       String?            // Vanguard | Betashares | ASX | Custom
  isSystem       Boolean @default(false)
  baseCurrency   String  @default("AUD")
  notionalCapital      Decimal @default(1000000) @db.Decimal(18, 2)
  minCashWeight        Decimal @default(0)       @db.Decimal(9, 6)
  defaultLookbackYears Int     @default(3)
  ...
  constituents   ModelConstituent[]
}

model ModelConstituent {
  id               String  @id @default(cuid())
  modelPortfolioId String
  instrumentId     String
  targetWeight     Decimal @db.Decimal(9, 6)   // 0..1
  ...
}
```

## Route map

| Route | Purpose |
| --- | --- |
| `/models` | Dashboard: consolidated portfolio vs models (scaled comparison) + model cards |
| `/models/new` | Create a model (name, category, notional, min cash, constituents + weights) |
| `/models/[id]` | Model detail: target weights, instantiation, value-over-time vs consolidated |
| `/models/[id]/edit` | Edit constituents / weights / settings |
| `/analytics/optimize` | (extended) source = real **or** model; "Save as model" for each strategy |
| `/analytics/backtest` | (extended) multi-select real + model portfolios + benchmark |

## Subphase breakdown

| Phase | Focus | Environment | File |
| --- | --- | --- | --- |
| **P1a** | Schema + data layer: Prisma models, validators, instantiation engine, model value/return services | Windows (coding) | `plan/models-P1a.md` |
| **P1b** | CRUD + navigation: server actions, sidebar item, list/detail/create/edit pages | Windows (coding) | `plan/models-P1b.md` |
| **P1c** | `/models` comparison dashboard: scaled consolidated-vs-models charts + cards | Windows (coding) | `plan/models-P1c.md` |
| **P1d** | Optimisation + Backtesting integration (save-as-model, multi-portfolio compare) | Windows (coding) | `plan/models-P1d.md` |
| **P1e** | Default model seed library (definitions + instrument bootstrap + seed script + validity guard) | Windows (coding) | `plan/models-P1e.md` |
| **P1f** | Cross-feature integrations (frontier, Black-Litterman, what-if, checker, X-ray, reports, tax, dashboard, rebalance) | Windows (coding) | `plan/models-P1f.md` |
| **P2** | **Codespaces:** package adds, `prisma migrate`, seed + price fetch + validity check, lint/typecheck/build/e2e | Codespaces (validation) | `plan/models-P2.md` |

> **Migrations & package installs run only in Codespaces (P2)** — the Windows coding phases
> author schema/source but never execute `pnpm add`, `prisma migrate`, or seed scripts.
> See `.github/copilot-instructions.md` (environment constraints) and `docs/KNOWLEDGE.md`.

## Key reuse points (verified in codebase)

| Need | Reuse |
| --- | --- |
| Sidebar nav | `components/layout/sidebar.tsx` — push to `navItems` array |
| Portfolio value over time | `getPortfolioTimeSeriesBetween()` in `lib/services/analytics-data.ts` |
| Returns matrix for optimise/backtest | `getPortfolioReturnsMatrix()` in `lib/services/analytics-data.ts` |
| Historical price on a date (forward-fill) | `Price` table + forward-fill loop in `analytics-data.ts` |
| Value-over-time chart | `components/charts/portfolio-area-chart.tsx` (`ValuePoint[]` + `SeriesMeta[]`) |
| Equity-curve / comparison chart | `components/charts/growth-chart.tsx` |
| Optimiser output (weights) | `api/analytics/optimize.py` via `lib/services/analytics-client.ts` |
| Backtest compare | `api/analytics/backtest.py` `POST /backtest/compare` |
| Benchmarks | `scripts/seed-benchmarks.ts`, `scripts/fetch-benchmark-prices.ts` |
| Market-data "Update" flow | `app/api/v1/market/sync-prices/route.ts` → `lib/services/price-sync.ts` (`syncSharePrices`/`syncBondPrices`/`syncStockInfo`); button `components/forms/fetch-prices-button.tsx` |
| Shared analytics matrix | `/api/v1/analytics/matrix` consumed by frontier/correlations/factors/stress/black-litterman clients |
| Server-action conventions | `lib/actions/holding.ts` (auth → ownership → zod → prisma → `revalidatePath`) |

## Enhancement opportunities (existing-feature scan)

A scan of current functionality identified where model portfolios add value. Implemented in
`models-P1d.md` (optimise/backtest) and `models-P1f.md` (the rest). "Effort" is relative.

| Feature | File(s) | How a model plugs in | Phase | Effort |
| --- | --- | --- | --- | --- |
| Optimiser | `analytics/optimize/*` | Start from a model; **save optimal weights as model(s)** | P1d | core |
| Backtest | `analytics/backtest/*` | Compare real + model portfolios + benchmark | P1d | core |
| Correlations | `analytics/correlations/*` | Correlation matrix of a model's constituents | P1f | low |
| Factor analysis | `analytics/factors/*` | Factor loadings of a model | P1f | low |
| Efficient frontier | `analytics/frontier/*` | Plot model as a point on the curve vs portfolio | P1f | low |
| Stress testing | `analytics/stress-test/*` | Apply a model's weights to shocks | P1f | low |
| Black-Litterman | `analytics/black-litterman/*` | Seed the equilibrium **prior** from a model | P1f | med |
| What-If | `analytics/what-if/*` | Auto-populate holdings from an instantiated model | P1f | low |
| Share Checker | `tools/checker/*`, `lib/services/share-checker.ts` | Validate a model (concentration + **time-period validity / delisted**) + health badge | P1f | med |
| ETF X-ray | `lib/services/etf-xray.ts` | Weighted look-through of a model's ETF constituents | P1f | med |
| Reports | `reports/*` | "Model vs portfolio" comparison report | P1f | med |
| Tax (unrealised CGT) | `tax/unrealised/*` | "Rebalance to model" CGT estimate | P1f | med |
| Dashboard | `dashboard/page.tsx` | "vs model" benchmark card | P1f | low |
| Rebalancing/drift | _(new)_ `tools/rebalance/` | Target (model) vs actual weights + buy/sell deltas | P1f | med |
| FIRE / Monte Carlo | `tools/fire/*`, `api/analytics/monte_carlo.py` | Use a model's return/vol assumptions as scenario inputs | (deferred) | med |

> Most analytics pages already fetch from the shared `/api/v1/analytics/matrix`; the
> `source=model` branch (P1d) + a reusable source picker (P1f Task 1) light up several at once.

## Acceptance criteria

- [ ] A user can create, edit and delete a model portfolio with weighted constituents.
- [ ] Default models are seeded and visible (read-only) to all users.
- [ ] A model can be instantiated for a configurable past date using **whole units**, with residual cash respecting the strategic minimum.
- [ ] `/models` shows the consolidated portfolio vs selected models on one chart, **scaled** to a common starting value.
- [ ] The optimiser can start from a model **or** real portfolio and **save** results as new model(s) — one per selected strategy.
- [ ] Backtesting can compare a mix of real + model portfolios against a benchmark.
- [ ] **System/default models contain no delisted names and are valid across the default 3-year period** (seed guard passes).
- [ ] The **Update** button refreshes prices **and** info for all model constituents (own + system) over a window covering the lookback.
- [ ] Adding a delisted/short-history constituent to a user model surfaces a clear validity warning.
- [ ] Model portfolios are usable as a source across frontier, correlations, factors, stress, Black-Litterman and what-if; a rebalancing/drift tool exists.
- [ ] All migrations, package installs and seeds execute cleanly in Codespaces; lint, typecheck and build pass.
