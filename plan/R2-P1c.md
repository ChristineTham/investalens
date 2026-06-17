# R2-P1c: Portfolio Optimisation, Efficient Frontier & Estimation Methods

## Objective

Implement portfolio optimisation (Mean-Variance, HRP, Risk Parity, CVaR), the efficient frontier visualisation, Black-Litterman model, and advanced return/covariance estimation methods.

## Prerequisites

- R2-P1b complete (risk metrics, backtesting working)
- Reference: `docs/ADVANCED.md` (Optimisation, Efficient Frontier, Black-Litterman, Estimation)

## Recommended Skills

- **vercel-react-best-practices** — Interactive chart performance (D3 frontier curve)
- **vercel-composition-patterns** — Composable constraint panel UI
- **runtime-cache** — Cache frontier results (expensive computation)

---

## Task 1: Mean-Variance Optimisation

**File: `api/analytics/optimize.py`** (replace existing placeholder)

```python
from fastapi import FastAPI, Request
from skfolio.optimization import MeanRisk, ObjectiveFunction
from skfolio.risk_measures import RiskMeasure
import pandas as pd
import numpy as np
from utils.transforms import json_to_returns_df, make_serializable
from utils.response import create_app, error_response

app = create_app()

@app.post("/api/analytics/optimize")
async def optimize(request: Request):
    data = await request.json()
    returns = json_to_returns_df(data)
    config = data.get("config", {})

    objective = config.get("objective", "max_sharpe")
    risk_measure = config.get("riskMeasure", "variance")
    min_weight = config.get("minWeight", 0.0)
    max_weight = config.get("maxWeight", 1.0)

    obj_map = {
        "max_sharpe": ObjectiveFunction.MAXIMIZE_RATIO,
        "min_risk": ObjectiveFunction.MINIMIZE_RISK,
        "max_return": ObjectiveFunction.MAXIMIZE_RETURN,
    }
    risk_map = {
        "variance": RiskMeasure.VARIANCE,
        "cvar": RiskMeasure.CVAR,
        "max_drawdown": RiskMeasure.MAX_DRAWDOWN,
        "semi_variance": RiskMeasure.SEMI_VARIANCE,
        "cdar": RiskMeasure.CDAR,
    }

    model = MeanRisk(
        objective_function=obj_map[objective],
        risk_measure=risk_map[risk_measure],
        min_weights=min_weight,
        max_weights=max_weight,
    )
    model.fit(returns)
    portfolio = model.predict(returns)

    result = {
        "weights": dict(zip(returns.columns.tolist(), model.weights_.tolist())),
        "expectedReturn": float(portfolio.mean()),
        "expectedRisk": float(portfolio.annualized_volatility()),
        "sharpeRatio": float(portfolio.sharpe_ratio()),
        "metrics": {
            "cvar95": float(portfolio.cvar(alpha=0.05)),
            "maxDrawdown": float(portfolio.max_drawdown()),
            "sortinoRatio": float(portfolio.sortino_ratio()),
        },
    }
    return make_serializable(result)
```

---

## Task 2: Additional Optimisation Strategies

**File: `api/analytics/optimize_hrp.py`**

Hierarchical Risk Parity (HRP) — no return estimation needed:

```python
from skfolio.optimization import HierarchicalRiskParity
# Returns weights + dendrogram data for visualisation
```

**File: `api/analytics/optimize_risk_parity.py`**

Risk Budgeting / Risk Parity:

```python
from skfolio.optimization import RiskBudgeting
# Accept risk budgets per asset, return equal-risk-contribution weights
```

Additional strategies to support:
- HERC (Hierarchical Equal Risk Contribution)
- Maximum Diversification
- Inverse Volatility (custom, no skfolio)
- Kelly Criterion (custom, geometric growth optimal)

---

## Task 3: Efficient Frontier

**File: `api/analytics/frontier.py`**

Calculate the efficient frontier curve (50 points by default):

```python
from fastapi import FastAPI, Request
from skfolio.optimization import MeanRisk, ObjectiveFunction
from skfolio.risk_measures import RiskMeasure
import numpy as np
from utils.transforms import json_to_returns_df, make_serializable
from utils.response import create_app

app = create_app()

@app.post("/api/analytics/frontier")
async def frontier(request: Request):
    data = await request.json()
    returns = json_to_returns_df(data)
    config = data.get("config", {})
    n_points = config.get("nPoints", 50)

    # Generate frontier by varying target return
    target_returns = np.linspace(
        returns.mean().min() * 252,
        returns.mean().max() * 252,
        n_points
    )

    frontier_points = []
    for target in target_returns:
        try:
            model = MeanRisk(
                objective_function=ObjectiveFunction.MINIMIZE_RISK,
                min_return=float(target / 252),
                min_weights=config.get("minWeight", 0.0),
                max_weights=config.get("maxWeight", 1.0),
            )
            model.fit(returns)
            portfolio = model.predict(returns)
            frontier_points.append({
                "return": float(portfolio.mean() * 252),
                "risk": float(portfolio.annualized_volatility()),
                "sharpe": float(portfolio.sharpe_ratio()),
                "weights": dict(zip(returns.columns.tolist(), model.weights_.tolist())),
            })
        except Exception:
            continue

    # Individual assets for reference
    assets = [{
        "name": col,
        "return": float(returns[col].mean() * 252),
        "risk": float(returns[col].std() * np.sqrt(252)),
    } for col in returns.columns]

    return make_serializable({
        "frontier": frontier_points,
        "assets": assets,
        "maxSharpe": max(frontier_points, key=lambda x: x["sharpe"]) if frontier_points else None,
        "minRisk": min(frontier_points, key=lambda x: x["risk"]) if frontier_points else None,
    })
```

---

## Task 4: Black-Litterman Model

**File: `api/analytics/black_litterman.py`**

```python
from skfolio.optimization import MeanRisk, ObjectiveFunction
from skfolio.prior import BlackLitterman, EmpiricalPrior
import numpy as np

# Accept views: absolute ("CBA returns 12%") or relative ("CBA outperforms BHP by 5%")
# Build pick matrix P and view vector Q
# Return: posterior returns, optimal weights, prior vs posterior comparison
```

Views format:
```json
{
  "views": [
    { "type": "absolute", "asset": "CBA.AX", "value": 0.12, "confidence": 0.8 },
    { "type": "relative", "longAsset": "CBA.AX", "shortAsset": "BHP.AX", "value": 0.05, "confidence": 0.6 }
  ],
  "tau": 0.05,
  "riskAversion": 2.5
}
```

---

## Task 5: Return & Covariance Estimation

**File: `api/analytics/estimate_returns.py`**

Expose skfolio return estimators:

| Method | Class | When to Use |
|--------|-------|-------------|
| Empirical | `EmpiricalMu` | Baseline, long history |
| Shrunk | `ShrunkMu` | Short history, unstable means |
| EW (Exponential) | `EWMu` | Regime changes, recent data matters |
| Equilibrium | `EquilibriumMu` | CAPM-implied, no strong views |

**File: `api/analytics/estimate_covariance.py`**

Expose skfolio covariance estimators:

| Method | Class | When to Use |
|--------|-------|-------------|
| Empirical | `EmpiricalCovariance` | Baseline, large sample |
| Ledoit-Wolf | `LedoitWolf` | Default recommended, robust |
| OAS | `OAS` | Similar to LW, different shrinkage |
| Denoised | `DenoiseCovariance` | Remove noise from sample cov |
| Detoned | `DetoneCovariance` | Remove market mode |
| Exponential | `EWCovariance` | Regime changes |
| Gerber | `GerberCovariance` | Non-linear co-movement |
| Graphical Lasso | `GraphicalLassoCV` | Sparse, many assets |

Return: estimated covariance matrix + correlation heatmap data.

---

## Task 6: Optimisation UI

**File: `app/(dashboard)/analytics/optimize/page.tsx`**

```
/analytics/optimize
├── Strategy Tabs: Mean-Variance | HRP | Risk Parity | Black-Litterman
├── Constraint Panel:
│   ├── Min/max weight per asset (sliders)
│   ├── Sector constraints (grouped)
│   ├── Short-selling toggle
│   ├── Risk measure selector
│   └── Objective selector (Max Sharpe, Min Risk, Max Return)
├── [Run Optimisation] button
├── Results:
│   ├── Recommended weights (horizontal bar chart)
│   ├── Current vs Recommended comparison table
│   ├── Metrics comparison (current vs optimal: return, vol, Sharpe, DD)
│   └── Trades needed to rebalance
└── Estimation method selector (sidebar):
    ├── Return estimator (Empirical, Shrunk, EW, Equilibrium)
    └── Covariance estimator (Ledoit-Wolf, OAS, Denoised, etc.)
```

**File: `app/(dashboard)/analytics/frontier/page.tsx`**

```
/analytics/frontier
├── Interactive scatter plot (D3):
│   ├── Efficient frontier curve
│   ├── Individual assets as dots
│   ├── Max Sharpe point (star marker)
│   ├── Min Variance point (leftmost)
│   ├── Current portfolio (diamond marker)
│   └── Capital Market Line (from risk-free rate)
├── Hover: show allocation weights at any frontier point
├── Click: compare selected point vs current portfolio
└── Constraint toggles (update frontier in real-time)
```

**File: `app/(dashboard)/analytics/black-litterman/page.tsx`**

Views editor + results:
- Add/remove views (absolute or relative)
- Confidence sliders per view
- Prior vs Posterior expected returns bar chart
- Optimal weights under BL

---

## Task 7: Chart Components

**File: `components/charts/efficient-frontier.tsx`**

D3-based interactive frontier curve with Recharts dots for assets.

**File: `components/charts/weight-comparison.tsx`**

Horizontal bar chart: current weights vs recommended (paired bars).

**File: `components/charts/correlation-heatmap.tsx`**

D3 heatmap showing asset-asset correlations (-1 red to +1 blue).

**File: `components/charts/dendrogram.tsx`**

D3 dendrogram for HRP (shows hierarchical asset clustering).

---

## Deliverables Checklist

- [ ] Mean-Variance optimisation endpoint (3 objectives × 5 risk measures)
- [ ] HRP optimisation endpoint
- [ ] Risk Parity / Risk Budgeting endpoint
- [ ] Efficient Frontier endpoint (n-point curve + assets + special points)
- [ ] Black-Litterman endpoint (absolute + relative views)
- [ ] Return estimation endpoint (4 methods)
- [ ] Covariance estimation endpoint (8 methods)
- [ ] Optimisation UI page (strategy tabs, constraints, results)
- [ ] Efficient Frontier interactive chart (D3)
- [ ] Black-Litterman views editor + results
- [ ] Weight comparison chart
- [ ] Correlation heatmap
- [ ] Dendrogram chart (HRP)
- [ ] Rebalancing trade calculator

## Performance Targets

| Operation | Target | Strategy |
|-----------|--------|----------|
| Optimisation (10 assets) | < 3s | Python + 24h cache |
| Efficient frontier (50 pts) | < 8s | Python + 24h cache |
| Black-Litterman | < 2s | Python, lightweight |
| Covariance estimation | < 1s | Python, cached with data |

## Notes for the Agent

- skfolio API may differ between versions — verify against docs
- Handle < 30 days of data gracefully: show "Insufficient data" message
- Frontier is expensive — cache for 24 hours per portfolio + constraints hash
- Black-Litterman tau typically 0.025–0.05; risk aversion 1–5
- Constraint validation: max_weight ≥ min_weight, sum of min_weights ≤ 1
- HRP doesn't require return estimation (advantage over MV)
- All optimisation weights must sum to 1.0 ± 0.001
