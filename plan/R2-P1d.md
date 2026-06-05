# R2-P1d: Factor Analysis, Tactical Allocation & Stress Testing

## Objective

Implement factor models (Fama-French and custom), tactical allocation strategies, stress testing (historical and custom scenarios), and model cross-validation.

## Prerequisites

- R2-P1c complete (estimation methods, distributions)
- Reference: `docs/ADVANCED.md` (Factor Analysis, Tactical Allocation, Stress Testing, Model Validation)

---

## Task 1: Factor Analysis

**File: `api/python/factor_analysis.py`**

```python
from http.server import BaseHTTPRequestHandler
from skfolio.prior import FactorModel
import pandas as pd
import numpy as np
import statsmodels.api as sm
from utils.response import success_response, error_response, parse_body
from utils.transforms import json_to_returns_df

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        data = parse_body(self)
        returns = json_to_returns_df(data)
        factors = pd.DataFrame(data.get("factors", {}))
        config = data.get("config", {})
        
        model_type = config.get("type", "fama_french")  # fama_french | pca | custom
        
        if model_type == "fama_french":
            # Regress each asset against Fama-French factors (MKT, SMB, HML)
            # factors DataFrame should have columns: Mkt-RF, SMB, HML, RF
            results = {}
            for col in returns.columns:
                y = returns[col] - factors["RF"]
                X = sm.add_constant(factors[["Mkt-RF", "SMB", "HML"]])
                model = sm.OLS(y, X).fit()
                results[col] = {
                    "alpha": float(model.params["const"]),
                    "betas": {
                        "market": float(model.params["Mkt-RF"]),
                        "size": float(model.params["SMB"]),
                        "value": float(model.params["HML"]),
                    },
                    "r_squared": float(model.rsquared),
                    "residual_std": float(model.resid.std()),
                }
            
            response = {
                "assets": results,
                "factorReturns": {
                    "market": float(factors["Mkt-RF"].mean() * 252),
                    "size": float(factors["SMB"].mean() * 252),
                    "value": float(factors["HML"].mean() * 252),
                },
            }
            
        elif model_type == "pca":
            # PCA-based factor decomposition
            from sklearn.decomposition import PCA
            n_components = config.get("nFactors", 3)
            pca = PCA(n_components=n_components)
            pca.fit(returns)
            
            response = {
                "explainedVariance": pca.explained_variance_ratio_.tolist(),
                "cumulativeVariance": np.cumsum(pca.explained_variance_ratio_).tolist(),
                "loadings": pca.components_.tolist(),
                "assets": returns.columns.tolist(),
            }
        
        success_response(self, response)
```

**File: `src/lib/services/factor-data.ts`**

Fetch Fama-French factor data:
- Source: Kenneth French's data library (public CSV)
- Download and parse monthly/daily factor returns
- Cache locally for 24 hours
- Map Australian equivalents where available

---

## Task 2: Tactical Allocation

**File: `api/python/tactical.py`**

Implement tactical allocation strategies:
```python
class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        data = parse_body(self)
        returns = json_to_returns_df(data)
        config = data.get("config", {})
        
        strategy = config.get("strategy", "momentum")
        lookback = config.get("lookbackDays", 252)
        
        if strategy == "momentum":
            # Cross-sectional momentum: overweight recent winners
            momentum_scores = returns.iloc[-lookback:].sum()
            weights = momentum_scores / momentum_scores.sum()
            weights = weights.clip(lower=0)  # Long only
            weights = weights / weights.sum()
            
            signal = {
                "scores": dict(zip(returns.columns.tolist(), momentum_scores.tolist())),
                "weights": dict(zip(returns.columns.tolist(), weights.tolist())),
                "description": f"12-month momentum ranking",
            }
            
        elif strategy == "mean_reversion":
            # Short-term mean reversion: overweight recent losers
            short_lookback = config.get("shortLookback", 21)
            recent_returns = returns.iloc[-short_lookback:].sum()
            # Invert: losers get higher weight
            scores = -recent_returns
            weights = (scores - scores.min()) / (scores.max() - scores.min())
            weights = weights / weights.sum()
            
            signal = {
                "scores": dict(zip(returns.columns.tolist(), scores.tolist())),
                "weights": dict(zip(returns.columns.tolist(), weights.tolist())),
                "description": f"{short_lookback}-day mean reversion",
            }
            
        elif strategy == "risk_adjusted_momentum":
            # Momentum divided by volatility
            mom = returns.iloc[-lookback:].sum()
            vol = returns.iloc[-lookback:].std() * np.sqrt(252)
            scores = mom / vol
            weights = scores.clip(lower=0)
            weights = weights / weights.sum()
            
            signal = {
                "scores": dict(zip(returns.columns.tolist(), scores.tolist())),
                "weights": dict(zip(returns.columns.tolist(), weights.tolist())),
                "description": "Risk-adjusted momentum (Sharpe ranking)",
            }
            
        elif strategy == "volatility_targeting":
            # Inverse volatility weighting
            vol = returns.iloc[-lookback:].std() * np.sqrt(252)
            weights = (1 / vol) / (1 / vol).sum()
            
            signal = {
                "scores": dict(zip(returns.columns.tolist(), (1/vol).tolist())),
                "weights": dict(zip(returns.columns.tolist(), weights.tolist())),
                "description": "Inverse volatility (vol targeting)",
            }
        
        success_response(self, signal)
```

---

## Task 3: Stress Testing

**File: `api/python/stress_test.py`**

```python
class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        data = parse_body(self)
        returns = json_to_returns_df(data)
        weights = np.array(data["weights"])
        config = data.get("config", {})
        
        test_type = config.get("type", "historical")
        
        if test_type == "historical":
            # Apply historical crisis scenarios
            scenarios = {
                "GFC 2008": {"start": "2008-09-01", "end": "2009-03-31"},
                "COVID March 2020": {"start": "2020-02-20", "end": "2020-03-23"},
                "Dot-com 2000": {"start": "2000-03-10", "end": "2002-10-09"},
                "Flash Crash 2010": {"start": "2010-05-06", "end": "2010-05-06"},
                "China Selloff 2015": {"start": "2015-08-18", "end": "2015-08-25"},
                "Rate Hike 2022": {"start": "2022-01-01", "end": "2022-06-30"},
            }
            
            results = {}
            for name, period in scenarios.items():
                mask = (returns.index >= period["start"]) & (returns.index <= period["end"])
                if mask.any():
                    scenario_returns = returns.loc[mask]
                    portfolio_return = (scenario_returns.values @ weights).sum()
                    max_dd = calculate_max_drawdown(scenario_returns.values @ weights)
                    results[name] = {
                        "return": float(portfolio_return),
                        "maxDrawdown": float(max_dd),
                        "worstDay": float((scenario_returns.values @ weights).min()),
                        "days": int(mask.sum()),
                    }
            
            success_response(self, {"scenarios": results})
            
        elif test_type == "custom":
            # User-defined shocks
            shocks = config.get("shocks", {})  # {"CBA": -0.20, "BHP": -0.30, ...}
            shocked_returns = np.array([shocks.get(col, 0.0) for col in returns.columns])
            portfolio_impact = float(np.dot(weights, shocked_returns))
            
            success_response(self, {
                "portfolioImpact": portfolio_impact,
                "assetImpacts": dict(zip(returns.columns.tolist(), (weights * shocked_returns).tolist())),
            })
            
        elif test_type == "conditional":
            # If factor X drops by Y%, what happens to portfolio?
            factor_shock = config.get("factorShock", {"factor": "market", "magnitude": -0.10})
            # Calculate beta to factor for each asset
            # Apply conditional expected return given factor shock
            # ...
            pass
```

---

## Task 4: Cross-Validation & Model Selection

**File: `api/python/cross_validate.py`**

```python
from skfolio.model_selection import (
    WalkForward,
    CombinatorialPurgedCV,
    cross_val_predict,
)
from skfolio.optimization import MeanRisk, HierarchicalRiskParity, EqualWeighted
import numpy as np

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        data = parse_body(self)
        returns = json_to_returns_df(data)
        config = data.get("config", {})
        
        cv_method = config.get("method", "walk_forward")
        
        models = {
            "equal_weighted": EqualWeighted(),
            "mean_variance": MeanRisk(),
            "hrp": HierarchicalRiskParity(),
        }
        
        if cv_method == "walk_forward":
            cv = WalkForward(train_size=252, test_size=63)
        elif cv_method == "combinatorial_purged":
            cv = CombinatorialPurgedCV(n_folds=5, n_test_folds=2)
        
        results = {}
        for name, model in models.items():
            pred = cross_val_predict(model, returns, cv=cv)
            results[name] = {
                "annualizedReturn": float(pred.mean() * 252),
                "annualizedVolatility": float(pred.std() * np.sqrt(252)),
                "sharpeRatio": float(pred.mean() / pred.std() * np.sqrt(252)),
                "maxDrawdown": float(calculate_max_drawdown(pred)),
            }
        
        # Rank models
        ranked = sorted(results.items(), key=lambda x: x[1]["sharpeRatio"], reverse=True)
        
        success_response(self, {
            "results": results,
            "ranking": [{"model": name, **metrics} for name, metrics in ranked],
            "bestModel": ranked[0][0],
        })
```

---

## Task 5: Factor Analysis UI

**File: `src/app/(dashboard)/analytics/factors/page.tsx`**

Factor analysis page:
- Model type selector (Fama-French 3-Factor, PCA, Custom)
- For Fama-French: show factor exposures per asset (table + radar chart)
- For PCA: scree plot + loading heatmap
- Factor contribution to portfolio risk (pie chart)
- Alpha (excess return) per asset

---

## Task 6: Tactical Allocation UI

**File: `src/app/(dashboard)/analytics/tactical/page.tsx`**

Tactical page:
- Strategy selector (Momentum, Mean Reversion, Risk-Adjusted Momentum, Vol Targeting)
- Lookback period slider
- Signal scores ranked (bar chart)
- Recommended weights vs current
- Historical strategy backtest (link to backtest page with pre-filled config)

---

## Task 7: Stress Testing UI

**File: `src/app/(dashboard)/analytics/stress-test/page.tsx`**

Stress testing page:
- Tab 1: Historical Scenarios — table showing portfolio impact per crisis
- Tab 2: Custom Shocks — input shock % per asset, see portfolio impact
- Tab 3: Factor Stress — shock a factor (market, rates, commodity), see propagation
- Waterfall chart showing contribution of each asset to total loss

**File: `src/components/charts/waterfall.tsx`**

Waterfall chart for stress test impact breakdown.

---

## Task 8: Model Selection UI

**File: `src/app/(dashboard)/analytics/model-selection/page.tsx`**

Model comparison page:
- CV method selector (Walk-Forward, Combinatorial Purged)
- Strategy checkboxes (which models to compare)
- Results table ranked by chosen metric (Sharpe, return, risk)
- Box plots of out-of-sample returns per model
- Recommended model badge

---

## Deliverables Checklist

- [ ] Factor analysis endpoint (Fama-French + PCA)
- [ ] Fama-French data fetcher/cacher
- [ ] Tactical allocation endpoint (4 strategies)
- [ ] Stress testing endpoint (historical + custom + conditional)
- [ ] Cross-validation endpoint (2 CV methods, 3+ models)
- [ ] Factor analysis UI (exposures, radar chart, PCA scree plot)
- [ ] Tactical allocation UI (signals, weights comparison)
- [ ] Stress testing UI (3 tabs, waterfall chart)
- [ ] Model selection UI (ranking table, box plots)
- [ ] Waterfall chart component

## Notes for the Agent

- Fama-French factors for Australia: use Ken French's "Asia Pacific ex Japan" dataset
- PCA: use n_components that explains >80% variance (typically 3-5)
- Tactical strategies are long-only for now (no shorting in R2)
- Stress test historical scenarios require sufficient price history — skip scenarios where data doesn't exist
- Cross-validation must use purged CV (no data leakage between train/test)
- Factor beta heatmap: rows=assets, columns=factors, colour=beta value
