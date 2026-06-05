# R1-P1d: Organisation, Bonds, API & Export

## Objective

Implement portfolio organisation features (custom groups, labels, sharing, consolidated view), bond/fixed income tracking, the public REST API, data export, watchlist, and the main dashboard.

## Prerequisites

- R1-P1a, P1b, P1c completed
- Reference: `docs/ACCOUNT.md`, `docs/ASSETS.md`, `docs/API.md`, `docs/ACTIONS.md`

## Recommended Skills

Invoke these skills for best-practice guidance during this phase:
- **next-best-practices** — API route handlers, middleware, error responses
- **vercel-react-best-practices** — Dashboard RSC patterns, component optimisation
- **routing-middleware** — Auth middleware for API routes, redirects
- **prisma-client-api** — Complex queries (sharing access checks, aggregations)
- **building-components** — Accessible drag-and-drop, interactive components
- **runtime-cache** — API response caching, rate limit counters

> **Note:** Bond analytics, corporate actions, and financial domain logic are not covered by general skills. Follow the plan details and reference `docs/ASSETS.md` and `docs/ACTIONS.md`.

---

## Task 1: Custom Groups & Labels

**File: `src/lib/actions/groups.ts`**

Server actions:
- `createCustomGroup(name)` — create group with empty categories
- `addCategory(groupId, name)` — add category to group
- `assignInstrument(categoryId, instrumentId)` — assign instrument to category
- `removeAssignment(categoryId, instrumentId)`
- `deleteGroup(groupId)`
- `getGroups()` — return all groups with categories and assignments

**File: `src/lib/actions/labels.ts`**

Server actions:
- `createLabel(name)` — create label
- `assignLabel(holdingId, labelId)` — attach label to holding
- `removeLabel(holdingId, labelId)`
- `deleteLabel(labelId)`
- `getLabels()` — all labels with holding counts

**File: `src/app/(dashboard)/settings/groups/page.tsx`**

Drag-and-drop UI for managing custom groups:
- Create/rename/delete groups
- Create/rename/delete categories within groups
- Drag instruments from "Ungrouped" into categories

**File: `src/app/(dashboard)/settings/labels/page.tsx`**

Label management: create labels, assign to holdings via checkboxes.

---

## Task 2: Portfolio Sharing

**File: `src/lib/actions/sharing.ts`**

- `sharePortfolio(portfolioId, email, accessLevel)` — create PortfolioShare
- `updateShareAccess(shareId, accessLevel)` — change access level
- `removeShare(shareId)` — revoke access
- `getSharedPortfolios()` — portfolios shared with current user

Middleware check: in all portfolio server actions, verify access via:
```typescript
async function verifyPortfolioAccess(portfolioId: string, requiredLevel: "read" | "write" | "admin")
```

**File: `src/app/(dashboard)/settings/sharing/page.tsx`**

Share management UI: list shared users, invite new, change access level, remove.

---

## Task 3: Consolidated View

**File: `src/app/(dashboard)/portfolio/consolidated/page.tsx`**

Aggregate view across all user portfolios:
- Combined holdings table (deduplicate same instrument across portfolios)
- Total value, total gain/loss
- Select which portfolios to include
- Run any report in consolidated mode

---

## Task 4: Corporate Actions

**File: `src/lib/actions/corporate-actions.ts`**

Handle corporate events:
- `recordSplit(holdingId, ratio, date)` — create SPLIT transaction adjusting quantity
- `recordConsolidation(holdingId, ratio, date)` — reverse split
- `recordMerger(sourceHoldingId, targetInstrumentCode, quantity, date)` — MERGER_OUT + MERGER_IN
- `recordBonus(holdingId, quantity, date)` — BONUS transaction
- `recordReturnOfCapital(holdingId, amountPerShare, date)` — RETURN_OF_CAPITAL reducing cost base
- `recordRightsIssue(holdingId, quantity, price, date)` — RIGHTS_ISSUE as buy
- `recordDemerger(holdingId, newInstrumentCode, costBaseAllocation, date)` — RETURN_OF_CAPITAL + new BUY

**File: `src/app/(dashboard)/portfolio/[id]/holdings/[holdingId]/actions/page.tsx`**

Corporate actions recording UI: select action type, enter parameters, preview impact, confirm.

---

## Task 5: Cash Accounts

**File: `src/lib/actions/cash-accounts.ts`**

- `createCashAccount(portfolioId, name, currency)`
- `addCashTransaction(accountId, type, amount, date, description)`
- `getCashAccount(id)` — with transactions
- `syncTradesWithCash(portfolioId)` — auto-generate cash flows from trade settlements

**File: `src/app/(dashboard)/portfolio/[id]/cash/page.tsx`**

Cash account management: list accounts, transaction history, add/edit transactions.

---

## Task 6: Bond & Fixed Income Tracking

**File: `src/lib/calculations/bond-analytics.ts`**

Calculate bond portfolio metrics:
- `calculateYTM(faceValue, couponRate, price, yearsToMaturity)` — yield to maturity
- `calculateModifiedDuration(ytm, couponRate, yearsToMaturity, frequency)`
- `calculateAccruedInterest(faceValue, couponRate, lastCouponDate, settlementDate, frequency)`
- `generateCouponSchedule(instrument)` — upcoming coupon payment dates and amounts
- `getMaturityLadder(holdings)` — list of holdings by maturity date
- `getCreditQualityBreakdown(holdings)` — distribution by credit rating
- `calculateWeightedAverageMaturity(holdings, prices)` — WAM

**File: `src/app/(dashboard)/portfolio/[id]/bonds/page.tsx`**

Bond dashboard:
- Summary cards: Portfolio YTM, WAM, Modified Duration
- Maturity ladder chart (bar chart by year)
- Coupon calendar (next 12 months)
- Credit quality pie chart
- Holdings table with bond-specific columns

**File: `src/lib/services/maturity-alerts.ts`**

Check for bonds maturing within configurable window (30/60/90 days). Flag on dashboard.

---

## Task 7: Watchlist

**File: `src/lib/actions/watchlist.ts`**

- `addToWatchlist(instrumentCode, marketCode, notes?)`
- `removeFromWatchlist(itemId)`
- `updateWatchlistItem(itemId, { notes, alertAbove, alertBelow })`
- `getWatchlist()` — with current prices

**File: `src/app/(dashboard)/tools/watchlist/page.tsx`**

Watchlist page:
- Table: Symbol, Name, Price, Change %, 1W/1M/YTD/1Y performance, Notes
- Add button (opens instrument search)
- Inline note editing
- Price alert configuration
- "Add to portfolio" quick action

---

## Task 8: Public REST API

**File: `src/app/api/v1/auth/token/route.ts`**

Token verification middleware. All `/api/v1/` routes require Bearer token.

**File: `src/lib/api/middleware.ts`**

```typescript
export async function authenticateApiRequest(request: Request): Promise<{ userId: string; scope: string } | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const hashedToken = await hashToken(token);
  const apiToken = await db.apiToken.findUnique({ where: { tokenHash: hashedToken } });
  if (!apiToken || (apiToken.expiresAt && apiToken.expiresAt < new Date())) return null;
  await db.apiToken.update({ where: { id: apiToken.id }, data: { lastUsed: new Date() } });
  return { userId: apiToken.userId, scope: apiToken.scope };
}
```

**File: `src/lib/api/rate-limit.ts`**

Simple in-memory rate limiter (100 req/min per token). Use Vercel Runtime Cache API for distributed rate limiting.

**API Route Files (`src/app/api/v1/`):**

| Endpoint | File | Methods |
|----------|------|---------|
| `/api/v1/portfolios` | `portfolios/route.ts` | GET (list), POST (create) |
| `/api/v1/portfolios/[id]` | `portfolios/[id]/route.ts` | GET, PATCH, DELETE |
| `/api/v1/portfolios/[id]/holdings` | `portfolios/[id]/holdings/route.ts` | GET, POST |
| `/api/v1/portfolios/[id]/holdings/[holdingId]` | `.../[holdingId]/route.ts` | GET, DELETE |
| `/api/v1/portfolios/[id]/transactions` | `.../transactions/route.ts` | GET, POST |
| `/api/v1/portfolios/[id]/transactions/[txId]` | `.../[txId]/route.ts` | GET, PATCH, DELETE |
| `/api/v1/portfolios/[id]/performance` | `.../performance/route.ts` | GET |
| `/api/v1/portfolios/[id]/diversity` | `.../diversity/route.ts` | GET |
| `/api/v1/portfolios/[id]/import` | `.../import/route.ts` | POST (CSV upload) |
| `/api/v1/portfolios/[id]/export` | `.../export/route.ts` | GET (CSV download) |
| `/api/v1/market/search` | `market/search/route.ts` | GET |
| `/api/v1/market/quote/[code]` | `market/quote/[code]/route.ts` | GET |

Each route:
1. Authenticate via `authenticateApiRequest`
2. Check scope (read vs write)
3. Validate input with Zod
4. Call the same service functions as the UI
5. Return JSON with proper HTTP status codes
6. Include pagination headers for list endpoints

---

## Task 9: Data Export

**File: `src/lib/export/csv-export.ts`**

Export functions:
- `exportTrades(portfolioId, dateRange)` — All transactions as CSV
- `exportHoldings(portfolioId)` — Current positions with cost base and market value
- `exportDividends(portfolioId, dateRange)` — Dividend/distribution records
- `exportFullBackup(portfolioId)` — JSON with all data (holdings, transactions, settings)

**File: `src/app/(dashboard)/settings/export/page.tsx`**

Export UI: select format (CSV Trades / CSV Holdings / CSV Dividends / JSON Backup), date range, download button.

---

## Task 10: Dashboard

**File: `src/app/(dashboard)/page.tsx`**

Main dashboard showing:
- Total portfolio value (card)
- Today's change (card, colour-coded)
- Total gain/loss since inception (card)
- Portfolio growth line chart (last 12 months)
- Top 5 holdings by value (mini table)
- Recent dividends (last 5)
- Upcoming maturities (if bonds held)
- Quick actions: Add Investment, Import, View Reports

---

## Task 11: DRP Recording

**File: `src/lib/actions/drp.ts`**

- `recordDRP(holdingId, dividendTxId, sharesReceived, pricePerShare)` — creates a BUY transaction linked to the dividend
- `enableDRP(holdingId)` / `disableDRP(holdingId)` — toggle flag

---

## Deliverables Checklist

- [ ] Custom groups CRUD with categories and assignments
- [ ] Labels CRUD with holding attachment
- [ ] Portfolio sharing (invite, access levels, verify on actions)
- [ ] Consolidated view page
- [ ] Corporate actions recording (7 action types)
- [ ] Cash accounts CRUD with sync
- [ ] Bond analytics calculations (YTM, duration, WAM, coupon schedule)
- [ ] Bond dashboard page with charts
- [ ] Maturity alert system
- [ ] Watchlist CRUD with price alerts
- [ ] Public REST API (12+ endpoints with auth, rate limiting, pagination)
- [ ] API token management (generate, revoke, scopes)
- [ ] Data export (3 CSV formats + JSON backup)
- [ ] Main dashboard page
- [ ] DRP recording

## Notes for the Agent

- API responses follow format: `{ data: T, meta?: { page, limit, total } }`
- API errors follow format: `{ error: { code: string, message: string, details?: any } }`
- Rate limiting: return 429 with `Retry-After` header
- All API endpoints validate input with same Zod schemas used internally
- Bond analytics formulas: use standard financial math (no external library needed for basic calcs)
- The dashboard is the landing page after login — it must load fast (use RSC for data fetching)
