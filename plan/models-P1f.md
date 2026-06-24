# Model Portfolios — P1f: Cross-Feature Integrations

**Environment:** Windows (coding only — no execution).

## Objective

Surface model portfolios across the rest of the app. A scan of existing functionality shows
most analytics pages already route through the shared **returns-matrix** endpoint, so adding
a `source=model` branch (done in P1d) unlocks several features at once. This phase adds the
per-feature "source: Portfolio | Model" pickers and the higher-value bespoke integrations.

## Recommended skills

- **vercel-composition-patterns** — a single reusable `SourcePicker` shared by every analytics client.
- **vercel-react-best-practices** — memoised matrix fetches.

## Prerequisites

- P1a (`getModelReturnsMatrix`, `getModelCoverage`), P1c (`getModelValueSeries`, `series-metrics`),
  P1d (matrix route `source=model` branch, `createModelFromWeights`).
- Read each target client below + the shared matrix route.

---

## Task 1: Reusable source picker (one component, many pages)

Every analytics page that loads a returns matrix from
`/api/v1/analytics/matrix?portfolio=<id>` can instead accept a **model**. Build one shared
control and a small hook.

**File: `components/analytics/source-picker.tsx`** (new) — segmented `Portfolio | Model` +
dependent dropdown (`getModelsForUser` for models). Emits `{ source, id }`.

**File: `lib/hooks/use-analytics-matrix.ts`** (new) — builds the query string
(`?source=model&model=<id>` vs `?portfolio=<id>`) and fetches. The matrix route already
branches on `source` (P1d), returning the byte-compatible shape from `getModelReturnsMatrix`.

Wire the picker into these clients (each becomes "analyse a real **or** model portfolio"):

| Page | File | Effect |
| --- | --- | --- |
| Correlations | `app/(dashboard)/analytics/correlations/correlations-client.tsx` | Correlation matrix of a model's constituents (diversification check) |
| Factor analysis / PCA | `app/(dashboard)/analytics/factors/factors-client.tsx` | Factor loadings/exposures of a model |
| Efficient frontier | `app/(dashboard)/analytics/frontier/frontier-client.tsx` | Plot the model as a point on the frontier (Task 2) |
| Stress testing | `app/(dashboard)/analytics/stress-test/stress-client.tsx` | Apply a model's weights to historical/custom shocks |

> These are low-effort: the picker + shared route do the work; the Python endpoints are
> unchanged. Verify each client's existing matrix-fetch call site and swap in the hook.

---

## Task 2: Efficient frontier — plot model point(s)

`frontier.py` returns the efficient curve; the client overlays the current portfolio point.
Extend the client to also overlay **selected model(s)** as labelled points computed from each
model's `getModelReturnsMatrix` weights (expected return / risk). This visually answers "is
this model on/near the frontier vs my portfolio?"

- Add a "Compare models" multi-select to `frontier-client.tsx`.
- For each selected model, compute its (risk, return) from its returns + target weights
  (reuse `collapseToReturnSeries` from P1d) and plot as a distinct marker with a legend.

---

## Task 3: Black-Litterman — seed prior from a model

`bl-client.tsx` takes a market prior + user views. Add an option to **seed the equilibrium
prior from a model portfolio** (use the model's target weights as the "market" weights
instead of cap-weighted market). Pass the model weights through the existing
`/api/analytics/black-litterman` request body as the prior weights; document the field.

- UI: "Prior: Market | Model" toggle; when Model, pick a model and pass its weights.

---

## Task 4: What-If scenario — auto-populate from a model

`app/(dashboard)/analytics/what-if/page.tsx` takes manual holdings `{code, value, beta}` +
a market move %. Add **"Load from model"**: instantiate the chosen model (P1a) and pre-fill
the rows (code, value = instantiated cost, beta from `InstrumentInfo`). Saves manual entry
and lets users stress a model instantly.

---

## Task 5: Share Checker — validate a model

`lib/services/share-checker.ts` + `app/(dashboard)/tools/checker/page.tsx` run portfolio
health checks. Add a **model mode**: run the same concentration/diversification/data-quality
checks over a model's target weights, **plus** the model-specific
**time-period validity** check (`getModelCoverage`): flags delisted/stale constituents and
any with history shorter than the lookback. Surface a green/amber/red model "health" badge
reused on the `/models` cards and detail page.

---

## Task 6: ETF X-ray / look-through for models

`lib/services/etf-xray.ts` decomposes known ETFs (VAS, IOZ, STW, VGS, VDHG, …). For a model
whose constituents are ETFs, run X-ray over each constituent and **aggregate look-through
exposures weighted by target weight** → true underlying sector/region/stock exposure of the
model (e.g. how much CBA does `blend-balanced` really hold via VAS?).

- Add a "Look-through" tab on the model detail page that calls a new
  `getModelLookThrough(modelId)` helper composing `etf-xray.ts` per constituent.

---

## Task 7: Reports — model-vs-portfolio comparison report

`app/(dashboard)/reports/page.tsx` hosts ~10 reports. Add a **"Model Comparison"** report:
"how would your money have performed in model X vs your actual portfolio over the period?"
Reuses `getConsolidatedValueSeries` + `getModelValueSeries` + `series-metrics` (P1c) and the
scaling rule, rendered as a printable/exportable report consistent with the existing report
layout and export pipeline (`lib/export/`, `lib/reports/`).

---

## Task 8: Tax — "rebalance to model" CGT estimate

`app/(dashboard)/tax/unrealised/page.tsx` shows unrealised CGT. Add a **"Rebalance to model"**
scenario: given the user's current holdings and a chosen model's target weights, compute the
**sells required** to move from actual → target and estimate the **CGT impact** (reuse the
existing CGT calculators in `lib/calculations/`, honouring `saleAllocationMethod`, CGT
discount and the `cgtRegime` settings). Output: estimated taxable gain and net proceeds to
reinvest. (Trade-ticket generation stays out of scope — estimate only.)

---

## Task 9: Dashboard — "vs model" benchmark card

`app/(dashboard)/dashboard/page.tsx`: add a compact card overlaying the consolidated value
series against a **user-chosen default benchmark model** (e.g. `blend-balanced`), scaled to
the consolidated start value — a teaser linking to `/models`. Persist the chosen comparison
model in user/portfolio settings (small field or existing settings store).

---

## Task 10: New — Rebalancing / drift tool (target vs actual)

There is **no existing drift/rebalancing view**. Add `app/(dashboard)/tools/rebalance/`:
pick a real portfolio + a **target model**; show **target weight vs actual weight** per
holding, the **drift** (Δ), and the **buy/sell deltas** (in $ and units) to realign.
Optionally chain into Task 8 for the CGT cost of rebalancing. Reuse `instantiate`/weights
math and `components/charts/weight-comparison.tsx`.

---

## Deliverables (P1f)

- [ ] `components/analytics/source-picker.tsx` + `lib/hooks/use-analytics-matrix.ts`; wired into correlations, factors, frontier, stress clients.
- [ ] Frontier model-point overlay.
- [ ] Black-Litterman model-prior option.
- [ ] What-If "Load from model".
- [ ] Share Checker model mode (incl. time-period validity) + health badge.
- [ ] ETF X-ray look-through for models (`getModelLookThrough`).
- [ ] Reports "Model Comparison" report.
- [ ] Tax "Rebalance to model" CGT estimate.
- [ ] Dashboard "vs model" card.
- [ ] New Rebalancing/drift tool (`tools/rebalance`).

> **Scope note:** Tasks 1–5 and 9 are high-value/low-effort (shared picker + existing
> matrix route). Tasks 6–8 and 10 are larger; they can be split into a follow-up if needed,
> but are specified here so the integration surface is complete.

## Commit

```
feat(models): cross-feature integrations (frontier/BL/what-if/checker/xray/reports/tax/rebalance)
```
