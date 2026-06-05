# R2-P1a: Python Infrastructure & Backtesting

## Objective

Set up the Python serverless function infrastructure on Vercel and implement the backtesting engine using skfolio.

## Prerequisites

- R1 complete
- Reference: `docs/ADVANCED.md` (Backtesting section)

---

## Task 1: Python Function Infrastructure

**File: `api/requirements.txt`** (update)

```
skfolio>=0.4.0
scipy>=1.11.0
numpy>=1.24.0
pandas>=2.0.0
statsmodels>=0.14.0
google-antigravity>=0.1.0
```

**File: `api/utils/response.py`**

Shared utility for Python functions:
```python
import json
from http.server import BaseHTTPRequestHandler

def success_response(handler, data: dict):
    handler.send_response(200)
    handler.send_header("Content-Type", "application/json")
    handler.end_headers()
    handler.wfile.write(json.dumps(data).encode())

def error_response(handler, status: int, message: str):
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.end_headers()
    handler.wfile.write(json.dumps({"error": message}).encode())

def parse_body(handler) -> dict:
    content_length = int(handler.headers.get("Content-Length", 0))
    body = handler.rfile.read(content_length)
    return json.loads(body)
```

**File: `api/utils/transforms.py`**

Data transformation utilities:
```python
import pandas as pd
import numpy as np

def json_to_returns_df(data: dict) -> pd.DataFrame:
    """Convert JSON price history to returns DataFrame."""
    prices = pd.DataFrame(data["prices"])
    prices["date"] = pd.to_datetime(prices["date"])
    prices = prices.set_index("date").sort_index()
    returns = prices.pct_change().dropna()
    return returns

def portfolio_weights_to_series(data: dict) -> pd.Series:
    """Convert JSON weights to pandas Series."""
    return pd.Series(data["weights"], index=data["assets"])
```

**File: `src/lib/services/analytics-client.ts`**

TypeScript client for calling Python functions:
```typescript
export class AnalyticsClient {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : "http://localhost:3000";
  }

  async callFunction<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}/api/python/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Analytics function failed");
    }
    return response.json();
  }
}
```

**File: `src/lib/services/analytics-data.ts`**

Prepare data for Python functions:
```typescript
export async function prepareReturnsData(portfolioId: string, startDate: Date, endDate: Date) {
  // Fetch all holdings with price history
  // Transform to { prices: [{date, asset1, asset2, ...}], assets: string[] }
}

export async function preparePortfolioData(portfolioId: string) {
  // Fetch current weights, constraints, benchmark
  // Return formatted for Python consumption
}
```

---

## Task 2: Backtesting Engine

**File: `api/python/backtest.py`**

```python
from http.server import BaseHTTPRequestHandler
from skfolio import Portfolio, Population
from skfolio.optimization import MeanRisk, EqualWeighted
from skfolio.model_selection import WalkForward, CombinatorialPurgedCV
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
            strategy = config.get("strategy", "equal_weighted")
            rebalance_freq = config.get("rebalanceFrequency", "quarterly")
            start_date = config.get("startDate")
            end_date = config.get("endDate")
            benchmark_weights = config.get("benchmarkWeights")
            
            # Build optimisation model based on strategy
            if strategy == "equal_weighted":
                model = EqualWeighted()
            elif strategy == "mean_variance":
                model = MeanRisk()
            # ... more strategies
            
            # Run walk-forward backtest
            cv = WalkForward(
                train_size=252,  # 1 year training
                test_size=63,    # 1 quarter test
            )
            
            # Fit and predict
            population = Population([])
            for train_idx, test_idx in cv.split(returns):
                train_returns = returns.iloc[train_idx]
                test_returns = returns.iloc[test_idx]
                model.fit(train_returns)
                portfolio = model.predict(test_returns)
                population.append(portfolio)
            
            # Calculate metrics
            result = {
                "annualizedReturn": float(population.mean()),
                "annualizedVolatility": float(population.annualized_volatility()),
                "sharpeRatio": float(population.sharpe_ratio()),
                "maxDrawdown": float(population.max_drawdown()),
                "calmarRatio": float(population.calmar_ratio()),
                "sortinoRatio": float(population.sortino_ratio()),
                "cvar95": float(population.cvar(alpha=0.05)),
                "weights": population[-1].weights.tolist(),
                "assets": returns.columns.tolist(),
                "equityCurve": population.cumulative_returns().tolist(),
                "dates": [d.isoformat() for d in returns.index[len(returns) - len(population.cumulative_returns()):]],
                "rebalanceDates": [d.isoformat() for d in cv.test_dates()],
            }
            
            success_response(self, result)
        except Exception as e:
            error_response(self, 500, str(e))
```

**File: `src/lib/actions/backtest.ts`**

Server action that orchestrates backtesting:
```typescript
export async function runBacktest(portfolioId: string, config: BacktestConfig) {
  const returnsData = await prepareReturnsData(portfolioId, config.startDate, config.endDate);
  const client = new AnalyticsClient();
  const result = await client.callFunction("backtest", { ...returnsData, config });
  // Cache result in Vercel KV
  return result;
}
```

**File: `src/app/(dashboard)/analytics/backtest/page.tsx`**

Backtesting UI:
- Strategy selector (Equal Weight, Mean-Variance, Risk Parity, HRP, Min Variance, Max Sharpe)
- Date range (start/end)
- Rebalancing frequency (monthly, quarterly, annually)
- Benchmark selector (equal-weight, market-cap, custom)
- Run button
- Results:
  - Equity curve chart (portfolio vs benchmark)
  - Metrics table (return, volatility, Sharpe, max DD, Calmar, Sortino, CVaR)
  - Drawdown chart
  - Rolling Sharpe ratio chart
  - Weight allocation over time (stacked area chart)
  - Rebalance dates marked on chart

---

## Task 3: Backtest Comparison

**File: `api/python/backtest_compare.py`**

Run multiple strategies simultaneously for comparison:
- Accept array of strategy configs
- Return metrics for each
- Include statistical significance tests (paired t-test on returns)

**File: `src/app/(dashboard)/analytics/backtest/compare/page.tsx`**

Side-by-side comparison table + overlaid equity curves.

---

## Task 4: Walk-Forward Analysis

**File: `api/python/walk_forward.py`**

Detailed walk-forward with train/test visualization:
- Show in-sample vs out-of-sample performance per window
- Detect overfitting (large gap between IS and OOS)
- Return per-window breakdown

---

## Deliverables Checklist

- [ ] Python function infrastructure (utils, response helpers, transforms)
- [ ] TypeScript analytics client (fetch wrapper with error handling)
- [ ] Data preparation service (DB → Python input format)
- [ ] Backtesting endpoint (WalkForward with multiple strategies)
- [ ] Backtesting UI (config form + results visualisation)
- [ ] Strategy comparison endpoint
- [ ] Walk-forward analysis endpoint
- [ ] Result caching (Vercel KV)
- [ ] Equity curve chart component
- [ ] Drawdown chart component

## Notes for the Agent

- Python functions must be self-contained (import only from utils/ or installed packages)
- skfolio handles most of the heavy lifting — use its API directly
- All numeric results must be JSON-serializable (convert numpy types to Python floats)
- Cache expensive backtest results for 1 hour (use portfolio hash as key)
- Vercel free tier: 10s timeout — warn user if backtest may exceed this
- For development, Python functions run via `vercel dev` locally
