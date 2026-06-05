# R2-P1c: Monte Carlo, Estimation Methods & Distributions

## Objective

Implement Monte Carlo simulation (bootstrap, parametric, copula-based), advanced return/covariance estimation methods, and distribution fitting using skfolio.

## Prerequisites

- R2-P1b complete (optimisation working)
- Reference: `docs/ADVANCED.md` (Monte Carlo, Estimation Methods, Distributions)

## Recommended Skills

Invoke these skills for best-practice guidance during this phase:
- **vercel-react-best-practices** — Fan chart and histogram component performance
- **runtime-cache** — Cache MC simulation results, copula fitting

> **Note:** Monte Carlo simulation, covariance estimation, distribution fitting, and copula models are pure statistical/data science domain. No general skills apply to the Python implementation.

---

## Task 1: Monte Carlo Simulation

**File: `api/python/monte_carlo.py`**

```python
from http.server import BaseHTTPRequestHandler
from skfolio.optimization import MeanRisk
import pandas as pd
import numpy as np
from utils.response import success_response, error_response, parse_body
from utils.transforms import json_to_returns_df

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        data = parse_body(self)
        returns = json_to_returns_df(data)
        config = data.get("config", {})
        
        method = config.get("method", "bootstrap")
        n_simulations = min(config.get("nSimulations", 1000), 10000)
        horizon_days = config.get("horizonDays", 252)
        weights = np.array(config.get("weights", [1.0 / len(returns.columns)] * len(returns.columns)))
        initial_value = config.get("initialValue", 100000)
        
        if method == "bootstrap":
            # Resample historical returns with replacement
            simulated_paths = []
            for _ in range(n_simulations):
                sampled_indices = np.random.choice(len(returns), size=horizon_days, replace=True)
                sim_returns = returns.iloc[sampled_indices].values @ weights
                path = initial_value * np.cumprod(1 + sim_returns)
                simulated_paths.append(path.tolist())
                
        elif method == "parametric":
            # Assume multivariate normal
            mu = returns.mean().values
            cov = returns.cov().values
            simulated_paths = []
            for _ in range(n_simulations):
                sim_asset_returns = np.random.multivariate_normal(mu, cov, size=horizon_days)
                sim_returns = sim_asset_returns @ weights
                path = initial_value * np.cumprod(1 + sim_returns)
                simulated_paths.append(path.tolist())
                
        elif method == "copula":
            # Fit copula to capture tail dependencies
            from skfolio.distribution import CopulaDistribution, StudentTCopula
            dist = CopulaDistribution(copula=StudentTCopula())
            dist.fit(returns.values)
            simulated_paths = []
            for _ in range(n_simulations):
                sim_asset_returns = dist.sample(horizon_days)
                sim_returns = sim_asset_returns @ weights
                path = initial_value * np.cumprod(1 + sim_returns)
                simulated_paths.append(path.tolist())
        
        # Calculate statistics
        final_values = [path[-1] for path in simulated_paths]
        percentiles = [5, 10, 25, 50, 75, 90, 95]
        
        result = {
            "paths": simulated_paths[:100],  # Send first 100 for visualisation
            "statistics": {
                "mean": float(np.mean(final_values)),
                "median": float(np.median(final_values)),
                "std": float(np.std(final_values)),
                "min": float(np.min(final_values)),
                "max": float(np.max(final_values)),
                "percentiles": {str(p): float(np.percentile(final_values, p)) for p in percentiles},
                "probLoss": float(np.mean(np.array(final_values) < initial_value)),
                "var95": float(np.percentile(final_values, 5)),
                "cvar95": float(np.mean([v for v in final_values if v <= np.percentile(final_values, 5)])),
            },
            "fanChart": {
                # Percentile bands at each time step
                "dates": list(range(horizon_days)),
                "p5": np.percentile(simulated_paths, 5, axis=0).tolist(),
                "p25": np.percentile(simulated_paths, 25, axis=0).tolist(),
                "p50": np.percentile(simulated_paths, 50, axis=0).tolist(),
                "p75": np.percentile(simulated_paths, 75, axis=0).tolist(),
                "p95": np.percentile(simulated_paths, 95, axis=0).tolist(),
            },
            "histogram": {
                "bins": np.histogram(final_values, bins=50)[1].tolist(),
                "counts": np.histogram(final_values, bins=50)[0].tolist(),
            },
        }
        
        success_response(self, result)
```

---

## Task 2: Return Estimation Methods

**File: `api/python/estimate_returns.py`**

Expose all skfolio return estimators:
```python
from skfolio.expected_returns import (
    EmpiricalMu,
    ShrunkMu,
    EWMu,
    ShrunkMuMethods,
    EquilibriumMu,
)

# Methods available:
# 1. Empirical (historical mean)
# 2. Shrunk (James-Stein toward grand mean)
# 3. Exponentially Weighted (recent data weighted more)
# 4. Equilibrium (CAPM implied)
# 5. Custom blend (weighted average of methods)
```

Accept `method` parameter and return estimated expected returns per asset.

---

## Task 3: Covariance Estimation Methods

**File: `api/python/estimate_covariance.py`**

Expose all skfolio covariance estimators:
```python
from skfolio.covariance import (
    EmpiricalCovariance,
    LedoitWolf,
    ShrunkCovariance,
    OAS,
    DenoiseCovariance,
    DetoneCovariance,
    EWCovariance,
    GerberCovariance,
    GraphicalLassoCV,
    ImpliedCovariance,
)

# Methods available:
# 1. Empirical (sample covariance)
# 2. Ledoit-Wolf (optimal shrinkage)
# 3. Oracle Approximating Shrinkage (OAS)
# 4. Denoised (Random Matrix Theory)
# 5. Detoned (remove market mode)
# 6. Exponentially Weighted
# 7. Gerber Statistic (co-movement)
# 8. Graphical Lasso (sparse)
# 9. Implied (option-derived)
# 10. Custom shrinkage target
# 11. Nested (hierarchical estimation)
```

Return covariance matrix as 2D array + correlation heatmap data.

---

## Task 4: Distribution Fitting

**File: `api/python/fit_distribution.py`**

Fit univariate distributions to asset returns:
```python
from scipy import stats
import numpy as np

DISTRIBUTIONS = {
    "normal": stats.norm,
    "student_t": stats.t,
    "skew_normal": stats.skewnorm,
    "johnson_su": stats.johnsonsu,
}

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        data = parse_body(self)
        returns = np.array(data["returns"])
        
        results = {}
        for name, dist in DISTRIBUTIONS.items():
            params = dist.fit(returns)
            ks_stat, ks_pvalue = stats.kstest(returns, name, args=params)
            results[name] = {
                "params": [float(p) for p in params],
                "ks_statistic": float(ks_stat),
                "ks_pvalue": float(ks_pvalue),
                "aic": float(-2 * np.sum(dist.logpdf(returns, *params)) + 2 * len(params)),
                "bic": float(-2 * np.sum(dist.logpdf(returns, *params)) + len(params) * np.log(len(returns))),
            }
        
        # Best fit by AIC
        best = min(results, key=lambda k: results[k]["aic"])
        
        success_response(self, {"distributions": results, "best": best})
```

**File: `api/python/fit_copula.py`**

Fit copula models to joint returns:
```python
# Copula types from skfolio:
# 1. Gaussian Copula
# 2. Student-t Copula
# 3. Clayton Copula
# 4. Gumbel Copula
# 5. Frank Copula
# 6. Vine Copula (C-vine, D-vine)
```

Return copula parameters, tail dependence coefficients, and goodness-of-fit.

---

## Task 5: Prior Models

**File: `api/python/prior_models.py`**

Implement skfolio prior estimators:
```python
from skfolio.prior import (
    EmpiricalPrior,
    BlackLitterman,
    FactorModel,
    LoadingMatrixFactor,
)

# Prior models:
# 1. Empirical Prior (sample moments)
# 2. Black-Litterman (investor views) — already in R2-P1b
# 3. Factor Model Prior (Fama-French or custom factors)
# 4. Loading Matrix Prior (PCA-based)
# 5. Equilibrium Prior (CAPM market equilibrium)
# 6. Entropy Pooling (flexible view specification)
```

---

## Task 6: Monte Carlo UI

**File: `src/app/(dashboard)/analytics/monte-carlo/page.tsx`**

Monte Carlo simulation page:
- Method selector (Bootstrap, Parametric, Copula-based)
- Parameters:
  - Number of simulations (100–10,000)
  - Horizon (1M, 3M, 6M, 1Y, 2Y, 5Y)
  - Initial investment value
  - Confidence levels
- Current portfolio weights (pre-filled from portfolio)
- Run button
- Results:
  - Fan chart (percentile bands over time)
  - Final value histogram
  - Statistics table (mean, median, VaR, CVaR, prob of loss)
  - Scenario analysis: probability of reaching target value

**File: `src/components/charts/fan-chart.tsx`**

Area chart showing percentile bands (5th, 25th, 50th, 75th, 95th).

**File: `src/components/charts/histogram.tsx`**

Histogram with overlaid density curve for final values distribution.

---

## Task 7: Estimation Methods UI

**File: `src/app/(dashboard)/analytics/estimation/page.tsx`**

Estimation methods comparison page:
- Select return estimator (5 methods)
- Select covariance estimator (11 methods)
- Show estimated returns as bar chart
- Show correlation heatmap
- Compare how different estimators change optimal weights

**File: `src/components/charts/correlation-heatmap.tsx`**

D3.js heatmap showing asset-asset correlations. Color scale from -1 (red) to +1 (blue).

---

## Deliverables Checklist

- [ ] Monte Carlo endpoint (bootstrap, parametric, copula)
- [ ] Return estimation endpoint (5 methods)
- [ ] Covariance estimation endpoint (11 methods)
- [ ] Distribution fitting endpoint (4 univariate)
- [ ] Copula fitting endpoint (6 types)
- [ ] Prior models endpoint
- [ ] Monte Carlo UI page
- [ ] Fan chart component
- [ ] Histogram component
- [ ] Estimation comparison UI page
- [ ] Correlation heatmap component
- [ ] Distribution comparison chart

## Notes for the Agent

- Limit Monte Carlo to 10,000 simulations on free tier (computation time)
- Fan chart uses 5 percentile bands — render as stacked areas
- Copula fitting is expensive — cache results for 24 hours
- KS test p-value > 0.05 means distribution is acceptable fit
- For parametric MC, multivariate normal underestimates tail risk — copula method is more realistic
- All estimation methods should show a brief description explaining what they do
