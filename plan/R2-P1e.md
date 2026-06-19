# R2-P1e: Factor Analysis, Correlations, Tactical, Exposure & AI Tools

## Objective

Implement factor models (Fama-French, PCA), correlation analysis, tactical allocation strategies, ETF X-ray / exposure analysis, Share Checker, AI Importer (Gemini), Market Sentiment dashboard, and AI Chat assistant.

## Prerequisites

- R2-P1d complete (Monte Carlo, FIRE, stress testing working)
- Reference: `docs/ADVANCED.md` (Factors, Tactical), `docs/TOOLS.md` (AI, X-ray, Sentiment)

## Recommended Skills

- **ai-sdk** — Vercel AI SDK for Gemini chat interface, structured output, streaming
- **building-components** — Custom chat UI components with Base UI primitives
- **vercel-react-best-practices** — Heatmap, treemap, gauge component performance
- **next-best-practices** — Streaming route for AI chat, server actions

---

## Task 1: Factor Analysis (Python)

**File: `api/analytics/factor_analysis.py`**

```python
from fastapi import FastAPI, Request
import pandas as pd
import numpy as np
import statsmodels.api as sm
from sklearn.decomposition import PCA
from utils.transforms import json_to_returns_df, make_serializable
from utils.response import create_app

app = create_app()

@app.post("/api/analytics/factor_analysis")
async def factor_analysis(request: Request):
    data = await request.json()
    returns = json_to_returns_df(data)
    factors = pd.DataFrame(data.get("factors", {}))
    config = data.get("config", {})
    model_type = config.get("type", "fama_french")

    if model_type == "fama_french":
        # Regress each asset against Fama-French factors
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
                "t_stats": {k: float(v) for k, v in model.tvalues.items()},
            }
        return make_serializable({"assets": results})

    elif model_type == "pca":
        n_components = config.get("nFactors", 5)
        pca = PCA(n_components=n_components)
        pca.fit(returns)
        return make_serializable({
            "explainedVariance": pca.explained_variance_ratio_.tolist(),
            "cumulativeVariance": np.cumsum(pca.explained_variance_ratio_).tolist(),
            "loadings": pca.components_.tolist(),
            "assets": returns.columns.tolist(),
        })
```

**File: `lib/services/factor-data.ts`**

Fetch Fama-French factor data from Kenneth French's data library (public CSVs). Cache for 30 days.

---

## Task 2: Correlation Analysis (TypeScript + Python)

**File: `api/analytics/correlations.py`**

```python
# Compute:
# 1. Full correlation matrix (pairwise Pearson)
# 2. Rolling correlation between any pair (configurable window)
# 3. Hierarchical clustering (dendrogram data)
# 4. Crisis vs normal correlations (correlations during drawdowns vs rest)
```

Mostly a thin wrapper — correlations are fast to compute from the returns matrix.

---

## Task 3: Tactical Allocation (Python)

**File: `api/analytics/tactical.py`**

Strategies:

| Strategy | Signal | Logic |
|----------|--------|-------|
| Momentum | 12-month return | Overweight recent winners |
| Mean Reversion | 21-day return | Overweight recent losers |
| Risk-Adjusted Momentum | Return / Volatility | Sharpe ranking |
| Volatility Targeting | Inverse vol | 1/σ weighting |
| MA Crossover | SMA(50) vs SMA(200) | Golden/death cross signal |
| Dual Momentum | Absolute + Relative | Hold top if > cash |

Return: signal scores, recommended weights, signal chart data, description.

---

## Task 4: ETF X-ray & Exposure Analysis

**File: `lib/services/etf-xray.ts`**

Decompose ETF holdings to show underlying exposure:

```typescript
interface XrayResult {
  topHoldings: Array<{ name: string; totalWeight: number; sources: string[] }>;
  sectorExposure: Record<string, number>;
  countryExposure: Record<string, number>;
  overlap: Array<{ stock: string; etfs: string[]; combinedWeight: number }>;
  concentrationAlerts: Array<{ stock: string; totalExposure: number; threshold: number }>;
}

async function xrayPortfolio(holdings: HoldingWithInstrument[]): Promise<XrayResult>;
```

**Data**: Hardcode top holdings for common AU ETFs initially (VAS, VGS, IOZ, A200, VDHG, IVV). Store in DB or JSON file. Refresh monthly.

**File: `app/(dashboard)/analytics/exposure/page.tsx`** (enhance existing)

Upgrade from basic grouping to:
- ETF look-through (underlying holdings revealed)
- Overlap detection (same stock in multiple ETFs)
- Concentration risk alerts (e.g. "8% total AAPL exposure via 3 ETFs")
- True sector/country/asset-type exposure (direct + indirect)
- Treemap with drill-down capability

---

## Task 5: Share Checker

**File: `lib/services/share-checker.ts`**

```typescript
interface CheckResult {
  duplicates: Array<{ holding1: string; holding2: string; similarity: string }>;
  concentration: Array<{ holding: string; weight: number; threshold: number }>;
  staleData: Array<{ holding: string; lastPriceDate: Date; daysSinceUpdate: number }>;
  missingData: Array<{ holding: string; issue: string }>;
  anomalies: Array<{ holding: string; description: string }>;
}
```

Checks:
- Same instrument across multiple portfolios (intentional?)
- Single-holding concentration > 20%
- Stale prices (> 5 business days old)
- Missing cost base
- Unusual transaction patterns (large buys/sells)

**File: `app/(dashboard)/tools/checker/page.tsx`**

List of findings with severity badges + fix suggestions.

---

## Task 6: AI Importer (Gemini / Vercel AI SDK)

**File: `app/api/ai-import/route.ts`**

Use Vercel AI SDK with Google Gemini to parse unstructured financial documents:

```typescript
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

const TransactionSchema = z.object({
  tradeDate: z.string().describe("ISO 8601 date"),
  instrumentCode: z.string().describe("Ticker symbol"),
  marketCode: z.string().describe("Exchange code"),
  transactionType: z.enum(["BUY", "SELL", "DIVIDEND", "INTEREST", "COUPON", "FEE", "DRP"]),
  quantity: z.number(),
  price: z.number().describe("Price per unit"),
  brokerage: z.number().default(0),
  currency: z.string().default("AUD"),
  comments: z.string().optional(),
});

const ImportResultSchema = z.object({
  transactions: z.array(TransactionSchema),
  warnings: z.array(z.string()),
});

export async function POST(request: Request) {
  const { content, documentType } = await request.json();
  const { object } = await generateObject({
    model: google("gemini-2.5-flash"),
    schema: ImportResultSchema,
    prompt: `You are a financial document parser.
Document type: ${documentType}
Extract all transactions from this content:\n\n${content}`,
  });
  return Response.json(object);
}
```

**File: `app/(dashboard)/portfolio/[id]/import/ai/page.tsx`**

AI Import UI:
- Upload zone (PDF, PNG, JPG, TXT)
- Document type selector (Broker Statement, Dividend Statement, Tax Statement, Contract Note)
- "Parse with AI" button
- Review extracted transactions (editable table with confidence indicators)
- Confirm & Import button
- Graceful "unavailable" message if `GOOGLE_GENERATIVE_AI_API_KEY` not set

---

## Task 7: Market Sentiment Dashboard

**File: `lib/services/market-sentiment.ts`**

```typescript
interface SentimentData {
  fearGreedIndex: number;          // 0-100 (derived from indicators)
  vixLevel: number;
  marketBreadth: number;           // % stocks above 200-day MA
  putCallRatio: number;
  sectorHeatmap: Record<string, number>; // sector → daily return
  asxSummary: { open: number; close: number; change: number; changePercent: number; volume: number };
}
```

Source: Yahoo Finance (^AXJO, ^VIX). Respect rate limits (5 req/sec).

**File: `app/(dashboard)/tools/sentiment/page.tsx`**

- Fear/Greed gauge (0–100 dial chart)
- ASX200 intraday summary
- Sector heatmap (treemap, green/red)
- Key market indicators table

---

## Task 8: AI Chat Assistant (Stretch Goal)

**File: `app/api/chat/route.ts`**

```typescript
import { streamText } from "ai";
import { google } from "@ai-sdk/google";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: google("gemini-2.0-flash"),
    system: "You are a helpful portfolio analysis assistant for InvestaLens...",
    messages,
  });
  return result.toDataStreamResponse();
}
```

**File: `app/(dashboard)/tools/assistant/page.tsx`**

Basic chat interface:
- Message list
- Input with send button
- Can answer portfolio questions
- Suggests optimisation actions
- Explains report results

---

## Task 9: Factor & Correlation UI Pages

**File: `app/(dashboard)/analytics/factors/page.tsx`**

- Model type selector (Fama-French, PCA)
- Factor exposures per asset (table + bar chart)
- PCA: scree plot + loading heatmap
- Alpha (excess return) per asset

**File: `app/(dashboard)/analytics/correlations/page.tsx`**

- Correlation matrix heatmap (clickable cells)
- Rolling correlation chart (select any pair)
- Hierarchical clustering dendrogram
- Period selector (1Y, 3Y, 5Y)

**File: `app/(dashboard)/analytics/tactical/page.tsx`**

- Strategy selector (Momentum, Mean Reversion, Vol Target, MA Crossover)
- Lookback period slider
- Signal scores (ranked bar chart)
- Recommended vs current weights
- "Backtest this strategy" link

---

## Deliverables Checklist

- [x] Factor analysis endpoint (Fama-French regression + PCA)
- [x] Factor data service (Kenneth French library fetch + cache)
- [x] Correlation analysis endpoint (matrix, rolling, clustering)
- [x] Tactical allocation endpoint (6 strategies)
- [x] ETF X-ray service (look-through, overlap detection)
- [x] Enhanced exposure page (treemap + X-ray)
- [x] Share Checker service (5+ check types)
- [x] Share Checker UI page
- [x] AI Import route (Vercel AI SDK + Gemini + Zod schema)
- [x] AI Import UI (upload, parse, review, confirm)
- [x] Market Sentiment service
- [x] Market Sentiment dashboard (gauge, heatmap)
- [x] Factor analysis UI page
- [x] Correlations UI page (heatmap + rolling)
- [x] Tactical allocation UI page
- [x] AI Chat assistant (stretch — basic chat UI + streaming)

## Performance Targets

| Operation | Target | Strategy |
|-----------|--------|----------|
| Factor regression (10 assets) | < 2s | Python |
| Correlation matrix (20 assets) | < 1s | Python (or TypeScript) |
| Tactical signals | < 1s | Python |
| AI Import parse | < 10s | Gemini API (external) |
| Market sentiment fetch | < 3s | Yahoo Finance (external) |

## Notes for the Agent

- AI features require `GOOGLE_GENERATIVE_AI_API_KEY` — gracefully degrade if absent
- ETF holdings: hardcode common AU ETFs initially (VAS, VGS, IOZ, A200, VDHG)
- Factor data: Kenneth French library is free public CSV — download monthly
- Share Checker is lightweight — can run on every portfolio page load (cache results)
- Market Sentiment: respect Yahoo Finance rate limits
- AI Chat is a stretch goal — implement basic UI first, enhance later
- Tactical allocation page should link to backtest page with pre-filled strategy config
- Correlations are fast to compute — can be done in TypeScript if Python overhead unwanted
