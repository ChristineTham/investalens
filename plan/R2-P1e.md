# R2-P1e: AI Features, FIRE Calculator, X-ray & Tools

## Objective

Implement AI-powered features (Gemini/Antigravity SDK for statement parsing), FIRE calculator, Portfolio X-ray (ETF look-through), Share Checker, and Market Sentiment dashboard.

## Prerequisites

- R2-P1d complete (all analytics endpoints working)
- Reference: `docs/ADVANCED.md` (AI Features), `docs/TOOLS.md`

---

## Task 1: AI Importer (Gemini / Antigravity SDK)

**File: `api/python/ai_import.py`**

Use Google Antigravity SDK to parse unstructured financial statements:

```python
from http.server import BaseHTTPRequestHandler
import google.antigravity as ag
import json
from utils.response import success_response, error_response, parse_body

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        data = parse_body(self)
        content = data.get("content", "")  # Text content from OCR/PDF extraction
        document_type = data.get("documentType", "broker_statement")
        
        # Create Antigravity agent for structured extraction
        agent = ag.Agent(
            model="gemini-2.0-flash",
            system_instruction="""You are a financial document parser. 
            Extract all transactions from the provided document.
            Return a JSON array of transactions with these fields:
            - tradeDate (ISO 8601)
            - instrumentCode (ticker symbol)
            - marketCode (exchange, e.g. "ASX")
            - transactionType (BUY, SELL, DIVIDEND, etc.)
            - quantity (number)
            - price (number per unit)
            - brokerage (number, 0 if not shown)
            - currency (3-letter code)
            - comments (any notes)
            If the document is a dividend statement, extract:
            - paymentDate, instrumentCode, grossAmount, frankingCredits, netAmount
            Only return valid JSON. No explanations."""
        )
        
        response = agent.generate(content)
        
        try:
            transactions = json.loads(response.text)
            
            result = {
                "transactions": transactions,
                "confidence": response.metadata.get("confidence", 0.8),
                "warnings": [],
            }
            
            # Validate extracted data
            for i, tx in enumerate(transactions):
                if not tx.get("tradeDate"):
                    result["warnings"].append(f"Row {i}: missing date")
                if not tx.get("instrumentCode"):
                    result["warnings"].append(f"Row {i}: missing instrument code")
            
            success_response(self, result)
        except json.JSONDecodeError:
            error_response(self, 422, "AI could not parse document into structured format")
```

**File: `src/lib/actions/ai-import.ts`**

Server action for AI import:
1. Accept file upload (PDF, image, text)
2. Extract text content (use pdf-parse for PDFs, or send image directly)
3. Call Python AI endpoint
4. Return parsed transactions for user review
5. User confirms/edits, then standard import pipeline handles the rest

**File: `src/app/(dashboard)/portfolio/[id]/import/ai/page.tsx`**

AI Import UI:
- Upload zone (PDF, PNG, JPG, TXT)
- Document type selector (Broker Statement, Dividend Statement, Tax Statement, Contract Note)
- "Parse with AI" button
- Review extracted transactions (editable table)
- Confidence indicators per field
- Confirm & Import button

---

## Task 2: FIRE Calculator

**File: `src/lib/calculations/fire.ts`**

Financial Independence, Retire Early calculator:

```typescript
interface FIREInput {
  currentAge: number;
  retirementAge: number;
  currentPortfolioValue: number;
  annualContribution: number;
  contributionGrowthRate: number;  // annual increase in contributions
  expectedReturnRate: number;      // from portfolio analytics
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
    pessimistic: { fireAge: number; successRate: number };  // -2% return
    baseline: { fireAge: number; successRate: number };
    optimistic: { fireAge: number; successRate: number };   // +2% return
  };
  monteCarloProbability?: number;  // if MC simulation run
}

function calculateFIRE(input: FIREInput): FIREResult;
```

**File: `src/app/(dashboard)/tools/fire/page.tsx`**

FIRE Calculator page:
- Input form (all FIRE parameters with sensible defaults)
- Auto-fill portfolio value from actual data
- Auto-fill expected return from historical performance
- Results:
  - FIRE number (big card)
  - Years to FIRE / FIRE age
  - Projection chart (portfolio growth over time)
  - Expense vs withdrawal comparison
  - Scenario comparison (pessimistic/baseline/optimistic)
  - "Run Monte Carlo" button → calls MC endpoint with FIRE parameters
  - Super balance inclusion toggle (for Australian retirement)

---

## Task 3: Portfolio X-ray (ETF Look-through)

**File: `src/lib/services/etf-xray.ts`**

Decompose ETF holdings to show underlying exposure:

```typescript
interface ETFHolding {
  code: string;
  name: string;
  weight: number;
  sector?: string;
  country?: string;
}

interface XrayResult {
  topHoldings: Array<{ name: string; totalWeight: number; sources: string[] }>;
  sectorExposure: Record<string, number>;
  countryExposure: Record<string, number>;
  overlap: Array<{ stock: string; etfs: string[]; combinedWeight: number }>;
}

async function xrayPortfolio(holdings: HoldingWithInstrument[]): Promise<XrayResult>;
```

Data source: ETF composition from provider websites (scrape top holdings) or store in DB.

**File: `src/app/(dashboard)/tools/xray/page.tsx`**

X-ray page:
- Auto-detect ETFs in portfolio
- Show combined underlying holdings (top 20)
- Overlap detection (same stock held in multiple ETFs)
- Sector/country exposure (stacked bar chart)
- Concentration risk warnings

---

## Task 4: Share Checker

**File: `src/lib/services/share-checker.ts`**

Detect potential issues in portfolio:
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
- Same instrument in multiple portfolios (intended?)
- Concentration risk (>20% in one holding)
- Stale prices (>5 days old, excluding weekends)
- Missing cost base
- Unusual transaction patterns

**File: `src/app/(dashboard)/tools/checker/page.tsx`**

Share Checker page: list of findings with severity badges and fix suggestions.

---

## Task 5: Market Sentiment Dashboard

**File: `src/lib/services/market-sentiment.ts`**

Aggregate market indicators:
```typescript
interface SentimentData {
  fearGreedIndex: number;          // 0-100
  vixLevel: number;
  marketBreadth: number;           // % stocks above 200-day MA
  putCallRatio: number;
  sectorHeatmap: Record<string, number>;  // sector → daily return
  asxSummary: {
    open: number;
    close: number;
    change: number;
    changePercent: number;
    volume: number;
  };
}
```

Source data from Yahoo Finance (^AXJO for ASX200, ^VIX for volatility).

**File: `src/app/(dashboard)/tools/sentiment/page.tsx`**

Market Sentiment page:
- Fear/Greed gauge (0-100 dial)
- ASX200 intraday chart
- Sector heatmap (treemap with green/red blocks)
- Key market indicators table
- News headlines (optional, from RSS)

---

## Task 6: AI Chat Assistant (Stretch)

**File: `src/app/(dashboard)/tools/assistant/page.tsx`**

Optional AI assistant using Vercel AI SDK + Gemini:
- Chat interface
- Can answer questions about the portfolio
- Suggests optimisation actions
- Explains report results
- Uses function calling to fetch portfolio data

```typescript
// src/app/api/chat/route.ts
import { streamText } from "ai";
import { google } from "@ai-sdk/google";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: google("gemini-2.0-flash"),
    system: "You are a helpful portfolio analysis assistant...",
    messages,
  });
  return result.toDataStreamResponse();
}
```

---

## Deliverables Checklist

- [ ] AI Importer Python endpoint (Antigravity SDK)
- [ ] AI Import server action (file upload + text extraction)
- [ ] AI Import UI (upload, parse, review, confirm)
- [ ] FIRE Calculator (TypeScript, full projection)
- [ ] FIRE Calculator UI with charts
- [ ] ETF X-ray service (look-through decomposition)
- [ ] X-ray UI with overlap detection
- [ ] Share Checker (5+ check types)
- [ ] Share Checker UI with findings
- [ ] Market Sentiment service (Yahoo Finance data)
- [ ] Market Sentiment dashboard (gauge, heatmap, chart)
- [ ] AI Chat assistant (stretch, Vercel AI SDK + Gemini)

## Notes for the Agent

- Antigravity SDK requires `GOOGLE_API_KEY` in environment
- AI Import should gracefully degrade if API key not configured (show "unavailable" message)
- FIRE Calculator is pure TypeScript — no Python dependency
- ETF top holdings data: hardcode for common AU ETFs (VAS, VGS, IOZ, A200, VDHG) initially
- Share Checker runs on every portfolio view (lightweight) — cache results
- Market Sentiment: respect Yahoo Finance rate limits (5 req/sec)
- AI Chat is a stretch goal — implement basic UI first, can enhance later
