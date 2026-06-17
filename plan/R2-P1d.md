# R2-P1d: Monte Carlo, FIRE Calculator & Stress Testing

## Objective

Implement advanced Monte Carlo simulation (bootstrap, parametric, copula), distribution fitting, the FIRE retirement calculator, and comprehensive stress testing (historical scenarios, custom shocks, conditional).

## Prerequisites

- R2-P1c complete (optimisation, frontier, estimation methods working)
- Reference: `docs/ADVANCED.md` (Monte Carlo, Distributions, Stress Testing), `docs/TOOLS.md` (FIRE)

## Recommended Skills

- **vercel-react-best-practices** — Fan chart, histogram, gauge component performance
- **runtime-cache** — Cache MC simulation results
- **ai-sdk** — (not needed here, but reference for R2-P1e)

---

## Task 1: Advanced Monte Carlo (Python)

**File: `api/analytics/monte_carlo.py`**

```python
from fastapi import FastAPI, Request
import numpy as np
import pandas as pd
from utils.transforms import json_to_returns_df, make_serializable
from utils.response import create_app

app = create_app()

@app.post("/api/analytics/monte_carlo")
async def monte_carlo(request: Request):
    data = await request.json()
    returns = json_to_returns_df(data)
    config = data.get("config", {})

    method = config.get("method", "bootstrap")
    n_simulations = min(config.get("nSimulations", 1000), 10000)
    horizon_days = config.get("horizonDays", 252)
    weights = np.array(config.get("weights", [1.0 / len(returns.columns)] * len(returns.columns)))
    initial_value = config.get("initialValue", 100000)

    # Withdrawal modelling (optional)
    annual_withdrawal = config.get("annualWithdrawal", 0)
    daily_withdrawal = annual_withdrawal / 252

    if method == "bootstrap":
        # Resample historical returns with replacement
        simulated_paths = []
        for _ in range(n_simulations):
            sampled_idx = np.random.choice(len(returns), size=horizon_days, replace=True)
            sim_returns = returns.iloc[sampled_idx].values @ weights
            path = [initial_value]
            for r in sim_returns:
                path.append(path[-1] * (1 + r) - daily_withdrawal)
            simulated_paths.append(path[1:])

    elif method == "parametric":
        # Multivariate normal
        mu = returns.mean().values
        cov = returns.cov().values
        simulated_paths = []
        for _ in range(n_simulations):
            sim_asset_returns = np.random.multivariate_normal(mu, cov, size=horizon_days)
            sim_returns = sim_asset_returns @ weights
            path = [initial_value]
            for r in sim_returns:
                path.append(path[-1] * (1 + r) - daily_withdrawal)
            simulated_paths.append(path[1:])

    elif method == "copula":
        # Student-t copula for tail dependencies
        from scipy.stats import t as student_t
        # Fit marginals + copula, sample joint distribution
        # (simplified: use multivariate-t)
        nu = 5  # degrees of freedom
        mu = returns.mean().values
        cov = returns.cov().values
        simulated_paths = []
        for _ in range(n_simulations):
            # Multivariate t-distribution
            chi2 = np.random.chisquare(nu, size=horizon_days)
            z = np.random.multivariate_normal(np.zeros(len(mu)), cov, size=horizon_days)
            sim_asset_returns = mu + z / np.sqrt(chi2[:, None] / nu)
            sim_returns = sim_asset_returns @ weights
            path = [initial_value]
            for r in sim_returns:
                path.append(path[-1] * (1 + r) - daily_withdrawal)
            simulated_paths.append(path[1:])

    # Statistics
    final_values = [path[-1] for path in simulated_paths]
    percentiles = [5, 10, 25, 50, 75, 90, 95]

    result = {
        "paths": [p for p in simulated_paths[:100]],  # First 100 for vis
        "statistics": {
            "mean": float(np.mean(final_values)),
            "median": float(np.median(final_values)),
            "std": float(np.std(final_values)),
            "min": float(np.min(final_values)),
            "max": float(np.max(final_values)),
            "percentiles": {str(p): float(np.percentile(final_values, p)) for p in percentiles},
            "probLoss": float(np.mean(np.array(final_values) < initial_value)),
            "probRuin": float(np.mean(np.array(final_values) <= 0)),
            "var95": float(np.percentile(final_values, 5)),
            "cvar95": float(np.mean([v for v in final_values if v <= np.percentile(final_values, 5)])),
        },
        "fanChart": {
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
    return make_serializable(result)
```

---

## Task 2: Distribution Fitting (Python)

**File: `api/analytics/fit_distribution.py`**

Fit univariate distributions to asset/portfolio returns:

- Normal, Student-t, Skew-Normal, Johnson SU
- Return: parameters, KS test, AIC/BIC, best fit recommendation
- Used by MC page to show which distribution best fits the data

**File: `api/analytics/fit_copula.py`**

Fit copula models to joint returns:

- Gaussian, Student-t, Clayton, Gumbel, Frank
- Return: copula parameters, tail dependence coefficients, goodness-of-fit

---

## Task 3: FIRE Calculator (TypeScript)

**File: `lib/calculations/fire.ts`**

```typescript
interface FIREInput {
  currentAge: number;
  retirementAge: number;
  currentPortfolioValue: number;
  annualContribution: number;
  contributionGrowthRate: number;
  expectedReturnRate: number;
  inflationRate: number;
  annualExpenses: number;
  expenseGrowthRate: number;
  withdrawalRate: number;          // typically 4%
  superBalance?: number;
  superAccessAge?: number;         // typically 60 in AU
}

interface FIREResult {
  fireNumber: number;              // expenses / withdrawal rate
  yearsToFIRE: number;
  fireAge: number;
  projectedPortfolioAtRetirement: number;
  safeWithdrawalAmount: number;
  coastFIRENumber: number;         // stop contributing, let growth do the work
  yearByYearProjection: Array<{
    age: number;
    year: number;
    contributions: number;
    investmentGrowth: number;
    portfolioValue: number;
    expenses: number;
    surplus: number;
  }>;
  scenarios: {
    pessimistic: { fireAge: number; successRate: number };
    baseline: { fireAge: number; successRate: number };
    optimistic: { fireAge: number; successRate: number };
  };
}

export function calculateFIRE(input: FIREInput): FIREResult;
```

Pure TypeScript — no Python dependency. Scenarios use ±2% return adjustment.

---

## Task 4: Stress Testing (Python)

**File: `api/analytics/stress_test.py`**

Three modes:

### Historical Scenarios
Apply real crisis returns to user's current portfolio:

| Scenario | Period | Characteristics |
|----------|--------|-----------------|
| GFC | Sep 2008 – Mar 2009 | Credit crisis, −50% equities |
| COVID-19 | Feb – Mar 2020 | Fast crash, fast recovery |
| Dot-com | Mar 2000 – Oct 2002 | Tech collapse |
| 2022 Rate Shock | Jan – Oct 2022 | Stocks + bonds fall together |
| 1987 Black Monday | Oct 1987 | Single-day 22% crash |
| Asian Crisis | 1997–1998 | EM currency collapse |

For each: portfolio return, max drawdown, worst day, duration.

### Custom Shocks
User-defined per-asset shocks (e.g. "CBA −20%, BHP −30%"):
- Apply shock vector to current weights
- Return portfolio impact + per-asset contribution

### Conditional / Factor Stress
"If market drops 10%, what happens to my portfolio?"
- Calculate beta to factor for each asset
- Apply conditional expected return given factor shock
- Return probability-weighted impact

---

## Task 5: Enhanced Monte Carlo UI

**File: `app/(dashboard)/analytics/monte-carlo/page.tsx`** (rewrite)

Upgrade from standalone calculator to portfolio-integrated tool:

```
/analytics/monte-carlo
├── Config Panel:
│   ├── Simulation method (Bootstrap, Parametric, Copula)
│   ├── Number of simulations (100–10,000)
│   ├── Horizon (1Y, 3Y, 5Y, 10Y, 20Y, 30Y)
│   ├── Initial value (auto-filled from portfolio)
│   ├── Withdrawal settings (none, fixed, % of balance, guardrails)
│   ├── Inflation adjustment toggle
│   └── [Run Simulation] button
├── Results:
│   ├── Fan chart (confidence bands: 5th, 25th, 50th, 75th, 95th percentile)
│   ├── Statistics card (mean, median, VaR, CVaR, P(loss), P(ruin))
│   ├── Return distribution histogram (+ fitted distribution overlay)
│   ├── Percentile table at milestones (5Y, 10Y, 20Y, 30Y)
│   ├── Success rate gauge (% of scenarios surviving)
│   └── Sensitivity table (success rate vs different withdrawal amounts)
└── Link: "Run Monte Carlo for FIRE" → pre-fills FIRE params
```

---

## Task 6: FIRE Calculator UI

**File: `app/(dashboard)/tools/fire/page.tsx`**

```
/tools/fire
├── Input Form:
│   ├── Current age, retirement age
│   ├── Portfolio value (auto-filled)
│   ├── Annual contribution (+ growth rate slider)
│   ├── Expected return (auto from portfolio history, editable)
│   ├── Annual expenses (+ growth rate)
│   ├── Withdrawal rate (default 4%, slider)
│   ├── Inflation assumption
│   ├── Super balance + access age (AU-specific toggle)
│   └── [Calculate] button
├── Results:
│   ├── FIRE Number (big card)
│   ├── Years to FIRE / FIRE Age
│   ├── Coast FIRE number
│   ├── Projection chart (accumulation + drawdown phases)
│   ├── Scenario comparison (pessimistic / baseline / optimistic)
│   ├── "Run Monte Carlo" button → calls MC with FIRE params
│   └── Sensitivity: ±1% return / ±1% savings effect on timeline
└── Super inclusion toggle (Australian retirement)
```

---

## Task 7: Stress Testing UI

**File: `app/(dashboard)/analytics/what-if/page.tsx`** (rewrite — rename to stress testing)

Upgrade current what-if page to comprehensive stress testing:

```
/analytics/what-if (Stress Testing)
├── Tab 1: Historical Scenarios
│   ├── Table: portfolio impact per crisis period
│   ├── Worst scenario highlighted
│   └── Per-asset contribution waterfall chart
├── Tab 2: Custom Shocks
│   ├── Shock input per asset (% slider or input)
│   ├── Portfolio impact summary
│   └── Waterfall chart (which assets contribute most)
├── Tab 3: Factor Stress
│   ├── Factor selector (Market, Rates, Commodity, Currency)
│   ├── Shock magnitude slider (−5% to −30%)
│   └── Conditional portfolio impact + confidence interval
└── Export (CSV)
```

---

## Task 8: Chart Components

**File: `components/charts/fan-chart.tsx`**

Reusable fan chart (percentile bands as stacked areas). Used by Monte Carlo + FIRE.

**File: `components/charts/scenario-waterfall.tsx`**

Waterfall chart for stress test impact breakdown (per-asset contribution to loss).

---

## Deliverables Checklist

- [ ] Monte Carlo endpoint (bootstrap, parametric, copula + withdrawal modelling)
- [ ] Distribution fitting endpoint (4 univariate + best-fit selection)
- [ ] Copula fitting endpoint (5 types + tail dependence)
- [ ] FIRE Calculator (`lib/calculations/fire.ts` — pure TypeScript)
- [ ] Stress testing endpoint (historical, custom, conditional)
- [ ] Enhanced Monte Carlo UI (portfolio-integrated, fan chart, histogram)
- [ ] FIRE Calculator UI (projection chart, scenarios, Monte Carlo link)
- [ ] Stress testing UI (3 tabs: historical, custom, factor)
- [ ] Fan chart component (reusable)
- [ ] Scenario waterfall chart component
- [ ] Distribution comparison chart

## Performance Targets

| Operation | Target | Strategy |
|-----------|--------|----------|
| MC 1,000 sims | < 3s | Python |
| MC 10,000 sims | < 10s | Python, warn on free tier |
| FIRE calculation | < 50ms | TypeScript, client-side OK |
| Stress test (6 scenarios) | < 2s | Python |
| Distribution fitting | < 2s | Python |

## Notes for the Agent

- Monte Carlo: limit to 10,000 sims on free tier (10s timeout)
- Fan chart: render 5 percentile bands as stacked areas (not individual paths)
- Copula MC is most realistic for tail risk but slowest — default to bootstrap
- FIRE is pure TS — no Python needed, can run client-side for instant feedback
- Stress test: use beta × market move as approximation when full historical data unavailable
- Withdrawal modelling: daily withdrawal = annual / 252
- P(ruin) = % of paths that hit zero — key metric for retirement planning
