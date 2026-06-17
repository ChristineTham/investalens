# R2 Overview: Advanced Analytics (Python Engine)

## Objective

Build the Python serverless analytics engine using skfolio, implementing portfolio optimisation, Monte Carlo simulation, factor analysis, backtesting, stress testing, AI-powered features, and planning tools.

## Prerequisites

- R1 complete (working MVP with holdings, prices, reports)
- Vercel Python runtime configured (from R0)
- Reference: `docs/ADVANCED.md`, `docs/ARCHITECTURE.md`

---

## Scope

### In Scope (R2)

**Python Analytics Engine:**
- Python serverless function infrastructure (FastAPI on Vercel)
- Portfolio backtesting engine (walk-forward, strategy comparison)
- Mean-Variance optimisation with constraints
- Efficient frontier calculation and visualisation
- Black-Litterman model
- Hierarchical Risk Parity (HRP) and Risk Budgeting
- Monte Carlo simulation (bootstrap, parametric, copula)
- Distribution and copula fitting
- Return and covariance estimation methods (all from skfolio)
- Factor models (Fama-French, PCA)
- Correlation analysis (matrix, rolling, clustering)
- Tactical allocation (momentum, mean-reversion, vol targeting)
- Stress testing (historical scenarios, custom, conditional)
- Cross-validation and model selection

**TypeScript Features:**
- Analytics data layer (portfolio time series, benchmark integration)
- Enhanced risk metrics dashboard (VaR, CVaR, capture ratios, rolling)
- FIRE Calculator (retirement planning)
- ETF X-ray (look-through decomposition)
- Share Checker (portfolio health checks)
- Market Sentiment dashboard

**AI Features:**
- AI Importer (Gemini via Vercel AI SDK — parse unstructured statements)
- AI Chat assistant (stretch goal)

### Out of Scope (R3+)

- Multi-market support (still ASX-focused)
- International tax
- Additional broker integrations
- Real-time streaming data

---

## Subphase Breakdown

| Phase  | Focus | Key Dependencies | Files |
|--------|-------|-------------------|-------|
| R2-P0  | **Codespaces setup** — install packages, seed benchmarks, verify pipeline | R1 complete | `plan/R2-P0.md` |
| R2-P1a | **Data layer + Python infra** — time series, benchmarks, analytics client, caching, shared calc modules, shared UI components | R2-P0 complete | `plan/R2-P1a.md` |
| R2-P1b | **Risk enhancement + Backtesting** — comprehensive risk dashboard, walk-forward backtest, strategy comparison, model selection | R2-P1a complete | `plan/R2-P1b.md` |
| R2-P1c | **Optimisation + Frontier** — Mean-Variance, HRP, Risk Parity, Black-Litterman, efficient frontier, estimation methods | R2-P1b complete | `plan/R2-P1c.md` |
| R2-P1d | **Monte Carlo + FIRE + Stress** — advanced MC (3 methods), distribution fitting, FIRE calculator, stress testing (3 modes) | R2-P1c complete | `plan/R2-P1d.md` |
| R2-P1e | **Factors + Correlations + Tools** — factor analysis, correlations, tactical allocation, ETF X-ray, Share Checker, AI Importer, Market Sentiment, AI Chat | R2-P1d complete | `plan/R2-P1e.md` |
| R2-P2  | **Validation in Codespaces** — end-to-end testing of all features | R2-P1e complete | `plan/R2-P2.md` |

---

## Architecture

### Python Functions

All Python functions are deployed as Vercel Serverless Functions under `api/analytics/`:

```
api/analytics/
├── utils/
│   ├── __init__.py
│   ├── response.py          # FastAPI app factory + error helpers
│   └── transforms.py        # JSON ↔ pandas/numpy conversion
├── optimize.py              # Mean-Variance, Max Sharpe, Min Risk
├── optimize_hrp.py          # Hierarchical Risk Parity
├── optimize_risk_parity.py  # Risk Budgeting
├── frontier.py              # Efficient frontier curve
├── black_litterman.py       # Equilibrium + user views
├── backtest.py              # Walk-forward backtesting
├── backtest_compare.py      # Multi-strategy comparison
├── walk_forward.py          # Detailed walk-forward analysis
├── cross_validate.py        # Model selection (WF + CPCV)
├── monte_carlo.py           # Bootstrap, parametric, copula
├── fit_distribution.py      # Univariate distribution fitting
├── fit_copula.py            # Joint distribution fitting
├── estimate_returns.py      # Return estimators (4 methods)
├── estimate_covariance.py   # Covariance estimators (8 methods)
├── factor_analysis.py       # Fama-French, PCA
├── correlations.py          # Matrix, rolling, clustering
├── tactical.py              # Momentum, mean-reversion, vol target
└── stress_test.py           # Historical, custom, conditional
```

### Communication Pattern

Python functions do NOT access the database directly:

```
Frontend → TypeScript Server Action / API Route
         → lib/services/analytics-data.ts (fetch from DB)
         → lib/services/analytics-client.ts (call Python function)
         → api/analytics/{endpoint}.py (compute)
         → Return JSON → Cache → Render
```

### Runtime Constraints

| Constraint | Value | Impact |
|-----------|-------|--------|
| Max execution time (Pro) | 60s | Sufficient for all operations |
| Max execution time (Free) | 10s | Limits MC to ~1,000 sims |
| Max memory | 1024 MB | Sufficient for portfolio-scale data |
| Cold start | ~2–5s | First request slower |

---

## TypeScript Services & Calculations

### New Services (`lib/services/`)

| File | Purpose |
|------|---------|
| `analytics-data.ts` | Portfolio time series, returns matrix |
| `analytics-client.ts` | Python function caller + caching |
| `analytics-cache.ts` | TTL-based caching strategy |
| `benchmark-data.ts` | Benchmark fetch + constants |
| `factor-data.ts` | Kenneth French data library |
| `etf-xray.ts` | ETF look-through decomposition |
| `share-checker.ts` | Portfolio health checks |
| `market-sentiment.ts` | Market indicators aggregation |

### New Calculations (`lib/calculations/`)

| File | Purpose |
|------|---------|
| `rolling-metrics.ts` | Rolling Sharpe, Sortino, Beta |
| `drawdown.ts` | Drawdown detection + episodes |
| `benchmark.ts` | Capture ratios, tracking error |
| `fire.ts` | FIRE retirement planning |

### Existing (enhanced in R2)

| File | Changes |
|------|---------|
| `risk-metrics.ts` | Add VaR, CVaR, Calmar, Treynor, Omega, capture ratios |
| `monte-carlo.ts` | Keep for client-side quick sim; Python for advanced |

---

## New Chart Components

| Component | File | Used By |
|-----------|------|---------|
| Growth chart | `components/charts/growth-chart.tsx` | Risk, Backtest |
| Fan chart | `components/charts/fan-chart.tsx` | Monte Carlo, FIRE |
| Return histogram | `components/charts/return-histogram.tsx` | Risk, MC |
| Rolling metrics | `components/charts/rolling-metrics-chart.tsx` | Risk |
| Risk contribution | `components/charts/risk-contribution-pie.tsx` | Risk |
| Efficient frontier | `components/charts/efficient-frontier.tsx` | Frontier |
| Weight comparison | `components/charts/weight-comparison.tsx` | Optimise |
| Correlation heatmap | `components/charts/correlation-heatmap.tsx` | Correlations |
| Dendrogram | `components/charts/dendrogram.tsx` | HRP |
| Scenario waterfall | `components/charts/scenario-waterfall.tsx` | Stress test |

---

## Route Map (Final)

```
/analytics                         → Hub page (redesigned with category nav)
/analytics/risk                    → Risk metrics dashboard (enhanced, 5 tabs)
/analytics/backtest                → Portfolio backtesting
/analytics/backtest/compare        → Strategy comparison
/analytics/model-selection         → Cross-validation / model ranking
/analytics/optimize                → Portfolio optimisation (4 strategy tabs)
/analytics/frontier                → Efficient frontier (interactive D3)
/analytics/black-litterman         → Black-Litterman views editor
/analytics/monte-carlo             → Monte Carlo simulation (enhanced)
/analytics/what-if                 → Stress testing (3 tabs, replaces old what-if)
/analytics/factors                 → Factor analysis (FF3, PCA)
/analytics/correlations            → Correlation analysis (heatmap, rolling)
/analytics/tactical                → Tactical allocation signals
/analytics/exposure                → Exposure & ETF X-ray (enhanced)
/tools/fire                        → FIRE calculator
/tools/checker                     → Share Checker
/tools/sentiment                   → Market Sentiment dashboard
/tools/assistant                   → AI Chat (stretch)
/portfolio/[id]/import/ai          → AI Importer
```

---

## Caching Strategy

| Data | TTL | Invalidation |
|------|-----|--------------|
| Portfolio time series | 1 hour | New transaction or price update |
| Benchmark data | 24 hours | Daily cron |
| Risk metrics | 1 hour | Same as portfolio |
| Backtest results | 7 days | Parameter change |
| Optimisation | 24 hours | New data |
| Efficient frontier | 24 hours | Constraint change |
| Factor data | 30 days | Monthly refresh |
| Monte Carlo | Session | Parameter change |
| ETF holdings | 30 days | Monthly refresh |

---

## Performance Targets

| Operation | Target | Strategy |
|-----------|--------|----------|
| Portfolio time series (1Y) | < 200ms | DB query + cache |
| Risk metrics (1Y, 10 assets) | < 500ms | TypeScript server component |
| Backtest (5Y, 5 assets) | < 5s | Python + 7-day cache |
| Optimisation (10 assets) | < 3s | Python + 24h cache |
| Efficient frontier (50 pts) | < 8s | Python + 24h cache |
| MC 1,000 sims | < 3s | Python |
| MC 10,000 sims | < 10s | Python (warn on free tier) |
| Factor regression | < 2s | Python |
| Correlation matrix | < 1s | Python or TypeScript |
| FIRE calculation | < 50ms | TypeScript client-side |
| Stress test (6 scenarios) | < 2s | Python |

---

## Success Criteria

1. All analytics pages functional (13 pages under `/analytics`, 4 under `/tools`)
2. Python functions respond within performance targets (95th percentile)
3. Portfolio data loads correctly (all edge cases: partial data, missing prices, new holdings)
4. Charts render on mobile (responsive at 375px+)
5. Real benchmark data available (ASX200, S&P500 at minimum)
6. Optimisation weights sum to 1.0 ± 0.001
7. Monte Carlo statistics in reasonable ranges
8. Efficient frontier is convex (upward-sloping)
9. FIRE projection matches manual spreadsheet calculation
10. Full build passes cleanly
