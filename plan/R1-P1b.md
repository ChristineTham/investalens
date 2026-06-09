# R1-P1b: Import Engine & Market Data

## Status

- Completed: 2026-06-09
- Completion note: CSV parser, field mapper, dedup engine, 9 broker templates, import pipeline server action, 5-step import wizard UI, Yahoo Finance provider, price service, cron endpoint, instrument search autocomplete — all implemented and lint-clean.

## Objective

Build the CSV import engine with custom field mapping, broker templates, validation/deduplication pipeline, and the market data fetching system (Yahoo Finance for ASX).

## Prerequisites

- R1-P1a completed (schema, auth, CRUD exist)
- Reference: `docs/DATA_IMPORT.md`, `docs/GETTING-STARTED.md`

## Recommended Skills

Invoke these skills for best-practice guidance during this phase:

- **next-best-practices** — Server actions, route handlers, file upload patterns
- **runtime-cache** — Caching price data (Vercel Runtime Cache API)
- **prisma-client-api** — Batch inserts, upserts, transactions for import pipeline
- **vercel-react-best-practices** — Multi-step wizard UI performance
- **neon-postgres-egress-optimizer** — Efficient queries for price lookups

---

## Task 1: CSV Parser & Upload

**File: `lib/import/csv-parser.ts`**

Create a CSV parsing utility using `papaparse`:

- Accept a `File` or string content
- Auto-detect delimiter (comma, semicolon, tab)
- Return typed rows with headers
- Handle encoding issues (UTF-8, UTF-8 BOM, Latin-1)

**File: `lib/import/types.ts`**

Define interfaces:

```typescript
interface FieldMapping {
  tradeDate: string | null; // Column name mapped to trade date
  instrumentCode: string | null;
  quantity: string | null;
  price: string | null;
  transactionType: string | null;
  marketCode?: string | null;
  brokerage?: string | null;
  currency?: string | null;
  exchangeRate?: string | null;
  comments?: string | null;
  combinedCode?: string | null; // "TLS.ASX" format
  couponRate?: string | null;
  maturityDate?: string | null;
  faceValue?: string | null;
  paymentFrequency?: string | null;
}

interface ImportConfig {
  mapping: FieldMapping;
  dateFormat: string; // "dd/mm/yyyy" | "mm/dd/yyyy" | "yyyy-mm-dd" etc.
  decimalSeparator: string; // "." | ","
  transactionTypeMap?: Record<string, string>; // Map broker-specific types to ours
}

interface ParsedTransaction {
  tradeDate: Date;
  instrumentCode: string;
  marketCode: string;
  quantity: number;
  price: number;
  transactionType: string;
  brokerage: number;
  currency: string;
  exchangeRate: number;
  comments: string;
  // Bond fields
  couponRate?: number;
  maturityDate?: Date;
  faceValue?: number;
  paymentFrequency?: string;
}

interface ImportResult {
  imported: ParsedTransaction[];
  rejected: Array<{
    row: number;
    data: Record<string, string>;
    errors: string[];
  }>;
  duplicates: Array<{ row: number; existingId: string }>;
}
```

---

## Task 2: Field Mapping Engine

**File: `lib/import/mapper.ts`**

Implement the mapping logic:

- Take raw CSV rows + FieldMapping config
- Parse dates according to configured format
- Parse numbers handling decimal separators
- Map transaction types (broker-specific → InvestaLens standard)
- Split combined codes ("TLS.ASX" → code: "TLS", market: "ASX")
- Return `ParsedTransaction[]` with validation errors per row

**Validation rules:**

- Trade date must be a valid date, not in the future
- Quantity must be numeric and non-zero
- Price must be numeric and >= 0
- Transaction type must be one of the 16 supported types
- Instrument code must be non-empty

---

## Task 3: Deduplication Engine

**File: `lib/import/dedup.ts`**

Detect potential duplicate transactions:

- Match on: instrumentCode + tradeDate + quantity + price + transactionType
- Allow user to skip or force-import flagged duplicates
- Return dedup matches with existing transaction IDs

---

## Task 4: Broker Templates

**File: `lib/import/templates.ts`**

Pre-built mapping configurations for Australian brokers:

```typescript
export const brokerTemplates: Record<string, ImportConfig> = {
  commsec: {
    mapping: {
      tradeDate: "Date",
      instrumentCode: "Code",
      quantity: "Quantity",
      price: "Price",
      transactionType: "Type",
      brokerage: "Brokerage",
      marketCode: null,
    },
    dateFormat: "dd/mm/yyyy",
    decimalSeparator: ".",
    transactionTypeMap: { B: "BUY", S: "SELL" },
  },
  selfwealth: {
    /* ... */
  },
  stake: {
    /* ... */
  },
  cmc_markets: {
    /* ... */
  },
  cmc_invest: {
    /* ... */
  },
  bell_direct: {
    /* ... */
  },
  nabtrade: {
    /* ... */
  },
  fiig: {
    /* ... */
  },
  interactive_brokers: {
    /* ... */
  },
};
```

Fill in realistic column names for each broker based on their known CSV export formats.

---

## Task 5: Import Pipeline (Server Action)

**File: `lib/actions/import.ts`**

Server action that orchestrates the full import:

1. Create ImportJob record (status: "processing")
2. Parse CSV with papaparse
3. Apply field mapping
4. Validate each row
5. Run deduplication against existing transactions
6. For each valid row:
   - Find or create Instrument
   - Find or create Holding
   - Create Transaction
7. Update ImportJob with counts and errors
8. Return ImportResult

---

## Task 6: Import UI

**File: `app/(dashboard)/portfolio/[id]/import/page.tsx`**

Multi-step import wizard:

1. **Upload** — File dropzone (react-dropzone), select import type (Individual trades / Opening balances)
2. **Configure** — Select date format, decimal separator, optionally pick a broker template
3. **Map** — Show column headers from CSV, let user map each to an InvestaLens field. Show preview of first 5 rows.
4. **Review** — Show parsed transactions in a table. Highlight errors and duplicates in red/yellow. Allow inline editing of rejected rows.
5. **Import** — Confirm button. Show progress. Display summary (imported/rejected/duplicates).

**File: `components/forms/field-mapper.tsx`**

A dropdown-based UI for mapping CSV columns to InvestaLens fields. Show "skip" option for unneeded columns.

**File: `components/forms/import-review-table.tsx`**

Table showing parsed transactions before import. Colour-coded status column (valid/error/duplicate).

---

## Task 7: Market Data Provider

**File: `lib/providers/market-data.ts`**

Define the provider interface:

```typescript
interface MarketDataProvider {
  getQuote(code: string, market: string): Promise<Quote | null>;
  getHistoricalPrices(
    code: string,
    market: string,
    from: Date,
    to: Date
  ): Promise<PricePoint[]>;
  searchInstruments(
    query: string,
    market?: string
  ): Promise<InstrumentSearchResult[]>;
}

interface Quote {
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
}

interface PricePoint {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  adjustedClose: number;
  volume: number;
}
```

**File: `lib/providers/yahoo-finance.ts`**

Implement Yahoo Finance provider:

- Use Yahoo Finance API v8 endpoints (public, no key required)
- `GET https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=...`
- For ASX stocks, append `.AX` to the ticker (e.g. "CBA.AX")
- Handle rate limiting (delay between requests)
- Parse OHLCV response into PricePoint[]

**File: `lib/providers/instrument-search.ts`**

Search endpoint:

- `GET https://query2.finance.yahoo.com/v1/finance/search?q={query}`
- Filter results by exchange if market specified
- Return code, name, exchange, type

---

## Task 8: Price Fetching Service

**File: `lib/services/price-service.ts`**

- Fetch prices for instruments missing today's price
- Batch requests (max 5 concurrent)
- Store in Price table
- Background job: `fetchMissingPrices(portfolioId)` — called after login / on portfolio view

**File: `app/api/cron/prices/route.ts`**

Vercel cron endpoint (configured in vercel.json) to fetch daily prices for all active instruments:

- Run at market close (6 PM AEST for ASX)
- Only fetch instruments with active holdings
- Rate limit to avoid Yahoo Finance blocks

Add to `vercel.json`:

```json
{
  "crons": [{ "path": "/api/cron/prices", "schedule": "0 8 * * 1-5" }]
}
```

---

## Task 9: Instrument Search UI

**File: `components/forms/instrument-search.tsx`**

Autocomplete search component:

- Debounced input (300ms)
- Shows dropdown with matching instruments (code, name, exchange)
- On select, passes instrument data to parent
- Used in: Add Holding, Import mapper, Watchlist

---

## Deliverables Checklist

- [ ] CSV parser with auto-detection
- [ ] Field mapping engine with date/number parsing
- [ ] Deduplication logic
- [ ] 8+ broker templates (CommSec, SelfWealth, Stake, CMC Markets, CMC Invest, Bell Direct, nabtrade, FIIG)
- [ ] Import server action (full pipeline)
- [ ] Multi-step import wizard UI (5 steps)
- [ ] Market data provider interface
- [ ] Yahoo Finance implementation (quotes + historical + search)
- [ ] Price fetching service with caching
- [ ] Cron endpoint for daily price updates
- [ ] Instrument search autocomplete component
- [ ] Mapping template save/load (MappingTemplate model)

## Notes for the Agent

- Yahoo Finance ASX tickers use `.AX` suffix
- Never store API responses with user data in the same request (separation of concerns)
- Price fetching should be resilient — if Yahoo fails, mark instrument as "stale" and retry later
- CSV import must handle large files (10K+ rows) — process in batches of 100
- All monetary values stored as Prisma Decimal (never JavaScript float)
