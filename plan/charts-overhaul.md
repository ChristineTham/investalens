# Charts Overhaul — Implementation Plan

Covers the 8 requested items: Recharts research + doc updates, chart refactors
(nested pies, radar/radial/sunburst), charts for every page, a consistent
responsive grid, a **universal** timescale selector, code reuse, and
responsive + zoomable charts everywhere.

**Environment:** Windows (coding only — no build/test). Lint/build run in
Codespaces. Validate each touched file with `get_errors`.

---

## Existing foundation (reuse, don't rebuild)

- **`ChartCard`** ([components/charts/chart-card.tsx](../components/charts/chart-card.tsx)) — already wraps a chart with a title, optional `actions`, and a **maximise → Dialog modal** (zoom, req 8). Children is a render-prop `(height) => ReactNode` so inline vs expanded heights differ. → Make this the universal wrapper for every chart.
- **`RangeSelector`** + **`chart-ranges.ts`** — button group + `ChartRange` union + `resolveChartRange()`. Range state is currently **local `useState` per page** (dashboard, portfolio perf chart) → replace with a global store (req 5).
- **`chart-colors.ts`** — `holdingColor(i)`, `MUTED_COLOR`, `roselySwatchClass`, `ALL_ROSELY_SWATCHES` (Tailwind safelist). Dynamic `bg-[var(--roselyN)]`/`fill` use CSS vars; ESLint bans inline `style`. Reuse for all new charts.
- **Data services** already compute everything new charts need: `getPortfolioDetail` (holdings + `sectorAllocation` + `returns`), `getPortfolioTimeSeries`, `getPortfolioReturnsMatrix`, report generators (`generateDiversityReport`, `generateMultiPeriodReport`, `generateCgtReport`, …), `getMarketSentiment`, `computeDrift`.

---

## Phase 0 — Recharts research + docs (req 1)

- Update **KNOWLEDGE.md** Recharts section: v3.x notes, the full chart-type catalogue (Line/Area/Bar/Composed/Scatter/Pie/**two-level Pie**/**Radar**/**RadialBar**/Treemap/**Sunburst**/Funnel), `ResponsiveContainer` rule, accessibility (`accessibilityLayer`), and our wrapper conventions.
- Update **DESIGN.md**: new "Data Visualisation" section — Rosely chart palette usage, ChartCard + zoom convention, universal timescale, responsive grid, when to use each chart type.

## Phase 1 — Universal timescale (req 5)

- **`lib/stores/chart-range.ts`** — zustand v5 store with `persist` (localStorage key `il-chart-range`): `{ range: ChartRange; setRange }`. SSR-safe (skipHydration or guarded).
- **`RangeSelector`** — keep controlled API, add an optional `global` mode hook `useChartRange()` so any page binds to the shared range with zero plumbing.
- Wire **DashboardCharts** and **PortfolioPerformanceChart** (and new pages) to the global range. Selecting a range on any page persists and applies everywhere.

## Phase 2 — Reusable chart infrastructure (req 6, 7, 8)

- **`components/charts/chart-grid.tsx`** — `<ChartGrid>` standard responsive grid (`grid gap-4 lg:grid-cols-2`, items stretch) + `<ChartGridItem span>` for full-width charts. One consistent grid for every page (req 4).
- **`components/charts/nested-allocation-pie.tsx`** — two-level pie: inner ring = sector, outer ring = holdings (req 2). Reuses `HoldingTooltipCard` + sector colours.
- **`components/charts/radar-chart.tsx`** — generic `RadarChart` wrapper (e.g. factor exposure, diversification score, risk profile) (req 7).
- **`components/charts/radial-bar.tsx`** — generic `RadialBarChart` wrapper (e.g. allocation %, goal/FIRE progress, fear-greed gauge) (req 7).
- Make **`AllocationPie`** use `ResponsiveContainer` consistently; ensure every chart is responsive.

## Phase 3 — Pages: grid + ChartCard + new charts (req 2, 3, 4, 8)

For every page below: wrap charts in `ChartCard` (→ zoom), lay out with `ChartGrid`, and add the noted new chart. Bind any time-scaled chart to the global range.

- **/reports/diversity** → swap flat pie for `NestedAllocationPie`; keep group-by.
- **/reports/multi-period** → add a `RadarChart` of period returns alongside the bar.
- **/reports/performance, /contribution, /drawdown** → wrap in ChartCard + ChartGrid.
- **/tax/cgt** → add charts: short/long/loss split (bar) + gain-by-holding (bar); `RadialBar` for discount-eligible proportion.
- **/tax/taxable-income** → income-composition pie (dividends/franking/interest/foreign) + monthly income bar.
- **/tax/unrealised** → unrealised gain/loss by holding bar + embedded-tax `RadialBar`.
- **/analytics/risk** → ensure all charts in ChartCard/ChartGrid; add a risk-profile `RadarChart` (vol, Sharpe, Sortino, beta, max DD, alpha normalised).
- **/analytics** sub-pages (optimize/frontier/monte-carlo/what-if) → ChartCard + ChartGrid wrapping.
- **/tools/sentiment** → fear-greed `RadialBar` gauge + sector-performance bar.
- **/tools/rebalance** → drift bar (current vs target) already; wrap + add radial drift.

## Phase 4 — Validation

- `get_errors` on every touched file. Note Codespaces follow-up: `pnpm lint` + `pnpm build`.

---

## Out of scope / notes

- Sunburst: Recharts `Sunburst` is newer/limited; prefer the two-level Pie for nested allocation. Document Sunburst as an option in KNOWLEDGE.
- Treemap keeps its HSL hue scheme (separate concern).
- Heavy page-by-page application is large; execute foundation first, then pages incrementally, validating each.

---

## Status

**Done & validated (`get_errors` clean):**

- **Phase 0 — docs:** KNOWLEDGE.md Recharts section (3.x chart-type catalogue, nested-pie/radar/radial/sunburst notes, conventions); DESIGN.md new "§6a Data Visualisation".
- **Phase 1 — universal timescale:** `lib/stores/chart-range.ts` (zustand + persist, SSR-safe `useChartRange`), `GlobalRangeSelector`, wired `DashboardCharts` + `PortfolioPerformanceChart` to the shared range.
- **Phase 2 — reusable infra:** `chart-grid.tsx` (`ChartGrid`/`ChartGridItem`), `nested-allocation-pie.tsx` (two-level sector→holding pie), `metric-radar-chart.tsx` (`MetricRadarChart`), `radial-bar.tsx` (`RadialGauge`/`RadialBars`).
- **Phase 3 — full page rollout (complete):**
  - Portfolio detail → `NestedAllocationPie` (req 2).
  - Reports: diversity, multi-period, contribution, drawdown, performance → charts wrapped in `ChartCard` (zoom) with an added `height` prop on each chart component so the modal enlarges.
  - Tax: `/tax/cgt` + `/tax/unrealised` `CgtCompositionChart`; `/tax/unrealised` assessable-proportion `RadialGauge`; `/tax/taxable-income` income-composition pie.
  - Analytics: `/analytics/risk` risk-profile `MetricRadarChart`; monte-carlo, frontier, optimize, tactical, stress-test charts wrapped in `ChartCard` (+ `height` props).
  - Tools: `/tools/sentiment` fear-greed `RadialGauge`; `/tools/rebalance` weights `ChartCard` + rebalance-turnover `RadialGauge`.
  - A11y: added missing `aria-label`s to selects in the risk and tactical clients.

**Codespaces follow-up:** `pnpm lint` + `pnpm build`.

**Optional future polish:** convert the sentiment sector heatmap to a bar chart; add a monthly-income bar to `/tax/taxable-income`; bind the analytics `DateRangeSelector` (1Y–MAX subset) to the global range store.

---

## Review pass — gaps closed

A full implementation-vs-plan review was run; the following gaps were closed:

- **Req 8 (all charts zoomable):** every `/analytics/risk` chart (growth, drawdown, return histogram, rolling Sharpe/Sortino, rolling beta, risk-contribution pie) is now wrapped in `ChartCard`; the stress-test factor-tab waterfall too. Added `height` props to `GrowthChart`, `ReturnHistogram`, `RollingMetricsChart`, `RiskContributionPie` so the modal enlarges them.
- **Req 5 (universal timescale):** the analytics `DateRangeSelector` is now bound to the global store — choosing a range there propagates to the dashboard/portfolio charts and vice versa (store gains a `touched` flag so pages keep their default until a range is deliberately set). This was the last "universal" gap.
- **Req 3 (charts everywhere) + req 6 (reuse):** new reusable `SignedBarChart` (gain/loss horizontal bars) drives three previously-missing planned charts: `/tax/unrealised` gain/loss by holding, `/tax/cgt` realised gain by holding, and `/tools/sentiment` sector-performance bar (replaces the heatmap).
- **Palette compliance:** recoloured `RiskContributionPie` from raw hex to the Rosely palette (`holdingColor`).

### Deliberately deferred (with rationale)

- **`/reports/multi-period` radar:** period returns are frequently negative, which a radar renders misleadingly (values collapse toward the centre). Kept the grouped bar (now zoomable). The radar requirement (req 7) is met by the `/analytics/risk` risk-profile radar.
- **`/reports/diversity` nested pie:** the diversity report returns a single-dimension breakdown (no holding↔sector hierarchy), so a two-level pie isn't meaningful there. The nested pie lives on the portfolio-detail page where both dimensions exist; diversity keeps its (zoomable) flat pie.
- **`/tax/taxable-income` monthly-income bar:** needs a month-bucketed income aggregation the page doesn't currently load; the income-composition donut satisfies the composition requirement. Left as a future data-layer task.

