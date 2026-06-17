# R2-P1b: Risk Metrics Enhancement & Backtesting

## Objective

Transform `/analytics/risk` from basic to comprehensive (matching Portfolio Visualizer quality) and implement the historical backtesting engine with walk-forward analysis and strategy comparison.

## Prerequisites

- R2-P1a complete (analytics data service, benchmark data, Python infrastructure)
- Reference: `docs/ADVANCED.md` (Risk Metrics, Backtesting)

## Recommended Skills

- **vercel-react-best-practices** — Chart component performance, lazy loading
- **runtime-cache** — Cache backtest results (expensive computation)
- **building-components** — Tab-based risk dashboard composition

---

## Task 1: Enhanced Risk Metrics (TypeScript)

**File: `lib/calculations/risk-metrics.ts`** (extend existing)

Add these metrics to the existing module:

| Metric | Formula | Category |
|--------|---------|----------|
| Calmar Ratio | CAGR / Max Drawdown | Risk-adjusted |
| Treynor Ratio | (Return − Rf) / Beta | Risk-adjusted |
| Omega Ratio | P(gain) / P(loss) weighted | Risk-adjusted |
| VaR (5%) | Historical, Analytical | Tail risk |
| CVaR (5%) | Expected Shortfall | Tail risk |
| Upside Capture | Portfolio up / Benchmark up | Relative |
| Downside Capture | Portfolio down / Benchmark down | Relative |
| R² | Coefficient of determination | Factor exposure |
| Tracking Error | Std(active returns) | Relative |
| Skewness | Distribution asymmetry | Distribution |
| Kurtosis | Tail heaviness | Distribution |

---

## Task 2: Enhanced Risk Dashboard Page

**File: `app/(dashboard)/analytics/risk/page.tsx`** (rewrite)

Replace current basic page with comprehensive dashboard:

```
/analytics/risk
├── Header (title, portfolio selector, period selector, benchmark selector)
├── Summary Cards (4-up: Return, Volatility, Sharpe, Max Drawdown)
├── Tabs:
│   ├── Overview — key metrics table + growth chart (portfolio vs benchmark)
│   ├── Drawdowns — drawdown chart + table of episodes (start, trough, recovery, depth)
│   ├── Distribution — return histogram + skew/kurtosis stats + normal overlay
│   ├── Rolling — rolling Sharpe, Sortino, Beta over time (12-month window)
│   └── Decomposition — risk contribution by holding (marginal risk pie chart)
└── Export (CSV)
```

**Fixes from current page:**
- Replace hardcoded 8% benchmark with real benchmark selector
- Use proper portfolio value calculation (qty × price, summed)
- Add multiple time period options (1Y, 3Y, 5Y, Max)
- Add per-holding risk contribution breakdown

---

## Task 3: Chart Components for Risk

**File: `components/charts/growth-chart.tsx`**

Portfolio growth vs benchmark line chart (Recharts). Supports log scale toggle.

**File: `components/charts/return-histogram.tsx`**

Histogram of daily/monthly returns with normal distribution overlay.

**File: `components/charts/rolling-metrics-chart.tsx`**

Multi-line chart showing rolling Sharpe, Sortino, or Beta over time.

**File: `components/charts/risk-contribution-pie.tsx`**

Pie/donut chart showing each holding's contribution to portfolio risk.

---

## Task 4: Backtesting Engine (Python)

**File: `api/analytics/backtest.py`**

```python
from fastapi import FastAPI, Request
from skfolio.optimization import MeanRisk, EqualWeighted, HierarchicalRiskParity
from skfolio.model_selection import WalkForward
import pandas as pd
import numpy as np
from utils.transforms import json_to_returns_df, make_serializable
from utils.response import create_app, error_response

app = create_app()

@app.post("/api/analytics/backtest")
async def backtest(request: Request):
    data = await request.json()
    returns = json_to_returns_df(data)
    config = data.get("config", {})

    strategy = config.get("strategy", "equal_weighted")
    rebalance_freq = config.get("rebalanceFrequency", "quarterly")

    # Map strategy to skfolio model
    strategy_map = {
        "equal_weighted": EqualWeighted(),
        "mean_variance": MeanRisk(),
        "min_variance": MeanRisk(objective_function="MINIMIZE_RISK"),
        "max_sharpe": MeanRisk(objective_function="MAXIMIZE_RATIO"),
        "hrp": HierarchicalRiskParity(),
    }

    model = strategy_map.get(strategy)
    if not model:
        error_response(400, f"Unknown strategy: {strategy}")

    # Walk-forward backtest
    train_days = {"monthly": 252, "quarterly": 252, "annually": 504}
    test_days = {"monthly": 21, "quarterly": 63, "annually": 252}

    cv = WalkForward(
        train_size=train_days.get(rebalance_freq, 252),
        test_size=test_days.get(rebalance_freq, 63),
    )

    # Run walk-forward
    equity_curve = []
    weights_history = []
    rebalance_dates = []

    for train_idx, test_idx in cv.split(returns):
        train_returns = returns.iloc[train_idx]
        test_returns = returns.iloc[test_idx]
        model.fit(train_returns)
        portfolio = model.predict(test_returns)

        # Track results
        equity_curve.extend(portfolio.returns.tolist())
        weights_history.append({
            "date": returns.index[test_idx[0]].isoformat(),
            "weights": dict(zip(returns.columns.tolist(), model.weights_.tolist()))
        })
        rebalance_dates.append(returns.index[test_idx[0]].isoformat())

    # Calculate metrics from equity curve
    eq = np.array(equity_curve)
    cumulative = np.cumprod(1 + eq)
    ann_return = (cumulative[-1] ** (252 / len(eq))) - 1
    ann_vol = eq.std() * np.sqrt(252)
    sharpe = ann_return / ann_vol if ann_vol > 0 else 0

    # Max drawdown
    peak = np.maximum.accumulate(cumulative)
    drawdown = (cumulative - peak) / peak
    max_dd = drawdown.min()

    result = {
        "annualizedReturn": float(ann_return),
        "annualizedVolatility": float(ann_vol),
        "sharpeRatio": float(sharpe),
        "maxDrawdown": float(max_dd),
        "calmarRatio": float(ann_return / abs(max_dd)) if max_dd != 0 else 0,
        "sortinoRatio": float(ann_return / (eq[eq < 0].std() * np.sqrt(252))) if len(eq[eq < 0]) > 0 else 0,
        "equityCurve": cumulative.tolist(),
        "dates": [d.isoformat() for d in returns.index[-len(eq):]],
        "drawdownSeries": drawdown.tolist(),
        "weightsHistory": weights_history,
        "rebalanceDates": rebalance_dates,
        "assets": returns.columns.tolist(),
    }

    return make_serializable(result)
```

---

## Task 5: Backtest Comparison

**File: `api/analytics/backtest_compare.py`**

Run multiple strategies simultaneously and return comparison metrics:

- Accept array of strategy configs
- Return per-strategy: return, vol, Sharpe, max DD, Calmar, Sortino
- Include rank by chosen metric
- Paired t-test on returns for statistical significance

---

## Task 6: Walk-Forward Analysis

**File: `api/analytics/walk_forward.py`**

Detailed walk-forward with per-window breakdown:

- Show in-sample vs out-of-sample performance per window
- Detect overfitting (large gap between IS and OOS Sharpe)
- Return per-window metrics table

---

## Task 7: Model Selection / Cross-Validation

**File: `api/analytics/cross_validate.py`**

```python
from skfolio.model_selection import WalkForward, CombinatorialPurgedCV, cross_val_predict
from skfolio.optimization import MeanRisk, HierarchicalRiskParity, EqualWeighted

# Compare models using proper CV:
# 1. Walk-Forward (sequential)
# 2. Combinatorial Purged CV (non-sequential, prevents leakage)
# Return ranked results per model
```

---

## Task 8: Backtesting UI

**File: `app/(dashboard)/analytics/backtest/page.tsx`**

```
/analytics/backtest
├── Config Panel:
│   ├── Strategy selector (Equal Weight, Mean-Variance, HRP, Min Variance, Max Sharpe, Risk Parity)
│   ├── Date range (start/end or preset: 3Y, 5Y, 10Y)
│   ├── Rebalancing frequency (monthly, quarterly, annually)
│   ├── Benchmark selector
│   └── [Run Backtest] button
├── Results (shown after run):
│   ├── Summary cards (CAGR, Volatility, Sharpe, Max DD, Calmar, Sortino)
│   ├── Equity curve chart (portfolio + benchmark overlaid)
│   ├── Drawdown chart
│   ├── Annual returns bar chart (side-by-side with benchmark)
│   ├── Weight allocation over time (stacked area)
│   ├── Rolling Sharpe ratio
│   └── Metrics comparison table
└── Compare button → /analytics/backtest/compare
```

**File: `app/(dashboard)/analytics/backtest/compare/page.tsx`**

Side-by-side comparison: overlaid equity curves + ranked metrics table.

**File: `app/(dashboard)/analytics/model-selection/page.tsx`**

Model comparison via cross-validation: table + box plots of OOS returns.

---

## Deliverables Checklist

- [ ] Enhanced risk metrics (VaR, CVaR, capture ratios, Omega, Calmar, etc.)
- [ ] Risk dashboard rewrite (5 tabs: Overview, Drawdowns, Distribution, Rolling, Decomposition)
- [ ] Growth chart component (portfolio vs benchmark)
- [ ] Return histogram component
- [ ] Rolling metrics chart component
- [ ] Risk contribution pie component
- [ ] Backtest Python endpoint (walk-forward, 5+ strategies)
- [ ] Backtest comparison endpoint
- [ ] Walk-forward analysis endpoint
- [ ] Cross-validation / model selection endpoint
- [ ] Backtest UI page (config + results)
- [ ] Backtest comparison page
- [ ] Model selection page

## Performance Targets

| Operation | Target | Strategy |
|-----------|--------|----------|
| Risk metrics (1Y, 10 assets) | < 500ms | TypeScript server component |
| Backtest (5Y, 5 assets) | < 5s | Python + 7-day cache |
| Strategy comparison (5 models) | < 10s | Python, async pattern |
| Walk-forward (5Y) | < 8s | Python + cache |

## Notes for the Agent

- Risk page is a server component — compute metrics server-side, no Python needed
- Backtest uses Python/skfolio for walk-forward (more robust than hand-rolled)
- All equity curves should be rebased to 100 (or initial value) for comparison
- Cache backtest results for 7 days — they rarely change unless new data added
- Handle case where portfolio has < 1Y of data: show "Insufficient data" message
- Annual returns table: show calendar year returns (Jan–Dec) for each year
