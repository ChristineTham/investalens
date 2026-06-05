# R2-P1b: Optimisation, Efficient Frontier & Black-Litterman

## Objective

Implement portfolio optimisation using skfolio: Mean-Variance, Risk Parity, HRP, Efficient Frontier visualisation, and the Black-Litterman model with user views.

## Prerequisites

- R2-P1a complete (Python infrastructure, analytics client)
- Reference: `docs/ADVANCED.md` (Optimisation Models, Efficient Frontier, Black-Litterman)

## Recommended Skills

Invoke these skills for best-practice guidance during this phase:
- **vercel-react-best-practices** — Interactive chart performance (D3 + Recharts)
- **vercel-composition-patterns** — Composable constraint panel UI
- **runtime-cache** — Cache efficient frontier results (expensive computation)

> **Note:** Portfolio optimisation (Mean-Variance, HRP, Black-Litterman) is pure quantitative finance domain. No general skills apply to the Python/skfolio implementation.

---

## Task 1: Mean-Variance Optimisation

**File: `api/python/optimize.py`**

```python
from http.server import BaseHTTPRequestHandler
from skfolio.optimization import MeanRisk, ObjectiveFunction
from skfolio.risk_measures import RiskMeasure
from skfolio.expected_returns import EmpiricalMu, ShrunkMu, EWMu
from skfolio.covariance import EmpiricalCovariance, LedoitWolf, ShrunkCovariance
import pandas as pd
import numpy as np
from utils.response import success_response, error_response, parse_body
from utils.transforms import json_to_returns_df

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            data = parse_body(self)
            returns = json_to_returns_df(data)
            config = data.get("config", {})
            
            # Build objective
            objective = config.get("objective", "max_sharpe")
            risk_measure = config.get("riskMeasure", "variance")
            
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
            
            # Constraints
            min_weight = config.get("minWeight", 0.0)
            max_weight = config.get("maxWeight", 1.0)
            budget = config.get("budget", 1.0)
            
            model = MeanRisk(
                objective_function=obj_map[objective],
                risk_measure=risk_map[risk_measure],
                min_weights=min_weight,
                max_weights=max_weight,
                budget=budget,
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
            
            success_response(self, result)
        except Exception as e:
            error_response(self, 500, str(e))
```

---

## Task 2: Multiple Optimisation Strategies

**File: `api/python/optimize_hrp.py`**

Hierarchical Risk Parity:
```python
from skfolio.optimization import HierarchicalRiskParity
# Fit HRP model, return weights and dendrogram data
```

**File: `api/python/optimize_risk_parity.py`**

Risk Budgeting / Risk Parity:
```python
from skfolio.optimization import RiskBudgeting
# Accept risk budgets per asset, return weights
```

**File: `api/python/optimize_cvar.py`**

CVaR optimisation (minimise tail risk):
```python
from skfolio.optimization import MeanRisk
# Use RiskMeasure.CVAR, return weights
```

---

## Task 3: Efficient Frontier

**File: `api/python/efficient_frontier.py`**

Calculate the efficient frontier curve:
```python
from skfolio.optimization import MeanRisk
from skfolio.population import Population
import numpy as np

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        data = parse_body(self)
        returns = json_to_returns_df(data)
        config = data.get("config", {})
        
        n_points = config.get("nPoints", 50)
        risk_measure = config.get("riskMeasure", "variance")
        
        # Generate frontier points
        frontier_points = []
        target_returns = np.linspace(
            returns.mean().min(),
            returns.mean().max(),
            n_points
        )
        
        for target in target_returns:
            model = MeanRisk(
                objective_function=ObjectiveFunction.MINIMIZE_RISK,
                risk_measure=risk_map[risk_measure],
                min_return=float(target),
                min_weights=config.get("minWeight", 0.0),
                max_weights=config.get("maxWeight", 1.0),
            )
            try:
                model.fit(returns)
                portfolio = model.predict(returns)
                frontier_points.append({
                    "return": float(portfolio.mean()) * 252,
                    "risk": float(portfolio.annualized_volatility()),
                    "sharpe": float(portfolio.sharpe_ratio()),
                    "weights": dict(zip(returns.columns.tolist(), model.weights_.tolist())),
                })
            except:
                continue
        
        # Individual assets
        assets = []
        for col in returns.columns:
            assets.append({
                "name": col,
                "return": float(returns[col].mean() * 252),
                "risk": float(returns[col].std() * np.sqrt(252)),
            })
        
        result = {
            "frontier": frontier_points,
            "assets": assets,
            "maxSharpe": max(frontier_points, key=lambda x: x["sharpe"]) if frontier_points else None,
            "minRisk": min(frontier_points, key=lambda x: x["risk"]) if frontier_points else None,
        }
        success_response(self, result)
```

---

## Task 4: Black-Litterman Model

**File: `api/python/black_litterman.py`**

```python
from skfolio.optimization import MeanRisk
from skfolio.prior import BlackLitterman, EmpiricalPrior
import numpy as np

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        data = parse_body(self)
        returns = json_to_returns_df(data)
        views = data.get("views", [])
        config = data.get("config", {})
        
        # Parse views into P (pick matrix) and Q (expected returns)
        n_assets = len(returns.columns)
        P = np.zeros((len(views), n_assets))
        Q = np.zeros(len(views))
        
        for i, view in enumerate(views):
            if view["type"] == "absolute":
                # "Asset X will return 10%"
                asset_idx = returns.columns.get_loc(view["asset"])
                P[i, asset_idx] = 1.0
                Q[i] = view["value"]
            elif view["type"] == "relative":
                # "Asset X will outperform Asset Y by 5%"
                long_idx = returns.columns.get_loc(view["longAsset"])
                short_idx = returns.columns.get_loc(view["shortAsset"])
                P[i, long_idx] = 1.0
                P[i, short_idx] = -1.0
                Q[i] = view["value"]
        
        tau = config.get("tau", 0.05)
        risk_aversion = config.get("riskAversion", 2.5)
        
        prior = BlackLitterman(
            views=Q,
            picking_matrix=P,
            tau=tau,
            risk_aversion=risk_aversion,
        )
        
        model = MeanRisk(
            objective_function=ObjectiveFunction.MAXIMIZE_RATIO,
            prior_estimator=prior,
        )
        
        model.fit(returns)
        
        result = {
            "weights": dict(zip(returns.columns.tolist(), model.weights_.tolist())),
            "posteriorReturns": dict(zip(returns.columns.tolist(), prior.expected_returns_.tolist())),
            "priorReturns": dict(zip(returns.columns.tolist(), EmpiricalPrior().fit(returns).expected_returns_.tolist())),
            "viewsImpact": [],  # How each view shifted weights
        }
        
        success_response(self, result)
```

---

## Task 5: Optimisation UI

**File: `src/app/(dashboard)/analytics/optimize/page.tsx`**

Optimisation page:
- Portfolio selector
- Strategy tabs: Mean-Variance | HRP | Risk Parity | Black-Litterman
- Constraint panel:
  - Min/max weight per asset (slider or input)
  - Sector constraints
  - Turnover constraint
  - Short-selling toggle
- Risk measure selector (Variance, CVaR, Max DD, Semi-Variance, CDaR)
- Objective selector (Max Sharpe, Min Risk, Max Return, Risk Budget)
- Run button
- Results:
  - Recommended weights (horizontal bar chart)
  - Current vs Recommended comparison table
  - Metrics comparison (current vs optimal)
  - Trades needed to rebalance

**File: `src/app/(dashboard)/analytics/frontier/page.tsx`**

Efficient Frontier page:
- Interactive scatter plot (risk on X, return on Y)
- Frontier curve with hover showing weights at each point
- Individual assets plotted as dots
- Max Sharpe point highlighted (star)
- Current portfolio plotted (diamond)
- Click on frontier point to see detailed allocation

**File: `src/app/(dashboard)/analytics/black-litterman/page.tsx`**

Black-Litterman page:
- Views editor:
  - Add view button
  - For each view: type (absolute/relative), asset(s), expected value, confidence
  - Remove view button
- Parameters: tau, risk aversion
- Run button
- Results:
  - Prior vs Posterior expected returns (side-by-side bar chart)
  - Optimal weights under BL
  - Sensitivity analysis (how weight changes with confidence)

---

## Task 6: Chart Components

**File: `src/components/charts/efficient-frontier.tsx`**

Interactive scatter + line chart:
- D3.js for the frontier curve
- Recharts for individual asset dots
- Tooltip on hover showing weights
- Click handler for point selection

**File: `src/components/charts/weight-comparison.tsx`**

Horizontal bar chart comparing current vs recommended weights.

**File: `src/components/charts/dendrogram.tsx`**

Dendrogram visualisation for HRP (shows asset clustering).

---

## Deliverables Checklist

- [ ] Mean-Variance optimisation endpoint (5 objectives × 5 risk measures)
- [ ] HRP optimisation endpoint
- [ ] Risk Parity / Risk Budgeting endpoint
- [ ] CVaR optimisation endpoint
- [ ] Efficient Frontier endpoint (n-point curve + assets + special points)
- [ ] Black-Litterman endpoint (absolute + relative views)
- [ ] Optimisation UI page (strategy tabs, constraints, results)
- [ ] Efficient Frontier interactive chart
- [ ] Black-Litterman views editor + results
- [ ] Weight comparison chart
- [ ] Dendrogram chart (for HRP)
- [ ] Rebalancing trade calculator

## Notes for the Agent

- skfolio's API may differ slightly between versions — check docs for v0.4+
- All Python endpoints should handle the case where there are too few data points (< 30 days) gracefully
- Efficient frontier calculation is expensive — cache for 1 hour per portfolio
- Black-Litterman tau typically 0.025–0.05; risk aversion 1–5
- Constraint validation: max_weight >= min_weight, sum of min_weights <= budget
- HRP doesn't require expected returns estimation (advantage over MV)
