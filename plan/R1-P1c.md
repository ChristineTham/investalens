# R1-P1c: Calculations, Reports & Tax

## Objective

Implement portfolio performance calculations, all standard reports, and Australian tax reporting (CGT, Taxable Income, AMIT).

## Prerequisites

- R1-P1a and R1-P1b completed (schema, CRUD, prices available)
- Reference: `docs/TOOLS.md`, `docs/TAX.md`

## Recommended Skills

Invoke these skills for best-practice guidance during this phase:
- **vercel-react-best-practices** — Report component performance, data fetching patterns
- **vercel-composition-patterns** — Composable report UI (compound components, context)
- **runtime-cache** — Caching expensive report calculations
- **next-best-practices** — Server actions for report generation, streaming
- **prisma-client-api** — Complex aggregation queries for reports

> **Note:** Financial calculations (MWR, CGT, parcels) and Australian tax rules are domain-specific logic not covered by general skills. Follow the plan details and reference `docs/TAX.md`.

---

## Task 1: Performance Calculation Engine

**File: `src/lib/calculations/performance.ts`**

Implement money-weighted return (MWR) calculation:
- Calculate total return for a holding over any date range
- Annualise returns correctly
- Handle multiple buy parcels at different prices
- Factor in: capital gains, dividends, currency gains, brokerage

Key functions:
```typescript
function calculateHoldingPerformance(transactions: Transaction[], prices: Price[], dateRange: DateRange): HoldingPerformance;
function calculatePortfolioPerformance(holdings: HoldingWithTransactions[], prices: Map<string, Price[]>, dateRange: DateRange): PortfolioPerformance;
function annualiseReturn(totalReturn: number, days: number): number;
```

**File: `src/lib/calculations/position.ts`**

Calculate current position state from transactions:
- Running quantity (sum of buys minus sells, adjusted for splits)
- Average cost per unit
- Total cost base (for CGT)
- Market value (quantity × current price)
- Unrealised gain/loss

**File: `src/lib/calculations/parcels.ts`**

Track individual buy parcels for CGT:
- Each BUY creates a parcel: { date, quantity, costBase, remainingQuantity }
- SELL consumes parcels according to sale allocation method (FIFO, LIFO, etc.)
- RETURN_OF_CAPITAL reduces parcel cost base
- SPLIT multiplies parcel quantity (divides cost per unit)
- Track holding period for CGT discount eligibility (>12 months)

---

## Task 2: Performance Report

**File: `src/lib/reports/performance-report.ts`**

Generate the Performance Report:
- Date range selection (preset: 1M, 3M, 6M, YTD, 1Y, 3Y, 5Y, Since Inception, Custom)
- Group by: Market, Sector, Industry, Investment Type, Country, Custom Group, None
- Filter by labels
- For each holding: capital gain, dividend income, currency gain, total return, contribution %
- Group subtotals and portfolio total
- Annualised return percentage

**File: `src/app/(dashboard)/reports/performance/page.tsx`**

Report UI:
- Date range picker
- Grouping dropdown
- Label filter
- Toggle: open positions only / include closed
- Results table with expandable groups
- Summary card at top (total return, annualised %)
- Export button (CSV)

---

## Task 3: Additional Reports

**File: `src/lib/reports/contribution-report.ts`**

Contribution Analysis — how each holding drives overall portfolio return.

**File: `src/lib/reports/multi-period-report.ts`**

Compare performance across up to 5 periods (financial years, calendar years, custom).

**File: `src/lib/reports/sold-securities-report.ts`**

Realised gains/losses on closed positions within a date range.

**File: `src/lib/reports/future-income-report.ts`**

Projected dividends based on current holdings and historical payment patterns. Statuses: Announced, Pending, Paid (Confirmed/Unconfirmed), Estimated.

**File: `src/lib/reports/calendar-report.ts`**

Month-by-month dividend calendar from Future Income data.

**File: `src/lib/reports/diversity-report.ts`**

Current portfolio weights grouped by dimension. Pie chart data output.

**File: `src/lib/reports/drawdown-report.ts`**

Maximum drawdown and RoMaD per holding. Four-quadrant scatter data.

**File: `src/lib/reports/historical-cost-report.ts`**

Opening/closing cost base for accounting entities.

---

## Task 4: Report Pages (UI)

Create pages under `src/app/(dashboard)/reports/`:
- `contribution/page.tsx`
- `multi-period/page.tsx`
- `sold-securities/page.tsx`
- `future-income/page.tsx`
- `calendar/page.tsx`
- `diversity/page.tsx`
- `drawdown/page.tsx`
- `historical-cost/page.tsx`
- `all-trades/page.tsx`

Each page follows the pattern:
1. Config form at top (date range, grouping, filters)
2. Server action call to generate report data
3. Results rendered in table + optional chart (Recharts)
4. Export button

---

## Task 5: Tax — Taxable Income Report

**File: `src/lib/reports/tax/taxable-income.ts`**

Calculate taxable income for a financial year:
- Group income: Local Non-Trust, Local Trust, Foreign
- Columns: Total Income, Net Dividend, Franked, Unfranked, Interest, Tax Deferred, AMIT Decrease/Increase, Foreign Source Income, Franking Credits, TFN Withholding, Foreign Tax
- Calculate ATO totals and form code mappings (18A, 18H, etc.)
- Only for AU tax residency portfolios

---

## Task 6: Tax — Capital Gains Tax Report

**File: `src/lib/reports/tax/cgt-report.ts`**

Full CGT calculation per ATO rules:
1. Get all SELL transactions in the financial year
2. Match each sell against buy parcels using the configured sale allocation method
3. Calculate gain/loss per parcel
4. Separate short-term (<12 months) and long-term (≥12 months)
5. Apply carried-forward losses (user-entered)
6. Apply CGT discount (50% individual, 33.3% SMSF, 0% company)
7. Calculate net capital gain (18A)

Output includes:
- Breakdown tabs: All Holdings, Short-term Gains, Long-term Gains, Losses, Non-discounted Distributions, Discounted Distributions
- Parcel-level detail (purchase date, quantity, cost base, proceeds, gain/loss)
- Sale allocation method comparison ("Optimise" — run all methods, show which minimises tax)
- Lock-in functionality (save method choice per financial year)

**File: `src/lib/reports/tax/cgt-parcel-matcher.ts`**

Implement all 5 sale allocation methods:
- FIFO: oldest parcels sold first
- LIFO: newest parcels sold first
- Minimise Capital Gain: highest cost base first
- Maximise Capital Gain: lowest cost base first
- Minimise Capital Gain Tax: considers holding period + cost base to minimise actual tax

---

## Task 7: Tax — Unrealised CGT Report

**File: `src/lib/reports/tax/unrealised-cgt.ts`**

Hypothetical CGT if all positions sold today:
- Short-term unrealised gains
- Long-term unrealised gains (with discount)
- Unrealised losses
- Net hypothetical tax liability
- Compare sale allocation methods

---

## Task 8: Tax UI Pages

**Files under `src/app/(dashboard)/tax/`:**
- `page.tsx` — Tax summary dashboard (financial year selector, key figures)
- `taxable-income/page.tsx` — Full taxable income report
- `cgt/page.tsx` — CGT report with breakdown tabs
- `unrealised/page.tsx` — Unrealised CGT
- `historical-cost/page.tsx` — (links to reports version)

---

## Task 9: Chart Components

**File: `src/components/charts/portfolio-growth.tsx`**

Line chart (Recharts) showing portfolio value over time vs benchmark.

**File: `src/components/charts/annual-returns-bar.tsx`**

Bar chart showing annual returns per year (grouped by portfolio vs benchmark).

**File: `src/components/charts/diversity-pie.tsx`**

Pie/donut chart for asset allocation.

**File: `src/components/charts/drawdown-chart.tsx`**

Area chart showing drawdown periods.

**File: `src/components/charts/drawdown-scatter.tsx`**

Scatter plot (4 quadrants) for MDD vs Return.

---

## Deliverables Checklist

- [ ] Performance calculation engine (MWR, annualisation)
- [ ] Position calculator (quantity, cost base, market value, unrealised P&L)
- [ ] Parcel tracking system for CGT
- [ ] Performance Report (with grouping, filtering, export)
- [ ] Contribution Analysis Report
- [ ] Multi-Period Report
- [ ] Sold Securities Report
- [ ] Future Income Report
- [ ] Calendar Report
- [ ] Diversity Report
- [ ] Drawdown Risk Report
- [ ] Historical Cost Report
- [ ] All Trades Report
- [ ] Taxable Income Report (ATO-mapped)
- [ ] CGT Report (5 allocation methods, discount, parcel matching)
- [ ] Unrealised CGT Report
- [ ] Tax summary dashboard
- [ ] 5 chart components (Recharts)
- [ ] All report and tax UI pages

## Notes for the Agent

- All financial calculations use Decimal (via Prisma) or `number` with explicit rounding
- CGT discount: 50% for individual/trust, 33.33% for SMSF, 0% for company
- Financial year in AU: 1 July – 30 June (financialYearEnd = 6 means year ends June)
- Parcels are immutable once locked — never modify a locked financial year's allocation
- Future Income estimates based on most recent dividend amount × payment frequency
- All report functions return plain data objects — UI renders them
