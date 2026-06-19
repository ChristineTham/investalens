# Analytics Implementation Plan — OBSOLETE

> **STATUS: OBSOLETE** — This document has been superseded. All content has been merged into:
> - `plan/R2-overview.md` — Architecture, route map, caching, performance targets
> - `plan/R2-P0.md` — Codespaces environment setup (packages, benchmarks, verification)
> - `plan/R2-P1a.md` — Data layer, Python infrastructure, shared components
> - `plan/R2-P1b.md` — Risk enhancement, backtesting, model selection
> - `plan/R2-P1c.md` — Optimisation, frontier, Black-Litterman, estimation methods
> - `plan/R2-P1d.md` — Monte Carlo, FIRE calculator, stress testing
> - `plan/R2-P1e.md` — Factors, correlations, tactical, ETF X-ray, AI tools
> - `plan/R2-P2.md` — Validation in Codespaces
>
> **Do not use this file for implementation guidance.** Use the R2-P* files above.

---

## Current State Assessment

### What Exists

| Route | Status | Quality |
|-------|--------|---------|
| `/analytics` | ✅ Hub page with 4 cards | Production-ready |
| `/analytics/risk` | ⚠️ Basic metrics (server component) | Hardcoded 8% benchmark, no real benchmark data, simplified portfolio value |
| `/analytics/monte-carlo` | ⚠️ Client-side sim (no server data) | Standalone calculator, no portfolio integration |
| `/analytics/what-if` | ⚠️ Client-side with hardcoded sample data | Not connected to user's actual holdings |
| `/analytics/exposure` | ⚠️ Basic treemap grouping | No ETF look-through, no underlying holdings X-ray |
| `lib/calculations/risk-metrics.ts` | ✅ Core math (Sharpe, Sortino, Beta, Alpha, MDD) | Good foundation |
| `lib/calculations/monte-carlo.ts` | ✅ Parametric simulation | Single-method only |
| `lib/calculations/performance.ts` | ✅ Holding performance calculation | Working |
| `api/analytics/optimize.py` | ❌ Placeholder (returns "not_implemented") | Needs full rewrite |

### What's Missing (Compared to Industry)

Based on Portfolio Visualizer, Sharesight, and the project's own `docs/ADVANCED.md`:

1. **Backtesting** — historical portfolio simulation with rebalancing
2. **Portfolio Optimisation** — Mean-Variance, HRP, Risk Parity, CVaR
3. **Efficient Frontier** — visual risk/return trade-off curve
4. **Black-Litterman** — equilibrium + user views
5. **Advanced Monte Carlo** — bootstrap, copula, withdrawal modelling
6. **Factor Analysis** — Fama-French regression, PCA decomposition
7. **Correlations** — matrix, rolling, cluster analysis
8. **Tactical Allocation** — momentum, moving average, dual momentum
9. **Stress Testing** — historical scenarios (GFC, COVID), custom, copula-conditional
10. **FIRE Calculator** — retirement planning with success probability
11. **Income Projection** — forward-looking dividend/income analysis
12. **Benchmark Comparison** — real index data, upside/downside capture

---

## Implementation Phases

### Phase 1: Foundation & Data Layer (Week 1-2)

> Goal: Reliable analytics data pipeline — portfolio returns, benchmark data, and the TypeScript ↔ Python bridge.

#### 1.1 Analytics Data Service (`lib/services/analytics-data.ts`)

Build the core data service that feeds all analytics tools:

```
Responsibilities:
- Fetch portfolio daily values (quantity × price) as a time series
- Handle multi-holding aggregation (portfolio-level returns)
- Calculate proper money-weighted or time-weighted returns
- Support configurable date ranges (1Y, 3Y, 5Y, 10Y, max)
- Handle corporate actions (splits, dividends) in return calculation
- Cache results per (portfolioId, dateRange) combination
```

**Key functions:**
- `getPortfolioTimeSeries(portfolioId, dateRange)` → `{ dates[], values[], returns[] }`
- `getHoldingTimeSeries(holdingId, dateRange)` → same
- `getBenchmarkTimeSeries(benchmarkCode, dateRange)` → same
- `getPortfolioReturnsMatrix(portfolioId, dateRange)` → per-asset returns for optimisation

#### 1.2 Benchmark Data (`lib/services/benchmark-data.ts`)

Real benchmark data instead of hardcoded 8% line:

| Benchmark | Ticker | Coverage |
|-----------|--------|----------|
| ASX 200 Total Return | IOZ.AX / STW.AX | AU equities |
| S&P 500 Total Return | ^SP500TR / SPY | US equities |
| MSCI World | URTH | Global equities |
| Bloomberg Agg Bond | AGG | Fixed income |
| AUD Cash Rate | — (RBA data) | Risk-free rate |

- Fetch from Yahoo Finance API (already integrated for prices)
- Store in `Price` table with special instrument records (type: "benchmark")
- Update daily via existing cron job

#### 1.3 Python Function Infrastructure (`api/python/`)

Set up the Vercel Python serverless function pattern:

```
api/python/
├── __init__.py
├── utils/
│   ├── __init__.py
│   ├── response.py      # JSON response helpers
│   └── transforms.py    # JSON ↔ pandas conversion
├── optimize.py          # Portfolio optimisation
├── backtest.py          # Historical backtesting
├── monte_carlo.py       # Advanced Monte Carlo
├── factor_analysis.py   # Fama-French / PCA
├── stress_test.py       # Scenario modelling
├── frontier.py          # Efficient frontier
├── covariance.py        # Covariance estimation
└── correlations.py      # Correlation/cointegration
```

#### 1.4 Analytics Client (`lib/services/analytics-client.ts`)

TypeScript wrapper that:
1. Fetches data from DB
2. Transforms to analytics input format (returns matrix, weights)
3. Calls the Python function
4. Caches results (with TTL based on data freshness)
5. Returns typed results to the frontend

---

### Phase 2: Risk Metrics Enhancement (Week 2-3)

> Goal: Transform `/analytics/risk` from basic to comprehensive — matching Portfolio Visualizer quality.

#### 2.1 Enhanced Risk Metrics Page

**Current gaps to fix:**
- Replace hardcoded 8% benchmark with real benchmark selector
- Use proper portfolio value calculation (qty × price per holding, summed)
- Add multiple time period options (1Y, 3Y, 5Y, Max)
- Add per-holding risk contribution breakdown

**New metrics to add:**

| Metric | Formula | Category |
|--------|---------|----------|
| Calmar Ratio | CAGR / Max Drawdown | Risk-adjusted |
| Treynor Ratio | (Return - Rf) / Beta | Risk-adjusted |
| Omega Ratio | P(gain)/P(loss) weighted | Risk-adjusted |
| VaR (5%) | Historical, Analytical, Conditional | Tail risk |
| CVaR (5%) | Expected Shortfall | Tail risk |
| Upside Capture | Portfolio up / Benchmark up | Relative |
| Downside Capture | Portfolio down / Benchmark down | Relative |
| R² | Coefficient of determination | Factor exposure |
| Tracking Error | Std(active returns) | Relative |
| Skewness | Distribution asymmetry | Distribution |
| Kurtosis | Tail heaviness | Distribution |

**New visualisations:**
- Rolling Sharpe/Sortino (12-month window)
- Drawdown chart with recovery periods
- Return distribution histogram with normal overlay
- Risk contribution pie chart (marginal risk per holding)
- Up vs. down market scatter plot

#### 2.2 Risk Dashboard Layout

```
/analytics/risk
├── Header (title, portfolio selector, period selector, benchmark selector)
├── Summary Cards (4-up: Return, Volatility, Sharpe, Max Drawdown)
├── Tabs:
│   ├── Overview — key metrics table + growth chart
│   ├── Drawdowns — drawdown chart + table of episodes
│   ├── Distribution — histogram + QQ plot + skew/kurtosis
│   ├── Rolling — rolling Sharpe, Sortino, Beta over time
│   └── Decomposition — risk contribution by holding
└── Export (PDF, CSV)
```

---

### Phase 3: Portfolio Backtesting (Week 3-4)

> Goal: New `/analytics/backtest` page — test hypothetical allocations against history.

#### 3.1 Backtest Configuration UI

**Input parameters:**
- Asset universe (search/select from instruments + ETFs + asset classes)
- Allocation weights (slider or manual input, sum to 100%)
- Time period (start year → end year)
- Initial investment amount
- Periodic contributions/withdrawals (monthly, quarterly, annual)
- Rebalancing frequency (none, monthly, quarterly, semi-annual, annual, band-based)
- Benchmark selection

**Preset portfolios** (like Portfolio Visualizer):
- 60/40 Stocks/Bonds
- All-Weather (Ray Dalio)
- Permanent Portfolio (Harry Browne)
- Three-Fund Portfolio (Bogleheads)
- User's current portfolio (auto-loaded)

#### 3.2 Backtest Engine (Python: `api/python/backtest.py`)

Using skfolio's backtesting framework:

```python
# Core logic:
1. Load historical returns for selected assets
2. Apply allocation weights
3. Simulate periodic rebalancing (with transaction costs)
4. Apply contributions/withdrawals at specified frequency
5. Calculate portfolio value series
6. Compute all risk/return metrics
7. Compare to benchmark
```

#### 3.3 Backtest Results (matching Portfolio Visualizer output)

**Summary section:**
- Start/End balance, CAGR, inflation-adjusted CAGR
- Standard deviation, Max Drawdown, Sharpe Ratio
- Best/Worst year, positive months %

**Visualisations:**
- Portfolio growth chart (log scale option)
- Annual returns bar chart (side-by-side with benchmark)
- Drawdown chart
- Rolling returns (3Y, 5Y)
- Active return contribution by asset
- Up vs. down market scatter

**Tables:**
- Annual returns (with inflation, benchmark, excess)
- Monthly returns grid
- Drawdown periods (start, trough, recovery, depth)
- Historical stress period performance (GFC, COVID, etc.)
- Asset correlations matrix
- Risk and return metrics (full table like PV)

---

### Phase 4: Portfolio Optimisation & Efficient Frontier (Week 4-5)

> Goal: New `/analytics/optimize` page — find optimal portfolio weights.

#### 4.1 Optimisation Strategies (Python: `api/python/optimize.py`)

| Strategy | Library | Description |
|----------|---------|-------------|
| Mean-Variance (Max Sharpe) | skfolio `MeanRisk` | Classic Markowitz |
| Minimum Variance | skfolio `MeanRisk(MINIMIZE_RISK)` | Lowest volatility |
| Risk Parity | skfolio `RiskBudgeting` | Equal risk contribution |
| Max Diversification | skfolio `MaximumDiversification` | Max diversification ratio |
| HRP | skfolio `HierarchicalRiskParity` | Hierarchical clustering |
| HERC | skfolio `HierarchicalEqualRiskContribution` | Equal risk via clustering |
| CVaR Minimisation | skfolio `MeanRisk(CVaR)` | Tail risk focus |
| Max Drawdown Min | skfolio `MeanRisk(MAX_DRAWDOWN)` | Drawdown-focused |
| Kelly Criterion | Custom | Geometric growth optimal |
| Equal Weight (1/N) | N/A (baseline) | Naive diversification |
| Inverse Volatility | Custom | Weight by 1/vol |

#### 4.2 Constraint Configuration UI

```
Constraints Panel:
├── Weight bounds (min/max per asset) — slider
├── Group constraints (e.g. equities 40-80%) — grouped sliders
├── Long-only toggle (no short selling)
├── Turnover limit (max rebalancing %)
├── Cardinality (max N assets)
└── Sector/country/market limits
```

#### 4.3 Efficient Frontier Visualisation (`/analytics/frontier`)

**Chart elements:**
- Efficient frontier curve (risk vs return)
- Current portfolio point (highlighted)
- Min variance portfolio (leftmost)
- Max Sharpe portfolio (tangent point)
- Individual assets plotted
- Capital Market Line (from risk-free rate)
- Naive portfolios (1/N, inverse-vol) for comparison

**Interactive features:**
- Hover any point on frontier → see allocation weights
- Click to compare with current portfolio
- Drag constraints → frontier updates in real-time (ambitious, maybe v2)

#### 4.4 Optimisation Results Page

- Recommended weights (bar chart + table)
- Comparison: current vs. optimised (side-by-side metrics)
- Rebalancing trades needed (what to buy/sell)
- Marginal risk contribution chart
- Sensitivity analysis (how weights change with different risk tolerance)

---

### Phase 5: Advanced Monte Carlo & FIRE (Week 5-6)

> Goal: Upgrade Monte Carlo from standalone calculator to portfolio-integrated tool + FIRE calculator.

#### 5.1 Enhanced Monte Carlo (`/analytics/monte-carlo` — Upgrade)

**Simulation methods:**

| Method | Description | Use Case |
|--------|-------------|----------|
| Historical Bootstrap | Resample actual returns | Conservative, captures real distribution |
| Parametric (Normal) | mu/sigma from history | Fast, simple |
| Parametric (Fat-tailed) | Student-t or Johnson Su | Captures extreme events |
| Copula-based | Vine copula for joint distribution | Realistic tail dependencies |
| Block Bootstrap | Preserve serial correlation | Momentum/mean-reversion regimes |

**New features vs current:**
- Auto-load portfolio's actual return/volatility stats
- Support withdrawal modelling (fixed, percentage, guardrails)
- Financial goals (multiple phases: accumulation → drawdown)
- Tax-aware projections (after-tax returns)
- Inflation adjustment (fixed or bootstrapped CPI)

**Output:**
- Fan chart (confidence bands)
- Success rate (% of scenarios surviving)
- Percentile table at key milestones (5Y, 10Y, 20Y, 30Y)
- Failure analysis (when/how much shortfall)
- Sensitivity table (success rate vs. different withdrawal amounts)

#### 5.2 FIRE Calculator (`/analytics/fire`)

**New page — retirement planning tool:**

**Inputs:**
- Current portfolio value (auto-filled from portfolio)
- Current age, target retirement age
- Annual savings / contribution rate
- Expected return (or pull from portfolio's historical)
- Expected volatility
- Target withdrawal rate in retirement (4% rule, custom)
- Inflation assumption
- Life expectancy / planning horizon
- Social Security / pension start age and amount

**Outputs:**
- FIRE number (portfolio needed at retirement)
- Years to FIRE
- Monte Carlo probability of success
- Safe withdrawal rate for your specific portfolio
- Sensitivity: how ±1% return / ±1% savings changes timeline
- Accumulation phase chart + drawdown phase chart
- Coast FIRE number (stop contributing, let compound growth do the rest)

---

### Phase 6: Factor Analysis & Correlations (Week 6-7)

> Goal: New `/analytics/factors` and `/analytics/correlations` pages.

#### 6.1 Factor Analysis (`/analytics/factors`)

**Supported models:**
- CAPM (1 factor: Market)
- Fama-French 3-Factor (Market, Size, Value)
- Carhart 4-Factor (+ Momentum)
- Fama-French 5-Factor (+ Profitability, Investment)
- Custom (user-uploaded factor series)

**Data source:**
- Kenneth French Data Library (public, free)
- Download daily/monthly factor returns
- Map to AUD where possible (or use global factors)
- Cache in DB, refresh monthly

**Output:**
- Alpha and factor loadings per holding (table)
- R² and t-statistics
- Factor exposure bar chart
- Rolling factor exposures (how betas change over time)
- Style box (growth vs value, large vs small)
- Performance attribution (how much return from each factor)

#### 6.2 Correlations (`/analytics/correlations`)

**Features:**
- Correlation matrix heatmap (all portfolio assets)
- Rolling correlation chart (select any pair)
- Cluster analysis dendrogram (hierarchical clustering)
- Crisis correlations (correlations during drawdown periods vs. normal)
- Autocorrelation analysis per asset

**Interactive:**
- Click cell in heatmap → see rolling correlation for that pair
- Period selector (1Y, 3Y, 5Y, Full)
- Filter by asset type/sector

---

### Phase 7: Stress Testing & Scenarios (Week 7-8)

> Goal: Upgrade `/analytics/what-if` to comprehensive stress testing.

#### 7.1 Historical Stress Scenarios

**Pre-built scenarios** (applied to user's current portfolio):

| Scenario | Period | Key Characteristics |
|----------|--------|---------------------|
| GFC | Oct 2007 – Mar 2009 | Credit crisis, -50% equities |
| COVID-19 | Feb – Mar 2020 | Fast crash, fast recovery |
| Dot-com Bust | Mar 2000 – Oct 2002 | Tech collapse |
| 2022 Rate Shock | Jan – Oct 2022 | Stocks and bonds fall together |
| 1987 Black Monday | Oct 1987 | Single-day 22% crash |
| European Debt | 2010-2012 | Sovereign risk |
| Asian Crisis | 1997-1998 | EM currency collapse |

**For each scenario:**
- Show portfolio return during that period (using beta * market move)
- Show per-holding impact
- Identify which assets provided protection
- Compare to benchmark

#### 7.2 Custom Scenarios (upgrade from current what-if)

**Improvements over current:**
- Auto-load actual holdings (not hardcoded sample)
- Auto-fetch beta from factor regression (not manual input)
- Multi-factor scenarios (not just market beta)
  - e.g. "rates +200bps AND equities -15% AND AUD -10%"
- Sector-specific shocks
- Custom scenario builder (drag sliders for each factor)

#### 7.3 Copula-Conditional Stress Testing (Python advanced)

- Fit copula to portfolio's joint distribution
- Condition on event: "What if [largest holding] drops 20%?"
- Generate conditional distribution of all other assets
- Show percentile fan of portfolio outcomes
- Most realistic approach to "contagion" modelling

---

### Phase 8: Tactical Allocation & Timing Models (Week 8-9)

> Goal: New `/analytics/tactical` page — signal-based allocation rules.

#### 8.1 Supported Models

| Model | Signal | Implementation |
|-------|--------|----------------|
| Simple Moving Average | Price vs. SMA(200) | If price > SMA → invest, else → cash |
| MA Crossover | SMA(50) vs. SMA(200) | Golden/death cross |
| Momentum (Relative Strength) | 12-month return | Rank assets, hold top N |
| Dual Momentum | Absolute + Relative | Hold top asset only if > cash |
| Target Volatility | Realised vol | Scale exposure to target vol |
| Adaptive Allocation | Multi-signal combo | Momentum + vol + correlation |

#### 8.2 Backtest Output (Tactical-specific)

Same as Phase 3 backtest output, plus:
- Signal chart (when invested vs. in cash)
- Trade log (every entry/exit)
- Time in market %
- Turnover and transaction costs
- Whipsaw analysis (false signals)
- Tax impact estimate (short-term vs long-term gains)

---

### Phase 9: Exposure & ETF X-Ray (Week 9-10)

> Goal: Upgrade `/analytics/exposure` to true ETF look-through analysis.

#### 9.1 ETF Look-Through Data

**Data source:** ETF provider APIs or scraped holdings files
- Vanguard, iShares, SPDR publish holdings CSVs
- Parse top 50-500 holdings per ETF
- Store in new `EtfHolding` table
- Refresh weekly/monthly

#### 9.2 Enhanced Exposure Report

**Current:** Groups by sector/country/type/market (portfolio's direct holdings only)

**Enhanced:**
- Show underlying ETF constituents
- Identify overlapping holdings across ETFs
- True total exposure = direct + indirect (via ETFs)
- Concentration risk alerts (e.g. "You hold AAPL directly AND via 3 ETFs = 8% total exposure")
- Country-level geographic map visualisation
- Sector treemap with drill-down

#### 9.3 Share Checker (`/analytics/overlap`)

- Select 2+ ETFs or portfolio groups
- Show Venn diagram or overlap matrix
- List duplicated holdings with combined weight
- Suggest consolidation opportunities

---

### Phase 10: Dashboard Integration & Polish (Week 10-11)

> Goal: Tie everything together — analytics hub, navigation, caching, export.

#### 10.1 Analytics Hub Redesign (`/analytics`)

Upgrade from 4 cards to comprehensive navigation:

```
Analytics Hub:
├── Risk & Performance
│   ├── Risk Metrics Dashboard
│   ├── Drawdown Analysis
│   └── Rolling Performance
├── Portfolio Construction
│   ├── Backtest
│   ├── Optimisation
│   ├── Efficient Frontier
│   └── Black-Litterman
├── Simulation & Planning
│   ├── Monte Carlo
│   ├── FIRE Calculator
│   └── Scenario / Stress Test
├── Analysis
│   ├── Factor Analysis
│   ├── Correlations
│   ├── Tactical Models
│   └── Exposure / X-Ray
└── Quick Actions
    ├── "Optimise my portfolio" (1-click)
    ├── "How would I survive a crash?" (1-click stress test)
    └── "Am I on track for FIRE?" (1-click MC sim)
```

#### 10.2 Shared Components

| Component | Used By |
|-----------|---------|
| `<PortfolioSelector>` | All analytics pages |
| `<BenchmarkSelector>` | Risk, Backtest, Tactical |
| `<DateRangeSelector>` | All analytics pages |
| `<MetricCard>` | Risk, Backtest, FIRE |
| `<FanChart>` | Monte Carlo, FIRE, Stress Test |
| `<CorrelationHeatmap>` | Correlations, Factor |
| `<EfficientFrontierChart>` | Frontier, Optimise |
| `<DrawdownChart>` (exists) | Risk, Backtest |
| `<GrowthChart>` | Backtest, Monte Carlo |
| `<WeightBarChart>` | Optimise, Exposure |
| `<FactorLoadingsChart>` | Factors |
| `<ScenarioImpactTable>` | Stress Test, What-If |

#### 10.3 Caching Strategy

| Data | TTL | Invalidation |
|------|-----|--------------|
| Portfolio time series | 1 hour | On new transaction or price update |
| Benchmark data | 24 hours | Daily cron |
| Risk metrics | 1 hour | Same as portfolio |
| Backtest results | 7 days | On parameter change |
| Optimisation results | 24 hours | On new data |
| Factor data | 30 days | Monthly refresh |
| Monte Carlo results | Session | On parameter change |

#### 10.4 Export & Sharing

- PDF export for all analytics pages (server-side rendering)
- CSV export for data tables
- Shareable links (encode parameters in URL)
- Comparison mode (overlay 2-3 portfolios on same chart)

---

## Route Map (Final Structure)

```
/analytics                    → Hub page (redesigned)
/analytics/risk               → Risk metrics dashboard (enhanced)
/analytics/backtest           → Portfolio backtesting (NEW)
/analytics/optimize           → Portfolio optimisation (NEW)
/analytics/frontier           → Efficient frontier (NEW)
/analytics/monte-carlo        → Monte Carlo simulation (enhanced)
/analytics/fire               → FIRE calculator (NEW)
/analytics/factors            → Factor analysis (NEW)
/analytics/correlations       → Correlation analysis (NEW)
/analytics/what-if            → Stress testing (enhanced)
/analytics/tactical           → Tactical allocation (NEW)
/analytics/exposure           → Exposure & ETF X-ray (enhanced)
/analytics/overlap            → Share checker / overlap (NEW)
```

---

## File Structure (New/Modified Files)

### Python Functions (`api/python/`)

```
api/python/
├── utils/
│   ├── __init__.py
│   ├── response.py
│   └── transforms.py
├── optimize.py              # Mean-Variance, HRP, Risk Parity, etc.
├── frontier.py              # Efficient frontier calculation
├── backtest.py              # Historical backtesting with rebalancing
├── monte_carlo.py           # Bootstrap, parametric, copula MC
├── factor_analysis.py       # Fama-French regression, PCA
├── stress_test.py           # Historical + custom + conditional
├── correlations.py          # Matrix, rolling, cointegration
├── covariance.py            # Estimator methods (Ledoit-Wolf, etc.)
├── tactical.py              # Momentum, MA, dual momentum models
└── black_litterman.py       # Equilibrium + views blending
```

### TypeScript Services (`lib/services/`)

```
lib/services/
├── analytics-client.ts      # Python function caller + caching
├── analytics-data.ts        # Portfolio time series builder
├── benchmark-data.ts        # Benchmark fetch + storage
├── factor-data.ts           # Kenneth French data library
└── etf-holdings.ts          # ETF look-through data
```

### Calculations (`lib/calculations/`)

```
lib/calculations/
├── risk-metrics.ts          # Enhanced (add VaR, CVaR, capture ratios)
├── monte-carlo.ts           # Keep for client-side quick sim
├── performance.ts           # Existing (no change)
├── position.ts              # Existing (no change)
├── bond-analytics.ts        # Existing (no change)
├── parcels.ts               # Existing (no change)
├── fire.ts                  # NEW: FIRE calculation logic
├── rolling-metrics.ts       # NEW: Rolling window calculations
├── drawdown.ts              # NEW: Drawdown detection + episodes
└── benchmark.ts             # NEW: Benchmark comparison utils
```

### Chart Components (`components/charts/`)

```
components/charts/
├── monte-carlo-chart.tsx    # Existing (upgrade fan chart)
├── drawdown-chart.tsx       # Existing (enhance)
├── exposure-treemap.tsx     # Existing (enhance)
├── efficient-frontier.tsx   # NEW
├── correlation-heatmap.tsx  # NEW
├── factor-loadings.tsx      # NEW
├── rolling-metrics.tsx      # NEW
├── fan-chart.tsx            # NEW (reusable confidence bands)
├── growth-chart.tsx         # NEW (portfolio growth + benchmark)
├── return-histogram.tsx     # NEW
├── scenario-waterfall.tsx   # NEW
├── weight-bar.tsx           # NEW
└── signal-chart.tsx         # NEW (tactical model signals)
```

### Pages (`app/(dashboard)/analytics/`)

```
app/(dashboard)/analytics/
├── page.tsx                 # Hub (redesign)
├── risk/page.tsx            # Enhanced
├── backtest/page.tsx        # NEW
├── optimize/page.tsx        # NEW
├── frontier/page.tsx        # NEW
├── monte-carlo/page.tsx     # Enhanced
├── fire/page.tsx            # NEW
├── factors/page.tsx         # NEW
├── correlations/page.tsx    # NEW
├── what-if/page.tsx         # Enhanced → Stress Testing
├── tactical/page.tsx        # NEW
├── exposure/page.tsx        # Enhanced
└── overlap/page.tsx         # NEW
```

---

## Implementation Priority

### Must Have (MVP Analytics — ship first)

1. **Phase 1** — Data layer (everything depends on this)
2. **Phase 2** — Risk enhancement (upgrades existing page)
3. **Phase 3** — Backtesting (most requested feature in portfolio tools)
4. **Phase 5.2** — FIRE calculator (high user demand, relatively simple)

### Should Have (Core differentiation)

5. **Phase 4** — Optimisation + Frontier (key differentiator)
6. **Phase 5.1** — Enhanced Monte Carlo (portfolio-integrated)
7. **Phase 7** — Stress testing (upgrade existing what-if)

### Nice to Have (Advanced — competitive parity with Portfolio Visualizer)

8. **Phase 6** — Factor analysis + correlations
9. **Phase 8** — Tactical allocation
10. **Phase 9** — ETF X-ray + overlap

---

## Technical Considerations

### Performance Budget

| Operation | Target Response | Strategy |
|-----------|-----------------|----------|
| Risk metrics (1Y) | < 500ms | TS server component, DB query |
| Backtest (10Y, 5 assets) | < 3s | Python function, cached |
| Optimisation (20 assets) | < 5s | Python function, cached |
| Efficient frontier (50 pts) | < 8s | Python, async pattern if >10s |
| Monte Carlo (10K sims) | < 5s | Python function |
| Factor regression (10 assets) | < 2s | Python function |
| Correlation matrix (20 assets) | < 1s | TS calculation |

### Error Handling

- Insufficient data: Show "Need at least 1 year of price data" with clear CTA
- Python function timeout: Show partial results + "Retry with fewer assets"
- Missing benchmark: Graceful fallback to synthetic benchmark
- Zero holdings: Show empty state with "Add holdings first" link

### Accessibility

- All charts have tabular data alternatives (tables below charts)
- Screen reader descriptions for key metrics
- Keyboard-navigable chart tooltips
- High-contrast mode for chart colours

---

## Dependencies

### Python Packages (already in `pyproject.toml` per R2 plan)

- `skfolio` — optimisation, risk measures, estimation
- `scipy` — statistical functions
- `numpy` — numerical computation
- `pandas` — data manipulation
- `statsmodels` — regression, time series

### JavaScript Packages (add as needed)

- `recharts` ✅ (already installed)
- `d3` — for heatmaps, frontier curve (add: `pnpm add d3 @types/d3`)
- No other new JS deps anticipated

---

## Success Metrics

| Metric | Target |
|--------|--------|
| All 13 analytics pages functional | 100% |
| Python functions respond < 10s | 95th percentile |
| Portfolio data loads correctly | All edge cases handled |
| Charts render on mobile | Responsive at 375px+ |
| Export to CSV works | All tabular data |
| Real benchmark data available | ASX200, S&P500, MSCI World |
