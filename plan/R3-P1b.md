# R3-P1b: International Brokers, Tax & Corporate Actions

## Objective

Add international broker CSV templates, withholding tax tracking, international corporate action handling, and global ETF exposure mapping.

## Prerequisites

- R3-P1a complete (multi-market, FX rates working)
- Reference: `docs/DATA_IMPORT.md`, `docs/TAX.md`, `docs/ACTIONS.md`

## Recommended Skills

Invoke these skills for best-practice guidance during this phase:
- **next-best-practices** — Server actions for import pipeline
- **prisma-client-api** — Transaction-based import with rollback

> **Note:** International broker CSV formats, withholding tax DTA rates, and global corporate actions are entirely domain-specific. No general skills apply.

---

## Task 1: International Broker Templates

**File: `lib/import/templates.ts`** (extend)

Add international broker CSV mappings:

```typescript
// Add to existing brokerTemplates object:

interactive_brokers: {
  mapping: {
    tradeDate: "Date/Time",
    instrumentCode: "Symbol",
    quantity: "Quantity",
    price: "T. Price",
    transactionType: "Buy/Sell",
    brokerage: "Comm/Fee",
    currency: "Currency",
    exchangeRate: "Proceeds",
    marketCode: null,  // Derive from symbol suffix
  },
  dateFormat: "yyyy-mm-dd",
  decimalSeparator: ".",
  transactionTypeMap: { "BOT": "BUY", "SLD": "SELL" },
},

schwab: {
  mapping: {
    tradeDate: "Date",
    instrumentCode: "Symbol",
    quantity: "Quantity",
    price: "Price",
    transactionType: "Action",
    brokerage: "Fees & Comm",
    currency: null,  // Always USD
  },
  dateFormat: "mm/dd/yyyy",
  decimalSeparator: ".",
  transactionTypeMap: { "Buy": "BUY", "Sell": "SELL", "Reinvest Dividend": "DRP", "Cash Dividend": "DIVIDEND" },
},

fidelity: {
  mapping: {
    tradeDate: "Run Date",
    instrumentCode: "Symbol",
    quantity: "Quantity",
    price: "Price ($)",
    transactionType: "Action",
    brokerage: "Commission ($)",
  },
  dateFormat: "mm/dd/yyyy",
  decimalSeparator: ".",
  transactionTypeMap: { "YOU BOUGHT": "BUY", "YOU SOLD": "SELL", "DIVIDEND RECEIVED": "DIVIDEND" },
},

trading212: {
  mapping: {
    tradeDate: "Time",
    instrumentCode: "Ticker",
    quantity: "No. of shares",
    price: "Price / share",
    transactionType: "Action",
    currency: "Currency (Price / share)",
    exchangeRate: "Exchange rate",
    brokerage: null,  // Always 0
  },
  dateFormat: "yyyy-mm-dd hh:mm:ss",
  decimalSeparator: ".",
  transactionTypeMap: { "Market buy": "BUY", "Market sell": "SELL", "Limit buy": "BUY", "Limit sell": "SELL" },
},

etoro: {
  mapping: {
    tradeDate: "Open Date",
    instrumentCode: "Asset",
    quantity: "Units",
    price: "Open Rate",
    transactionType: "Type",
  },
  dateFormat: "dd/mm/yyyy hh:mm:ss",
  decimalSeparator: ".",
  transactionTypeMap: { "Buy": "BUY", "Sell": "SELL" },
},

degiro: {
  mapping: {
    tradeDate: "Date",
    instrumentCode: "Product",
    quantity: "Quantity",
    price: "Price",
    transactionType: null,  // Derive from quantity sign
    brokerage: "Transaction costs",
    currency: "Currency",
    marketCode: "Venue",
  },
  dateFormat: "dd-mm-yyyy",
  decimalSeparator: ",",  // European decimal
},

saxo: {
  mapping: {
    tradeDate: "Trade Date",
    instrumentCode: "Instrument",
    quantity: "Amount",
    price: "Trade Price",
    transactionType: "B/S",
    brokerage: "Commission",
    currency: "Currency",
  },
  dateFormat: "yyyy-mm-dd",
  decimalSeparator: ".",
  transactionTypeMap: { "B": "BUY", "S": "SELL" },
},
```

---

## Task 2: Market Code Detection

**File: `lib/import/market-detector.ts`**

Auto-detect market from ticker symbols:
```typescript
function detectMarket(symbol: string, hints?: { currency?: string; venue?: string }): string {
  // Interactive Brokers: "AAPL" (US), "CBA.AX" (ASX), "VOD.L" (LSE)
  // If symbol has known suffix, extract market
  // If no suffix + USD currency → assume NYSE/NASDAQ
  // If venue provided (DEGIRO), map venue code to exchange
  // Fallback: search instrument in database
}
```

---

## Task 3: Withholding Tax Tracking

**File: `lib/calculations/withholding-tax.ts`**

Track foreign withholding tax:
```typescript
interface WithholdingTaxRate {
  country: string;      // Source country of income
  residentCountry: string;  // Investor's tax residency
  dtaRate: number;      // Double Tax Agreement rate
  defaultRate: number;  // Rate without DTA
}

// Common DTA rates for Australian residents
const AU_DTA_RATES: Record<string, number> = {
  US: 0.15,    // 15% on US dividends
  UK: 0.15,
  CA: 0.15,
  DE: 0.15,
  JP: 0.10,
  NZ: 0.05,
  HK: 0.00,   // No withholding tax
  SG: 0.00,
  IE: 0.15,   // Important for many ETFs domiciled in Ireland
};

function calculateWithholdingTax(
  grossDividend: number,
  sourceCountry: string,
  residentCountry: string
): { withheld: number; net: number; foreignTaxCredit: number };
```

**File: `lib/reports/tax/foreign-income.ts`**

Foreign Income Report:
- Group by source country
- Show gross income, withholding tax, net income
- Foreign tax credit available (for ATO claim)
- Map to ATO form codes (20E Foreign Source Income, 20O Foreign Tax Credits)

---

## Task 4: International Tax Considerations

**File: `lib/reports/tax/international-cgt.ts`**

Extend CGT for international holdings:
- Cost base in AUD at purchase date FX rate
- Proceeds in AUD at sale date FX rate
- Forex component of gain/loss (separately reportable)
- CGT discount still applies (based on AUD holding period)
- Wash sale consideration (across markets)

**Update taxable income report**: Add foreign income section with country breakdown.

---

## Task 5: Global Corporate Actions

**File: `lib/actions/corporate-actions.ts`** (extend)

Additional corporate actions for international markets:
- `recordADRConversion(holdingId, localShares, adrRatio)` — ADR ↔ ordinary shares
- `recordSpinOff(holdingId, newInstrumentCode, allocationRatio, costBasePercent)` — US-style spin-off
- `recordStockDividend(holdingId, sharesReceived, fmv)` — stock dividend (not DRP)
- `recordMandatoryTakeover(holdingId, cashPerShare, acquirerCode?, sharesPerShare?)` — scheme of arrangement

Currency handling for corporate actions:
- All values stored in instrument's local currency
- FX conversion applied when calculating AUD cost base impact

---

## Task 6: International ETF Exposure

**File: `lib/data/etf-holdings.ts`** (extend)

Add international ETF composition data:
```typescript
const ETF_HOLDINGS: Record<string, ETFComposition> = {
  // Australian-listed international ETFs
  "VGS.AX": { currency: "USD", country: "US", top10: [...], sectors: {...} },
  "VGAD.AX": { currency: "AUD", country: "US", top10: [...], hedged: true },
  "IVV.AX": { currency: "AUD", country: "US", index: "S&P 500" },
  "NDQ.AX": { currency: "AUD", country: "US", index: "NASDAQ 100" },
  "VEU.AX": { currency: "USD", country: "INTL" },
  
  // US-listed ETFs (if held directly)
  "SPY": { currency: "USD", country: "US", index: "S&P 500" },
  "QQQ": { currency: "USD", country: "US", index: "NASDAQ 100" },
  "VTI": { currency: "USD", country: "US", index: "Total US Market" },
  "VXUS": { currency: "USD", country: "INTL" },
};
```

---

## Task 7: Reporting Currency UI Updates

Update all report pages to:
- Show values in portfolio's reporting currency
- Show local currency value in tooltip/secondary column
- Indicate FX rate used
- Allow temporary switch to different display currency

**File: `components/ui/currency-display.tsx`**

Component that formats values with currency symbol and optional conversion tooltip.

---

## Task 8: Multi-Currency Import Handling

**File: `lib/import/currency-import.ts`**

During import:
- If transaction has explicit currency + FX rate → use as provided
- If transaction has currency but no FX rate → fetch from ExchangeRate table
- If neither → use instrument's exchange currency
- Store both local amount and reporting currency amount on transaction

---

## Deliverables Checklist

- [ ] 7 international broker templates (IB, Schwab, Fidelity, Trading212, eToro, Degiro, Saxo)
- [ ] Market code auto-detection from symbol
- [ ] Withholding tax rate database (DTA rates for AU residents)
- [ ] Foreign income report (country breakdown, tax credits)
- [ ] International CGT calculation (FX at buy/sell dates)
- [ ] Forex component separation in CGT
- [ ] International corporate actions (ADR, spin-off, stock dividend, takeover)
- [ ] International ETF composition data
- [ ] Reporting currency UI updates (all reports)
- [ ] Currency display component
- [ ] Multi-currency import handling (auto-FX lookup)

## Notes for the Agent

- Interactive Brokers CSV is complex — has multiple report sections in one file. Parse "Trades" section only.
- Degiro uses European decimal separator (comma) — handle in parser
- US stocks on Australian brokers (CMC, Stake) are already handled in R1 — just need FX conversion
- Foreign tax credits: AU allows credit up to DTA rate even if more was withheld
- ADR ratio: 1 ADR may represent N ordinary shares (varies by company)
- Always store the FX rate at the time of transaction for audit trail
- Hedged ETFs (VGAD) have different currency exposure than unhedged (VGS)
