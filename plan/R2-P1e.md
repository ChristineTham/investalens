# R2-P1e: AI Features, FIRE Calculator, X-ray & Tools

## Objective

Implement AI-powered features (Gemini/Antigravity SDK for statement parsing), FIRE calculator, Portfolio X-ray (ETF look-through), Share Checker, and Market Sentiment dashboard.

## Prerequisites

- R2-P1d complete (all analytics endpoints working)
- Reference: `docs/ADVANCED.md` (AI Features), `docs/TOOLS.md`

## Recommended Skills

Invoke these skills for best-practice guidance during this phase:
- **ai-sdk** — Vercel AI SDK for Gemini chat interface, structured output, streaming
- **building-components** — Custom chat UI components with Base UI primitives
- **vercel-react-best-practices** — FIRE calculator chart, market sentiment UI
- **next-best-practices** — Streaming route for AI chat, server actions

> **Note:** FIRE calculations, ETF decomposition, and market sentiment aggregation are domain-specific. Use `ai-sdk` for Gemini/Antigravity integration patterns. Build chat UI with Base UI + shadcn patterns (no AI Elements — that requires Radix).

---

## Task 1: AI Importer (Gemini / Antigravity SDK)

**File: `app/api/ai-import/route.ts`**

Use Vercel AI SDK with Google Gemini to parse unstructured financial statements. This runs in the **TypeScript layer** (not Python):

```typescript
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

const TransactionSchema = z.object({
  tradeDate: z.string().describe("ISO 8601 date"),
  instrumentCode: z.string().describe("Ticker symbol"),
  marketCode: z.string().describe("Exchange code, e.g. ASX"),
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
Extract all transactions from the following document content.

${content}`,
  });

  return Response.json(object);
}
```

> **Note:** The AI importer uses the Vercel AI SDK (`ai` + `@ai-sdk/google`) from the TypeScript layer with structured output (Zod schema). `google-antigravity` exists but is an agent framework (not a doc parser) — see `docs/KNOWLEDGE.md` for details.

**File: `lib/actions/ai-import.ts`**

Server action for AI import:
1. Accept file upload (PDF, image, text)
2. Extract text content (use pdf-parse for PDFs, or send image directly)
3. Call the TypeScript AI route handler (not Python)
4. Return parsed transactions for user review
5. User confirms/edits, then standard import pipeline handles the rest

**File: `app/(dashboard)/portfolio/[id]/import/ai/page.tsx`**

AI Import UI:
- Upload zone (PDF, PNG, JPG, TXT)
- Document type selector (Broker Statement, Dividend Statement, Tax Statement, Contract Note)
- "Parse with AI" button
- Review extracted transactions (editable table)
- Confidence indicators per field
- Confirm & Import button

---

## Task 2: FIRE Calculator

**File: `lib/calculations/fire.ts`**

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

**File: `app/(dashboard)/tools/fire/page.tsx`**

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

**File: `lib/services/etf-xray.ts`**

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

**File: `app/(dashboard)/tools/xray/page.tsx`**

X-ray page:
- Auto-detect ETFs in portfolio
- Show combined underlying holdings (top 20)
- Overlap detection (same stock held in multiple ETFs)
- Sector/country exposure (stacked bar chart)
- Concentration risk warnings

---

## Task 4: Share Checker

**File: `lib/services/share-checker.ts`**

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

**File: `app/(dashboard)/tools/checker/page.tsx`**

Share Checker page: list of findings with severity badges and fix suggestions.

---

## Task 5: Market Sentiment Dashboard

**File: `lib/services/market-sentiment.ts`**

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

**File: `app/(dashboard)/tools/sentiment/page.tsx`**

Market Sentiment page:
- Fear/Greed gauge (0-100 dial)
- ASX200 intraday chart
- Sector heatmap (treemap with green/red blocks)
- Key market indicators table
- News headlines (optional, from RSS)

---

## Task 6: AI Chat Assistant (Stretch)

**File: `app/(dashboard)/tools/assistant/page.tsx`**

Optional AI assistant using Vercel AI SDK + Gemini:
- Chat interface
- Can answer questions about the portfolio
- Suggests optimisation actions
- Explains report results
- Uses function calling to fetch portfolio data

```typescript
// app/api/chat/route.ts
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

- [ ] AI Importer TypeScript endpoint (Vercel AI SDK + Gemini)
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

- Vercel AI SDK Google provider requires `GOOGLE_GENERATIVE_AI_API_KEY` in environment
- AI Import should gracefully degrade if API key not configured (show "unavailable" message)
- FIRE Calculator is pure TypeScript — no Python dependency
- ETF top holdings data: hardcode for common AU ETFs (VAS, VGS, IOZ, A200, VDHG) initially
- Share Checker runs on every portfolio view (lightweight) — cache results
- Market Sentiment: respect Yahoo Finance rate limits (5 req/sec)
- AI Chat is a stretch goal — implement basic UI first, can enhance later
