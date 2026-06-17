# R2-P1a: Analytics Data Layer & Python Infrastructure

## Objective

Build the foundational data services that all analytics tools depend on: portfolio time series, benchmark data, the TypeScript ↔ Python bridge, caching strategy, and shared Python utilities.

## Prerequisites

- R2-P0 complete (packages installed, benchmarks seeded, pipeline verified)
- Reference: `docs/ADVANCED.md`, `docs/ARCHITECTURE.md`

## Recommended Skills

- **next-best-practices** — API route handlers for Python function proxying
- **runtime-cache** — Vercel Runtime Cache API for expensive computation results
- **env-vars** — Python function environment configuration

---

## Task 1: Analytics Data Service

**File: `lib/services/analytics-data.ts`**

The core data service that feeds ALL analytics tools. Every other R2 page depends on this.

```typescript
interface TimeSeriesResult {
  dates: string[];       // ISO date strings
  values: number[];      // Portfolio value per day
  returns: number[];     // Daily simple returns
  cumReturns: number[];  // Cumulative returns from start
}

interface ReturnsMatrix {
  dates: string[];
  assets: string[];           // Instrument codes
  returns: number[][];        // [date_idx][asset_idx]
  weights: number[];          // Current portfolio weights
  prices: Record<string, number[]>; // Raw prices per asset
}

export async function getPortfolioTimeSeries(
  portfolioId: string,
  dateRange: "1Y" | "3Y" | "5Y" | "10Y" | "MAX"
): Promise<TimeSeriesResult>;

export async function getHoldingTimeSeries(
  holdingId: string,
  dateRange: "1Y" | "3Y" | "5Y" | "10Y" | "MAX"
): Promise<TimeSeriesResult>;

export async function getBenchmarkTimeSeries(
  benchmarkCode: string,
  dateRange: "1Y" | "3Y" | "5Y" | "10Y" | "MAX"
): Promise<TimeSeriesResult>;

export async function getPortfolioReturnsMatrix(
  portfolioId: string,
  dateRange: "1Y" | "3Y" | "5Y" | "10Y" | "MAX"
): Promise<ReturnsMatrix>;
```

**Implementation notes:**
- Portfolio value = Σ(quantity × price) per day for each holding
- Handle corporate actions (splits adjust historical quantity)
- Handle missing price days (forward-fill from last known)
- Time-weighted returns (TWR) for portfolio-level performance
- Cache results per `(portfolioId, dateRange)` for 1 hour
- Invalidate on new transaction or price update

---

## Task 2: Benchmark Data Service

**File: `lib/services/benchmark-data.ts`**

Real benchmark data instead of hardcoded rates.

```typescript
export const BENCHMARKS = {
  "^AXJO": { name: "S&P/ASX 200", market: "ASX", type: "equity" },
  "^AXJOA": { name: "S&P/ASX 200 Accum.", market: "ASX", type: "equity-tr" },
  "^GSPC": { name: "S&P 500", market: "US", type: "equity" },
  "^MSCI": { name: "MSCI World", market: "GLOBAL", type: "equity" },
  "CASH": { name: "AUD Cash Rate (RBA)", market: "AU", type: "cash" },
} as const;

export async function getBenchmarkReturns(
  code: string,
  startDate: Date,
  endDate: Date
): Promise<{ dates: string[]; returns: number[] }>;

export async function getRiskFreeRate(): Promise<number>;
// Returns annualised AUD cash rate (currently ~4.35%)
```

Benchmark prices stored in the same `Price` table as regular instruments. The daily cron job extends to fetch benchmark prices.

---

## Task 3: Python Function Utilities

**File: `api/utils/__init__.py`** — empty package marker

**File: `api/utils/response.py`**

```python
from fastapi import FastAPI, HTTPException

def create_app() -> FastAPI:
    """Create a FastAPI app for a Vercel serverless function."""
    return FastAPI()

def error_response(status: int, message: str):
    """Raise HTTP error with JSON detail."""
    raise HTTPException(status_code=status, detail=message)
```

**File: `api/utils/transforms.py`**

```python
import pandas as pd
import numpy as np
from typing import Any

def json_to_returns_df(data: dict) -> pd.DataFrame:
    """Convert JSON returns matrix to pandas DataFrame.

    Expected input:
    { "dates": [...], "assets": [...], "returns": [[...], ...] }
    """
    df = pd.DataFrame(
        data["returns"],
        index=pd.to_datetime(data["dates"]),
        columns=data["assets"]
    )
    return df.sort_index()

def json_to_prices_df(data: dict) -> pd.DataFrame:
    """Convert JSON prices to pandas DataFrame."""
    prices = data.get("prices", {})
    df = pd.DataFrame(prices, index=pd.to_datetime(data["dates"]))
    return df.sort_index()

def make_serializable(obj: Any) -> Any:
    """Recursively convert numpy types to Python natives for JSON."""
    if isinstance(obj, (np.integer,)):
        return int(obj)
    elif isinstance(obj, (np.floating,)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, pd.Timestamp):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: make_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [make_serializable(v) for v in obj]
    return obj
```

---

## Task 4: TypeScript Analytics Client

**File: `lib/services/analytics-client.ts`**

```typescript
import { getPortfolioReturnsMatrix } from "./analytics-data";

export class AnalyticsClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
  }

  async callFunction<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}/api/analytics/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Analytics function failed: ${response.status}`);
    }
    return response.json();
  }

  async runAnalysis<T>(
    endpoint: string,
    portfolioId: string,
    dateRange: "1Y" | "3Y" | "5Y" | "10Y" | "MAX",
    config: Record<string, unknown> = {}
  ): Promise<T> {
    const matrix = await getPortfolioReturnsMatrix(portfolioId, dateRange);
    return this.callFunction<T>(endpoint, { ...matrix, config });
  }
}

export const analyticsClient = new AnalyticsClient();
```

---

## Task 5: Caching Layer

**File: `lib/services/analytics-cache.ts`**

```typescript
export const CACHE_TTL = {
  timeSeries: 3600,        // 1 hour
  benchmark: 86400,        // 24 hours
  riskMetrics: 3600,       // 1 hour
  backtest: 604800,        // 7 days
  optimization: 86400,     // 24 hours
  monteCarlo: 0,           // Session-only (parameter-dependent)
  factorData: 2592000,     // 30 days
  frontier: 86400,         // 24 hours
} as const;
```

---

## Task 6: Shared Calculation Modules

**File: `lib/calculations/rolling-metrics.ts`**

```typescript
export function rollingMetric(
  returns: number[],
  benchmarkReturns: number[],
  windowSize: number,
  metric: "sharpe" | "sortino" | "beta" | "alpha" | "tracking_error"
): { dates: string[]; values: number[] };
```

**File: `lib/calculations/drawdown.ts`**

```typescript
export interface DrawdownEpisode {
  start: string;
  trough: string;
  recovery: string | null;
  depth: number;
  duration: number;
  recoveryDays: number | null;
}

export function detectDrawdowns(cumReturns: number[], dates: string[], threshold?: number): DrawdownEpisode[];
export function drawdownSeries(cumReturns: number[]): number[];
```

**File: `lib/calculations/benchmark.ts`**

```typescript
export function upsideCapture(returns: number[], benchReturns: number[]): number;
export function downsideCapture(returns: number[], benchReturns: number[]): number;
export function trackingError(returns: number[], benchReturns: number[]): number;
export function informationRatio(returns: number[], benchReturns: number[]): number;
export function activeReturn(returns: number[], benchReturns: number[]): number;
```

---

## Task 7: Shared UI Components

| Component | File | Used By |
|-----------|------|---------|
| Portfolio selector | `components/analytics/portfolio-selector.tsx` | All analytics pages |
| Benchmark selector | `components/analytics/benchmark-selector.tsx` | Risk, Backtest, Tactical |
| Date range selector | `components/analytics/date-range-selector.tsx` | All analytics pages |
| Metric card | `components/analytics/metric-card.tsx` | Risk, Backtest, FIRE |

---

## Deliverables Checklist

- [ ] `lib/services/analytics-data.ts` — Portfolio time series, returns matrix
- [ ] `lib/services/benchmark-data.ts` — Benchmark fetcher + constants
- [ ] `lib/services/analytics-client.ts` — Python function caller
- [ ] `lib/services/analytics-cache.ts` — TTL-based caching
- [ ] `api/utils/response.py` — FastAPI helpers
- [ ] `api/utils/transforms.py` — JSON ↔ pandas conversion
- [ ] `lib/calculations/rolling-metrics.ts`
- [ ] `lib/calculations/drawdown.ts`
- [ ] `lib/calculations/benchmark.ts`
- [ ] `components/analytics/portfolio-selector.tsx`
- [ ] `components/analytics/benchmark-selector.tsx`
- [ ] `components/analytics/date-range-selector.tsx`
- [ ] `components/analytics/metric-card.tsx`
- [ ] Extend cron job to fetch benchmark prices daily

## Performance Targets

| Operation | Target | Strategy |
|-----------|--------|----------|
| Portfolio time series (1Y) | < 200ms | DB query + cache |
| Returns matrix (5Y, 10 assets) | < 500ms | DB query + transform |
| Benchmark time series | < 100ms | Pre-fetched, cached 24h |

## Notes for the Agent

- All Python functions use FastAPI (not `BaseHTTPRequestHandler`) — Vercel auto-detects `app`
- The `api/analytics/` directory is the canonical path for Python endpoints
- Portfolio time series must handle partial data (new holdings don't have full history)
- Forward-fill missing prices (weekends, holidays) — don't interpolate
- Benchmark prices use the same `Price` table (keyed by instrumentId + date)
