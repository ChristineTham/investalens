# Model Portfolios — P1d: Optimisation & Backtesting Integration

**Environment:** Windows (coding only — no execution).

## Objective

Wire model portfolios into the two existing analytics surfaces:

1. **Optimisation** — start from a real **or** model portfolio, run one or more strategies,
   and **save the optimal weights as new model portfolio(s)** (one per selected strategy).
2. **Backtesting** — select any mix of real + model portfolios (plus a benchmark) and
   compare them against each other.

No changes to the Python compute layer are required — models reuse the
`getModelReturnsMatrix()` adapter from P1a so they look identical to real portfolios.

## Recommended skills

- **vercel-react-best-practices** — multi-select + results table performance.
- **runtime-cache** — cache compare/optimise results keyed by inputs.

## Prerequisites

- P1a (`getModelReturnsMatrix`), P1b (`createModel`, `model.ts` actions).
- Read `app/(dashboard)/analytics/optimize/*` and `app/(dashboard)/analytics/backtest/*`,
  plus `lib/services/analytics-client.ts` and `lib/services/analytics-data.ts`
  (`getPortfolioReturnsMatrix`).

---

## Part A — Optimisation integration

### Task A1: Source selector (real or model)

**File: `app/(dashboard)/analytics/optimize/optimize-client.tsx`** — replace the single
portfolio dropdown with a **source picker**: a segmented control `Portfolio | Model`, then a
dependent dropdown listing either the user's portfolios or `getModelsForUser()` results.

The matrix fetch becomes source-aware:

```typescript
// Existing: GET /api/v1/analytics/matrix?portfolio=<id>&range=<r>
// New: support source=model
const qs = source === "model"
  ? `?source=model&model=${selectedId}&range=${range}`
  : `?portfolio=${selectedId}&range=${range}`;
const matrix = await fetch(`/api/v1/analytics/matrix${qs}`).then((r) => r.json());
```

**File: `app/(dashboard)/api/v1/analytics/matrix/route.ts`** (or wherever the matrix route
lives — confirm path) — branch on `source`:

```typescript
if (searchParams.get("source") === "model") {
  const { getModelReturnsMatrix } = await import("@/lib/services/model-analytics");
  return Response.json(await getModelReturnsMatrix(searchParams.get("model")!, range));
}
// else existing getPortfolioReturnsMatrix(portfolioId, range)
```

Because `getModelReturnsMatrix()` returns the same shape, the optimiser request body and the
Python endpoints are untouched.

### Task A2: Multi-strategy run

Allow selecting **multiple** strategies/objectives at once (checkboxes):
`max_sharpe`, `min_risk`, `risk_parity (HRP)`, `risk_budgeting`. Fire the corresponding
existing endpoints (`/api/analytics/optimize`, `/optimize/hrp`, `/optimize/risk-parity`) in
parallel and render a results table — one column per strategy: weights, expected return,
risk, Sharpe, CVaR, max drawdown. Reuse `components/charts/weight-comparison.tsx`.

### Task A3: Save optimal weights as model(s)

**File: `lib/actions/model.ts`** — add `createModelFromWeights`.

```typescript
export async function createModelFromWeights(input: {
  name: string;
  description?: string;
  category?: string;
  baseCurrency?: string;
  notionalCapital?: number;
  minCashWeight?: number;
  // weights keyed by instrument code (as returned by the optimiser, e.g. "VAS.AX")
  weights: Record<string, number>;
  // resolve codes → instruments; codes already exist (came from source portfolio/model)
  market?: string;
  sourceLabel?: string; // "Optimised: max_sharpe from Balanced"
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Drop ~0 weights, renormalise to sum 1 (optimiser may leave a tiny residual).
  const entries = Object.entries(input.weights).filter(([, w]) => w > 1e-6);
  const total = entries.reduce((a, [, w]) => a + w, 0);
  const constituents = await Promise.all(
    entries.map(async ([code, w]) => {
      const [c, market] = code.includes(".") ? [code, input.market ?? "ASX"] : [code, input.market ?? "ASX"];
      const instrument = await db.instrument.upsert({
        where: { code_marketCode: { code: c, marketCode: market } },
        create: { code: c, marketCode: market, name: c, currency: "AUD" },
        update: {},
      });
      return { instrumentId: instrument.id, targetWeight: w / total };
    }),
  );

  const model = await db.modelPortfolio.create({
    data: {
      userId: session.user.id,
      name: input.name,
      description: input.description ?? input.sourceLabel,
      category: input.category ?? "growth",
      provider: "Custom",
      baseCurrency: input.baseCurrency ?? "AUD",
      notionalCapital: input.notionalCapital ?? 1_000_000,
      minCashWeight: input.minCashWeight ?? 0,
      constituents: { create: constituents },
    },
  });
  revalidatePath("/models");
  return model;
}
```

**UI:** after a multi-strategy run, each strategy column gets a **"Save as model"** button;
a **"Save all"** action writes one model per selected strategy (names like
`"{source} — Max Sharpe"`). On success, toast with a link to `/models/[id]`.

> Codes in the optimiser output come straight from the source matrix columns, so they
> already match existing instruments — `upsert` is just a safety net.

---

## Part B — Backtesting integration

### Task B1: Multi-portfolio selection

**File: `app/(dashboard)/analytics/backtest/backtest-client.tsx`** — replace the single
portfolio input with a **multi-select** that can mix:

- Real portfolios (`getPortfoliosForUser`)
- Model portfolios (`getModelsForUser`)
- A benchmark code (existing input, e.g. `^AXJO`)

Each selected item is tagged with its `source` (`portfolio | model | benchmark`).

### Task B2: Build a returns matrix per selection and compare

The existing `POST /api/analytics/backtest/compare` compares strategies over **one** asset
matrix. For comparing **whole portfolios** against each other we instead compute each
selection's **portfolio return series** and compare equity curves. Two implementation
options — pick the simpler that fits the current compare endpoint:

**Option 1 (preferred — reuse `/backtest/compare`):** For each selection, fetch its returns
matrix (`getPortfolioReturnsMatrix` or `getModelReturnsMatrix`) and pre-collapse it to a
single weighted return series using its current/target weights; send the set of series to a
thin new endpoint `POST /api/analytics/backtest/portfolios` that aligns dates, rebases each
to 100, and returns equity curves + metrics (CAGR, vol, Sharpe, max DD, Sortino, Calmar)
per series, plus the benchmark.

**File: `api/analytics/backtest.py`** — add a `@app.post("/api/analytics/backtest/portfolios")`
handler:

```python
@app.post("/api/analytics/backtest/portfolios")
async def backtest_portfolios(request: Request):
    data = await request.json()
    # data = { "series": [{ "label": "Balanced (model)", "dates": [...], "returns": [...] }, ...],
    #          "benchmark": { "label": "ASX200", "dates": [...], "returns": [...] } }
    # 1. Align all on the intersection of dates.
    # 2. Rebase each cumulative return to 100.
    # 3. Per series: annualizedReturn, annualizedVolatility, sharpeRatio,
    #    maxDrawdown, calmarRatio, sortinoRatio (reuse skfolio Portfolio or numpy).
    # 4. Return { equityCurves: {label: [...]}, dates: [...], metrics: {label: {...}} }
    ...
```

**File: `lib/services/model-analytics.ts`** / `lib/services/analytics-data.ts` — add a
`collapseToReturnSeries(matrix, weights)` helper that produces the weighted daily return
series from a returns matrix (shared by both real and model selections).

### Task B3: Results UI

Render a single comparison view:

- **Equity-curve chart** (`components/charts/growth-chart.tsx`) — one line per portfolio +
  benchmark, all rebased to 100.
- **Metrics table** — rows = selections, columns = CAGR / Vol / Sharpe / Max DD / Calmar / Sortino.
- **Drawdown chart** for the selected/highlighted series.
- Preset **date range** (`1Y | 3Y | 5Y | 10Y | MAX`) like the existing backtest page.

### Task B4: Deep links

Honour `?model=<id>` (from the model detail "Backtest" button) and `?portfolio=<id>` to
pre-populate the selection.

---

## Deliverables (P1d)

- [ ] Optimise: source picker (portfolio|model), matrix route `source=model` branch, multi-strategy run.
- [ ] `createModelFromWeights` action + "Save as model"/"Save all" UI.
- [ ] Backtest: multi-select of real + model portfolios + benchmark.
- [ ] `POST /api/analytics/backtest/portfolios` + `collapseToReturnSeries` helper.
- [ ] Comparison results UI (equity curves, metrics table, drawdown).
- [ ] Deep links `?model=` / `?portfolio=`.

## Commit

```
feat(models): optimiser save-as-model + multi-portfolio backtest comparison
```
