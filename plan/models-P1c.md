# Model Portfolios — P1c: `/models` Comparison Dashboard

**Environment:** Windows (coding only — no execution).

## Objective

Build the `/models` dashboard: a dashboard-style page that compares the user's **current
consolidated portfolio** against one or more **model portfolios** over a selectable time
range, with the model series **scaled** to a common starting value so the curves are
directly comparable.

## Recommended skills

- **vercel-react-best-practices** — chart performance, memoised series assembly.
- **vercel-composition-patterns** — model multi-select + range control composition.

## Prerequisites

- P1a (`getModelValueSeries`) and P1b (list page shell, `model-card.tsx`) complete.
- Read how the existing dashboard assembles consolidated value series
  (`lib/services/analytics-data.ts` → `getPortfolioTimeSeriesBetween`, and the consolidated
  aggregation used by `lib/services/portfolio-cards.ts`).

---

## Task 1: Consolidated value series helper

**File: `lib/services/model-analytics.ts`** — add a helper that returns the **consolidated**
(all user portfolios summed) daily value series over a range, reusing existing primitives.

```typescript
/** Sum every user portfolio into a single consolidated daily value series. */
export async function getConsolidatedValueSeries(
  userId: string,
  range: "1Y" | "3Y" | "5Y" | "10Y" | "MAX",
): Promise<ValuePoint[]> {
  const portfolios = await db.portfolio.findMany({ where: { userId }, select: { id: true } });
  // For each portfolio reuse getPortfolioTimeSeriesBetween(), then sum Totals by date.
  // Return ValuePoint[] with { date, Total }.
  return [];
}
```

---

## Task 2: Scaling utility

**File: `lib/services/model-compare.ts`** (new) — produce a single chart dataset combining
the consolidated series with each selected model, **rebased** so every series starts at the
consolidated value at `t0`.

```typescript
import type { ValuePoint } from "@/components/charts/portfolio-chart-utils";

export interface CompareSeries {
  key: string;       // "Consolidated" | model name
  modelId?: string;
  colorVar: string;
}

export interface CompareDataset {
  series: CompareSeries[];
  // [{ date, Consolidated: number, "Vanguard Balanced": number, ... }]
  points: Array<Record<string, string | number>>;
  baseValue: number; // consolidated value at t0 (the common start)
}

/**
 * Align all series on the consolidated date grid and scale each model so that
 * model(t0) == consolidated(t0). scale = consolidated[t0] / model[t0].
 */
export function buildComparison(
  consolidated: ValuePoint[],
  models: Array<{ id: string; name: string; valueSeries: ValuePoint[] }>,
): CompareDataset {
  if (consolidated.length === 0) return { series: [], points: [], baseValue: 0 };
  const dates = consolidated.map((p) => p.date);
  const baseValue = Number(consolidated[0].Total);

  // Index each model by date for O(1) alignment; forward-fill gaps.
  const modelMaps = models.map((m) => {
    const map = new Map(m.valueSeries.map((p) => [p.date, Number(p.Total)]));
    const firstOnGrid = firstNonNull(dates, map); // model value at consolidated t0
    const scale = firstOnGrid ? baseValue / firstOnGrid : 1;
    return { ...m, map, scale };
  });

  const points = dates.map((date, i) => {
    const row: Record<string, string | number> = { date, Consolidated: Number(consolidated[i].Total) };
    for (const m of modelMaps) {
      const raw = lookupForwardFilled(m.map, dates, i);
      row[m.name] = raw == null ? row[m.name] : raw * m.scale;
    }
    return row;
  });

  const series: CompareSeries[] = [
    { key: "Consolidated", colorVar: "var(--chart-1)" },
    ...models.map((m, idx) => ({ key: m.name, modelId: m.id, colorVar: `var(--chart-${(idx % 5) + 2})` })),
  ];
  return { series, points, baseValue };
}

// firstNonNull / lookupForwardFilled: small helpers mirroring analytics-data.ts forward-fill.
```

> **Scaling rule (from `models-overview.md`):** `scale = V_consolidated(t0) / V_model(t0)`,
> where `t0` is the first date of the selected range. Each model is multiplied by its own
> scale so all lines start at the consolidated value — differences thereafter are pure
> relative performance.

---

## Task 3: `/models` page

**File: `app/(dashboard)/models/page.tsx`** (extend the P1b shell).

Server component:

```tsx
import { getModelsForUser } from "@/lib/services/model-list";
import { getConsolidatedValueSeries, getModelValueSeries } from "@/lib/services/model-analytics";
import { buildComparison } from "@/lib/services/model-compare";

export default async function ModelsPage({ searchParams }: { searchParams: Promise<{ range?: string; compare?: string }> }) {
  const session = await auth();
  // 1. models = getModelsForUser(userId)
  // 2. range = (searchParams.range as Range) ?? "3Y"
  // 3. selected = compare ids (default: a small curated set, e.g. one per category, or none)
  // 4. consolidated = getConsolidatedValueSeries(userId, range)
  // 5. for each selected: getModelValueSeries(id, { from: rangeStart })
  // 6. dataset = buildComparison(consolidated, selectedSeries)
  return <ModelsClient models={models} dataset={dataset} range={range} selectedIds={selected} />;
}
```

**File: `app/(dashboard)/models/models-client.tsx`** — client component:

- **Range selector** (`1Y | 3Y | 5Y | 10Y | MAX`) — updates `?range=` (same UX as analytics pages).
- **Model multi-select** — chips/checkboxes to add/remove models from the comparison
  (updates `?compare=id1,id2`). Default selection: none, or a curated trio
  (Conservative / Balanced / High Growth) for an immediate "wow".
- **Comparison chart** — a multi-line growth chart fed by `dataset.points` + `dataset.series`.
  Reuse `components/charts/growth-chart.tsx` (equity-curve style) or
  `components/charts/portfolio-performance-chart.tsx`; pass a `ValuePoint`-like dataset with
  one column per series. Tooltip shows each series' value + Δ% vs Consolidated.
- **Summary stat cards** per selected series: total return over range, CAGR, max drawdown,
  volatility (compute client-side from the scaled series, or via a tiny helper).
- **Model cards grid** below the chart — `model-card.tsx` (name, category badge, top
  holdings, constituent count, "Add to comparison", "View", "Backtest", "Optimise").

> Empty consolidated portfolio (new user with no holdings) → show models only, hide the
> "vs consolidated" overlay, and prompt to import a portfolio.

---

## Task 4: Comparison metrics helper

**File: `lib/calculations/series-metrics.ts`** (new, or extend an existing metrics util) —
pure functions over a numeric series: `totalReturn`, `cagr`, `maxDrawdown`,
`annualisedVol`. Used by the dashboard stat cards (and reusable elsewhere).

```typescript
export function totalReturn(values: number[]): number;     // v[last]/v[0] - 1
export function cagr(values: number[], years: number): number;
export function maxDrawdown(values: number[]): number;     // most negative peak-to-trough
export function annualisedVol(values: number[], periodsPerYear = 252): number;
```

---

## Deliverables (P1c)

- [ ] `getConsolidatedValueSeries()` in `lib/services/model-analytics.ts`.
- [ ] `lib/services/model-compare.ts` (`buildComparison` + scaling).
- [ ] `lib/calculations/series-metrics.ts`.
- [ ] `/models` dashboard: range selector, model multi-select, scaled comparison chart, stat cards, model cards grid.

## Commit

```
feat(models): /models comparison dashboard with scaled consolidated-vs-model charts
```
