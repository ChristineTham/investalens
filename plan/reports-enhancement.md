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

## Phase 3: Future Enhancements (Not This Sprint)
- Exposure Report (geographic/sector treemap)
- Risk metrics (Sharpe, Sortino, Beta, Alpha)
- Monte Carlo simulation
- What-if scenario analysis
- Export to PDF/CSV
- Saved report configurations
