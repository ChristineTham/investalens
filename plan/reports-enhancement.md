# Reports Enhancement Plan

## Overview

Upgrade all reports from static tables to interactive, chart-driven experiences with
drill-down capabilities, benchmark comparison, and professional-grade visualisations.

Based on research of Sharesight, Morningstar, and Yahoo Finance report features.

---

## Phase 1: Chart Integration (Current Sprint)

### Performance Report
- [x] Portfolio growth line chart (vs benchmark)
- [x] Benchmark selector (All Ords, ASX 200, S&P 500)
- [x] Chart type toggle: % Gain / Benchmarked / Growth of $10k
- [x] Clickable holdings table → drill-down to holding detail
- [x] Toggle: Monetary Gains ↔ Percentage Gains

### Contribution Report
- [x] Horizontal bar chart showing each holding's contribution
- [x] Waterfall chart showing positive/negative contributions
- [x] Color-coded: green (positive) / red (negative)

### Diversity Report
- [x] Interactive pie/donut chart (already exists: diversity-pie.tsx)
- [x] Grouping selector (market/sector/type/country/custom)
- [x] Click pie segment → shows holdings in that segment

### Drawdown Report
- [x] Scatter plot: Return vs MaxDrawdown (already exists: drawdown-scatter.tsx)
- [x] Drawdown chart over time (already exists: drawdown-chart.tsx)
- [x] Interactive legend (click to show/hide holdings)
- [x] Quadrant labels (Low Risk/High Return etc.)

### Dividend Calendar
- [x] Visual calendar grid (month-by-month)
- [x] Color-coded status: Paid / Pending / Estimated
- [x] Monthly income bar chart

### Multi-Period Report
- [x] Grouped bar chart (1M/3M/6M/1Y/3Y per holding)
- [x] Heat map coloring in table (green→red)

### Future Income
- [x] Monthly projected income bar chart
- [x] Yield donut chart by holding

### Historical Cost
- [x] Stacked bar chart (Opening / Purchases / Sales / Closing)

---

## Phase 2: Drill-Down Holding Detail

### `/reports/holding/[holdingId]` page
- [x] Price chart (Line with OHLC data)
- [x] Time range selector (1W/1M/3M/6M/1Y/3Y/5Y/Max)
- [x] Volume bars below price chart
- [x] Dividend markers on chart (dashed green reference lines)
- [x] Moving averages (20-day, 50-day, 200-day) with toggle chips
- [x] Performance summary cards (qty, avg cost, market value, unrealised, total return)
- [x] Transaction history table
- [x] Brush/zoom control on chart timeline
- [x] Period stats bar (open/close/change%/high/low/avg volume)

---

## Phase 3: Advanced Analytics & Export

### `/analytics/exposure` — Exposure Report
- [x] Treemap visualization (sector/country/type/market)
- [x] Group-by selector (clickable chips)
- [x] Portfolio selector
- [x] Breakdown table with values and weights

### `/analytics/risk` — Risk Metrics
- [x] Sharpe Ratio, Sortino Ratio
- [x] Beta, Alpha (Jensen's)
- [x] Annualised Return, Volatility
- [x] Max Drawdown
- [x] Information Ratio, Tracking Error
- [x] Interpretation guide

### `/analytics/monte-carlo` — Monte Carlo Simulation
- [x] Configurable parameters (value, return, volatility, years, contributions)
- [x] 1000-simulation projection
- [x] Fan chart (5th/25th/50th/75th/95th percentiles)
- [x] Probability of loss and doubling
- [x] Outcome distribution summary

### `/analytics/what-if` — What-If Scenarios
- [x] Preset scenarios (Crash -30%, Correction -10%, Rally +15%, GFC -50%)
- [x] Custom market move input
- [x] Beta-weighted per-holding impact calculation
- [x] Editable holdings table (add/remove)
- [x] P&L summary cards

### Export (Settings)
- [x] Portfolio selector
- [x] Export Trades (CSV)
- [x] Export Holdings (CSV)
- [x] Export Dividends (CSV)
- [x] Full Backup (JSON)
- [x] Browser file download trigger
