# R3-P1a: Multi-Market Infrastructure & FX

## Objective

Build multi-market support: exchange registry, international instrument lookup, FX rate fetching/storage, multi-currency valuation, and currency-adjusted performance calculations.

## Prerequisites

- R1 + R2 complete
- Open Exchange Rates API key (free tier: 1000 req/month)
- Reference: `docs/ARCHITECTURE.md` (External Services)

## Recommended Skills

Invoke these skills for best-practice guidance during this phase:
- **runtime-cache** — FX rate caching strategy (6-hour TTL)
- **next-best-practices** — Cron route handlers, API patterns
- **env-vars** — API key management (OPEN_EXCHANGE_RATES_APP_ID)
- **prisma-client-api** — ExchangeRate table queries, unique constraints
- **neon-postgres-egress-optimizer** — Efficient price + FX joins

> **Note:** Exchange registry data, currency gain/loss calculations, and multi-currency valuation are domain-specific financial logic.

---

## Task 1: Exchange Registry

**File: `src/lib/data/exchanges.ts`**

Define supported exchanges:
```typescript
interface Exchange {
  mic: string;           // Market Identifier Code (ISO 10383)
  name: string;
  country: string;
  currency: string;
  timezone: string;
  yahooSuffix: string;   // Yahoo Finance ticker suffix
  tradingHours: { open: string; close: string };
}

export const EXCHANGES: Record<string, Exchange> = {
  ASX: { mic: "XASX", name: "Australian Securities Exchange", country: "AU", currency: "AUD", timezone: "Australia/Sydney", yahooSuffix: ".AX", tradingHours: { open: "10:00", close: "16:00" } },
  NYSE: { mic: "XNYS", name: "New York Stock Exchange", country: "US", currency: "USD", timezone: "America/New_York", yahooSuffix: "", tradingHours: { open: "09:30", close: "16:00" } },
  NASDAQ: { mic: "XNAS", name: "NASDAQ", country: "US", currency: "USD", timezone: "America/New_York", yahooSuffix: "", tradingHours: { open: "09:30", close: "16:00" } },
  LSE: { mic: "XLON", name: "London Stock Exchange", country: "GB", currency: "GBP", timezone: "Europe/London", yahooSuffix: ".L", tradingHours: { open: "08:00", close: "16:30" } },
  TSX: { mic: "XTSE", name: "Toronto Stock Exchange", country: "CA", currency: "CAD", timezone: "America/Toronto", yahooSuffix: ".TO", tradingHours: { open: "09:30", close: "16:00" } },
  HKEX: { mic: "XHKG", name: "Hong Kong Stock Exchange", country: "HK", currency: "HKD", timezone: "Asia/Hong_Kong", yahooSuffix: ".HK", tradingHours: { open: "09:30", close: "16:00" } },
  SGX: { mic: "XSES", name: "Singapore Exchange", country: "SG", currency: "SGD", timezone: "Asia/Singapore", yahooSuffix: ".SI", tradingHours: { open: "09:00", close: "17:00" } },
  TSE: { mic: "XTKS", name: "Tokyo Stock Exchange", country: "JP", currency: "JPY", timezone: "Asia/Tokyo", yahooSuffix: ".T", tradingHours: { open: "09:00", close: "15:00" } },
  // ... 50+ more exchanges
  XETRA: { mic: "XETR", name: "XETRA (Frankfurt)", country: "DE", currency: "EUR", timezone: "Europe/Berlin", yahooSuffix: ".DE", tradingHours: { open: "09:00", close: "17:30" } },
  EURONEXT: { mic: "XPAR", name: "Euronext Paris", country: "FR", currency: "EUR", timezone: "Europe/Paris", yahooSuffix: ".PA", tradingHours: { open: "09:00", close: "17:30" } },
  NZX: { mic: "XNZE", name: "New Zealand Exchange", country: "NZ", currency: "NZD", timezone: "Pacific/Auckland", yahooSuffix: ".NZ", tradingHours: { open: "10:00", close: "16:45" } },
};
```

---

## Task 2: FX Rate Provider

**File: `src/lib/providers/fx-rates.ts`**

Open Exchange Rates integration:
```typescript
interface FXProvider {
  getRate(from: string, to: string, date?: Date): Promise<number>;
  getHistoricalRates(from: string, to: string, startDate: Date, endDate: Date): Promise<FXRatePoint[]>;
  getLatestRates(base: string): Promise<Record<string, number>>;
}

class OpenExchangeRatesProvider implements FXProvider {
  private apiKey: string;
  private baseUrl = "https://openexchangerates.org/api";
  
  async getRate(from: string, to: string, date?: Date): Promise<number> {
    // Check DB cache first
    const cached = await getCachedRate(from, to, date);
    if (cached) return cached;
    
    // Fetch from API
    const endpoint = date 
      ? `/historical/${formatDate(date)}.json`
      : "/latest.json";
    const response = await fetch(`${this.baseUrl}${endpoint}?app_id=${this.apiKey}&base=USD`);
    const data = await response.json();
    
    // Cross-rate calculation (everything via USD on free tier)
    const fromRate = data.rates[from];
    const toRate = data.rates[to];
    const rate = toRate / fromRate;
    
    // Cache in DB
    await storeRate(from, to, date || new Date(), rate);
    return rate;
  }
}
```

**File: `src/app/api/cron/fx-rates/route.ts`**

Daily FX rate fetcher:
- Fetch latest rates for all currencies in use
- Store in ExchangeRate table
- Run daily at 00:00 UTC

---

## Task 3: Multi-Currency Valuation

**File: `src/lib/calculations/currency.ts`**

Currency conversion utilities:
```typescript
// Convert a value from one currency to another at a specific date
async function convertCurrency(amount: number, from: string, to: string, date: Date): Promise<number>;

// Calculate currency gain/loss for a holding
function calculateCurrencyGain(
  buyAmount: number, buyFxRate: number,
  currentAmount: number, currentFxRate: number,
  reportingCurrency: string
): { localGain: number; currencyGain: number; totalGain: number };

// Get the FX rate at transaction date (for cost base in reporting currency)
async function getTransactionFxRate(transaction: Transaction, reportingCurrency: string): Promise<number>;
```

**File: `src/lib/calculations/multi-currency-performance.ts`**

Extend performance calculations:
```typescript
interface MultiCurrencyPerformance {
  localReturn: number;        // Return in instrument's currency
  currencyReturn: number;     // Return from FX movement
  totalReturn: number;        // Combined return in reporting currency
  fxImpact: number;           // $ value of currency gain/loss
}
```

---

## Task 4: Update Yahoo Finance Provider

**File: `src/lib/providers/yahoo-finance.ts`** (modify)

Update to support international tickers:
```typescript
function getYahooTicker(code: string, market: string): string {
  const exchange = EXCHANGES[market];
  if (!exchange) throw new Error(`Unknown market: ${market}`);
  return `${code}${exchange.yahooSuffix}`;
}
```

Handle special cases:
- US stocks: no suffix (AAPL, MSFT)
- LSE: suffix .L, prices in pence (divide by 100)
- HKEX: 4-digit codes (0005.HK for HSBC)
- TSE (Tokyo): 4-digit codes (7203.T for Toyota)

---

## Task 5: Multi-Currency Valuation Report

**File: `src/lib/reports/multi-currency-report.ts`**

Multi-Currency Valuation Report:
- Show each holding's value in both local and reporting currency
- FX rate used
- Currency gain/loss column
- Total portfolio value in reporting currency
- Option to show in any supported currency

---

## Task 6: Schema Updates

**Prisma schema additions:**

```prisma
// Add to Portfolio model
model Portfolio {
  // existing fields...
  reportingCurrency String @default("AUD")  // already exists but enforce usage
}

// ExchangeRate model (already exists, ensure populated)
model ExchangeRate {
  id        String   @id @default(cuid())
  fromCurrency String
  toCurrency   String
  date         DateTime
  rate         Decimal
  source       String @default("openexchangerates")
  createdAt    DateTime @default(now())
  @@unique([fromCurrency, toCurrency, date])
}
```

---

## Task 7: Currency Settings UI

**File: `src/app/(dashboard)/settings/currencies/page.tsx`**

Currency settings:
- Default reporting currency for new portfolios
- Per-portfolio reporting currency override
- Display: show values in local + reporting, or reporting only
- FX rate source display (last updated)

**Update instrument search:** Show exchange and currency when adding holdings from international markets.

---

## Task 8: Update Price Fetching

**File: `src/lib/services/price-service.ts`** (modify)

Update to handle multi-market:
- Fetch prices for instruments across all exchanges
- Respect trading hours (don't fetch when market closed)
- Handle different market holidays
- Store price currency alongside price value
- Batch by exchange to respect rate limits

---

## Deliverables Checklist

- [ ] Exchange registry (60+ exchanges with metadata)
- [ ] Open Exchange Rates provider (latest + historical)
- [ ] FX rate caching in DB
- [ ] Daily FX cron job
- [ ] Currency conversion utilities
- [ ] Currency gain/loss calculation (separate from capital gain)
- [ ] Multi-currency performance calculation
- [ ] Yahoo Finance international ticker mapping
- [ ] Multi-Currency Valuation Report
- [ ] Schema migration (ensure ExchangeRate populated)
- [ ] Currency settings UI
- [ ] Updated instrument search (shows exchange + currency)
- [ ] Updated price fetcher (multi-market aware)

## Notes for the Agent

- Open Exchange Rates free tier: base=USD only, 1000 req/month. Use cross-rates via USD.
- For historical FX, cache aggressively — rates don't change retroactively
- LSE prices in pence: divide by 100 to get GBP
- Tokyo/Hong Kong use numeric codes — store as string, not number
- Currency gain is taxable in Australia (separate CGT event)
- Always display which FX rate date was used (transparency)
- Portfolio reporting currency affects ALL reports — this is a fundamental change
