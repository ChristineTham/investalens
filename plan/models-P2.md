# Model Portfolios — P2: Codespaces Validation

**Environment:** GitHub Codespaces (Ubuntu, Node 22, Python 3.12). This is the **only** phase
that executes commands — package installs, the database migration, seeding, price fetches,
lint/typecheck/build and e2e all run here.

## Objective

Bring the model-portfolios code authored in P1a–P1e to a working, validated state: apply the
schema migration, install any new packages, seed the default model library, fetch prices,
and verify the full feature end-to-end.

## Prerequisites

- P1a–P1e complete (schema, services, UI, integrations, seed + price scripts authored).
- P1f complete (cross-feature integrations: source picker, frontier/BL/what-if/checker/X-ray/reports/tax/dashboard/rebalance).
- Codespace running; `.env` / `DATABASE_URL` present; R1 + R2 already validated.
- Reference: `docs/KNOWLEDGE.md` (verified install commands), `.github/copilot-instructions.md`.

> **Implementation deltas to validate** (authored in P1a–P1f, differ from original assumptions):
> - **New shared route created:** `app/api/v1/analytics/matrix/route.ts` did **not** exist
>   before — every analytics client referenced it but it was missing. It now branches on
>   `?source=portfolio` (default), `?source=model&model=<id>`, and `?source=benchmark&code=<code>`.
>   All analytics surfaces depend on it.
> - **Extra schema field:** besides the three model tables, the P1f review added a nullable
>   `User.dashboardModelId` for the dashboard "vs model" card preference (no FK — a deleted
>   model just falls back). The migration captures it alongside the model tables.
> - **Model returns matrix:** `getModelReturnsMatrix` returns `weights` as a `number[]` aligned
>   to `assets` (byte-compatible with `getPortfolioReturnsMatrix`) so the Python layer
>   (`stress_test.py` does `np.array(weights)`) works for a model source unchanged.
> - **Backtest compare:** `POST /api/analytics/backtest/portfolios` was added to
>   `api/analytics/backtest.py`; the TS-side collapse helper lives in
>   `lib/calculations/returns-matrix.ts` (`collapseToReturnSeries`), not in `model-analytics.ts`.
> - **New npm scripts:** `seed:models`, `fetch:model-prices`, `validate:models`.
> - **`validate:models`** inlines the coverage check (does not import the `server-only`
>   `getModelCoverage`) because a plain `tsx` script throws on `server-only` imports.
---

## Step 1: Package additions

This feature is designed to reuse existing infrastructure — **no new runtime packages are
expected**. Confirm before adding anything:

```bash
# Verify nothing new is required; both should already be present.
pnpm ls tsx zod
```

- If `tsx` is missing (needed by the seed/price scripts), add it: `pnpm add -D tsx`
  (verify against `docs/KNOWLEDGE.md` first — do not assume). It is **already used** by the
  existing `db:cpi` / `verify:cgt2027` scripts, so it should already be present.
- The P1e scripts are wired in `package.json`: `seed:models`, `fetch:model-prices`,
  `validate:models` (all `tsx scripts/*.ts`).
- **No new Python packages** — the optimiser/backtester reuse the existing skfolio engine.
- Record any package actually added (and why) in `docs/KNOWLEDGE.md`.

---

## Step 2: Database migration

```bash
# Generate + apply the migration for ModelPortfolio / ModelConstituent /
# ModelInstantiation, the User/Instrument back-relations, AND the new nullable
# User.dashboardModelId field (dashboard vs-model card preference).
pnpm prisma migrate dev --name add_model_portfolios

# Regenerate the client (output ../generated/prisma).
pnpm prisma generate
```

Verify the new tables, the `User.dashboardModelId` column, and relations:

```bash
pnpm prisma validate
pnpm prisma studio   # optional: confirm ModelPortfolio/ModelConstituent/ModelInstantiation exist
```

> If migration fails on the `Instrument`/`User` back-relations (`modelConstituents`,
> `modelPortfolios`) or the `User.dashboardModelId` field, confirm those were added in
> P1a/P1f and re-run. The migration must be committed to `prisma/migrations/`.

---

## Step 3: Seed the default model library

```bash
# 1. Upsert system models + their instruments (idempotent by slug).
pnpm seed:models

# 2. Fetch ~10y daily prices for every model constituent (incremental).
pnpm fetch:model-prices

# 3. Validate: no delisted names, every system model valid across its lookback period.
#    Non-zero exit ⇒ fix definitions (replace delisted ticker) and re-run.
pnpm validate:models
```

Verification queries (psql or Prisma Studio):

```sql
SELECT category, count(*) FROM "ModelPortfolio" WHERE "isSystem" = true GROUP BY category;
-- Expect rows for conservative, moderately_conservative, balanced, growth, high_growth, high_yield, index.

SELECT m.slug, count(c.*) AS holdings
FROM "ModelPortfolio" m JOIN "ModelConstituent" c ON c."modelPortfolioId" = m.id
GROUP BY m.slug ORDER BY m.slug;
```

> **Verify tickers/membership now (documentation-first):** confirm `VDCO/VDBA/VDGR/VDHG`,
> `DHHF`, `VAS/VGS/VGE/VAF/GOLD`, `VHY/IHD/RDV`, and the ASX 20/50 constituents are current.
> Substitute any delisted/renamed tickers (e.g. `NCM`). Update `lib/constants/default-models.ts`
> and `docs/KNOWLEDGE.md`, then re-run `pnpm seed:models`.

Check price coverage (instantiation needs ≥ 3y history):

```sql
SELECT i.code, min(p.date) AS first_price, max(p.date) AS last_price, count(*) AS days
FROM "Instrument" i JOIN "Price" p ON p."instrumentId" = i.id
WHERE i.id IN (SELECT DISTINCT "instrumentId" FROM "ModelConstituent")
GROUP BY i.code ORDER BY first_price DESC;
```

Any ticker missing ≥ 3 years of history → re-run `fetch:model-prices`, or flag it (its
holding will roll into residual cash on instantiation, which the UI surfaces).

> **Delisted-name gate:** `pnpm validate:models` must exit 0. If it reports a delisted/stale
> constituent (e.g. `NCM`), replace it in `lib/constants/default-models.ts` with the current
> index member, re-run `seed:models` → `fetch:model-prices` → `validate:models`.

---

## Step 4: Static checks

```bash
pnpm lint
pnpm typecheck      # no `typecheck` script in package.json — use `pnpm tsc --noEmit`
pnpm build
```

Fix any issues. Watch for:

- Prisma `Decimal` → `number` conversions in services (use `Number(...)`).
- `server-only` imports not leaking into client components (and not imported by `tsx`
  scripts — `validate:models` deliberately inlines coverage for this reason).
- New `lucide-react` `Target` icon import in `sidebar.tsx` resolves.
- `.venv/**` remains in eslint `globalIgnores` (see repo gotchas).
- After `prisma generate`, the new `User.dashboardModelId` field and the three model
  delegates (`db.modelPortfolio` / `db.modelConstituent` / `db.modelInstantiation`) type-check.
- Pre-existing jsx-a11y diagnostics in `bl-client.tsx` (unlabeled tau/risk inputs and the
  view editor selects/inputs) are **not** regressions and are not gated by `next build`; do
  not churn unrelated code to silence them.

---

## Step 5: Functional verification

Run the dev server and exercise each surface:

```bash
pnpm dev
```

Checklist:

- [ ] **Sidebar** shows **Models**; `/models` loads.
- [ ] **Default models** appear (read-only), grouped/badged by category.
- [ ] **Create** a custom model (constituents + weights); weights-sum-to-100 guard works; it saves and appears.
- [ ] **Edit** the custom model; **system models are read-only** (offer Duplicate).
- [ ] **Duplicate** a system model into an editable copy.
- [ ] **Detail page**: target-weight chart, **instantiation table** (whole units, residual cash respects `minCashWeight`), value-over-time chart. Change as-of date / notional and re-instantiate.
- [ ] **/models dashboard**: select several models; comparison chart shows them **scaled to the consolidated start value**; range selector works; stat cards compute.
- [ ] **Optimise**: choose source = model; run multiple strategies; **Save as model** / **Save all** creates new model(s) visible in `/models`.
- [ ] **Backtest**: multi-select a mix of real + model portfolios + a benchmark; equity curves + metrics table render; deep links `?model=` / `?portfolio=` prefill.
- [ ] **Update button** (`components/forms/fetch-prices-button.tsx`): clicking **Update** streams progress that now includes model constituents; afterwards `Price` and `InstrumentInfo` rows exist for every model ticker over the lookback window.
- [ ] **Shared matrix route**: `GET /api/v1/analytics/matrix?source=model&model=<id>&range=3Y`,
      `?portfolio=<id>`, and `?source=benchmark&code=^AXJO` each return
      `{ dates, assets, returns, weights, prices }` (weights as a `number[]`).
- [ ] **Cross-feature (P1f)**: source picker (`components/analytics/source-picker.tsx`) works on
      optimise, backtest, correlations, factors, frontier (model point overlay) and stress;
      Black-Litterman **model prior** toggle; what-if **"Load from model"**; Share Checker
      **model mode** + green/amber/red **health badge** (also shown on the model detail page);
      ETF X-ray **look-through** on the detail page; **"Model Comparison"** report
      (`/reports/model-comparison`); tax **"rebalance to model"** estimate on `/tax/unrealised`;
      dashboard **vs-model card** with a model picker that **persists** to `User.dashboardModelId`;
      new **drift tool** at `/tools/rebalance` (target vs actual weights + buy/sell deltas).

---

## Step 6: End-to-end tests

Add Playwright specs under `e2e/` (mirror `e2e/example.spec.ts`). **These are not yet
authored** — create them in this phase:

- `e2e/models-crud.spec.ts` — create → view detail → edit → delete a model.
- `e2e/models-compare.spec.ts` — `/models` comparison renders with a seeded model + a fixture portfolio.
- `e2e/models-optimise-save.spec.ts` — run optimiser from a model and save result as a new model.

```bash
pnpm playwright test e2e/models-crud.spec.ts e2e/models-compare.spec.ts e2e/models-optimise-save.spec.ts
```

---

## Step 7: Vercel deploy smoke (backtest endpoint)

P1d **added** `POST /api/analytics/backtest/portfolios` to `api/analytics/backtest.py`, so the
Python service must be redeployed and smoke-tested:

```bash
npx vercel --yes
curl -s https://<preview-url>/api/analytics/backtest/portfolios \
  -X POST -H "Content-Type: application/json" \
  -H "x-vercel-protection-bypass: <token>" \
  -d '{"series":[{"label":"A","dates":["2023-01-02","2023-01-03"],"returns":[0,0.01]}],"benchmark":null}' | jq .
```

---

## Step 8: Update docs & memory

- [ ] `docs/KNOWLEDGE.md` — any package added, verified tickers/index membership, gotchas.
- [ ] `docs/ARCHITECTURE.md` — note model-portfolio data model + reuse of analytics engine,
      and that the shared `/api/v1/analytics/matrix` route was introduced (previously missing).
- [ ] `plan/README.md` — mark Model Portfolios phases complete.
- [ ] Repo memory (`/memories/repo/`) — record the migration name and seed/price commands.
      (Several model facts are already captured there: the missing-then-created matrix route,
      the `number[]` weights shape, `User.dashboardModelId`, and the `server-only`/`tsx` gotcha.)

## Deliverables (P2)

- [ ] Migration applied + committed; client regenerated.
- [ ] Default models + prices seeded and verified.
- [ ] Lint, typecheck, build green.
- [ ] Functional checklist + e2e specs passing.
- [ ] Docs/memory updated.

## Commit

```
chore(models): migrate, seed default models + prices, validate end-to-end
```
