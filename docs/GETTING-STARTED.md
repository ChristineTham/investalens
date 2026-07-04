# Getting Started with InvestaLens

> **📖 Part of the [InvestaLens User Manual](../USER-MANUAL.md)** | Next: [Data Import](DATA_IMPORT.md)

> **Implementation Status (R1 MVP)**
>
> | Feature                            | Status                           |
> | ---------------------------------- | -------------------------------- |
> | Account registration & login       | ✅ Implemented                   |
> | Google OAuth                       | ✅ Implemented (requires config) |
> | Create/manage portfolios           | ✅ Implemented                   |
> | Add holdings via instrument search | ✅ Implemented                   |
> | Manual transaction entry           | ✅ Implemented                   |
> | CSV import with field mapping      | ✅ Implemented                   |
> | DRP recording (toggle + manual BUY) | ✅ Implemented                  |
> | Automatic DRP (registry reconcile) | ⏳ To be Implemented              |
> | DRP rounding options               | ⏳ To be Implemented              |
> | Labels                             | ✅ Implemented                   |
> | Performance calc (simple/nominal)  | ✅ Implemented                   |
> | Time-weighted / money-weighted (IRR) returns | ⏳ To be Implemented   |
> | Sharesight API import              | ⏳ To be Implemented (R4)        |
> | Broker API sync                    | ⏳ To be Implemented (R4)        |
> | Auto portfolio creation on signup  | ⏳ To be Implemented             |

This guide walks you through setting up your InvestaLens portfolio and importing your investments.

## Overview

Your first step in InvestaLens is to add your investments into your portfolio. Once added, InvestaLens will automatically calculate your performance, capital gains and losses, dividend income and more.

You can choose to record either all of your previous historical buy and sell trades, or simply set up some opening balances for each holding and then record trades from that point forward.

## Setting Up Your Portfolio

After you create your account, create your first portfolio yourself: from the sidebar click **Portfolio**, then **New Portfolio**, and choose a name, tax residency, and entity type. InvestaLens portfolios represent tax entities — the base currency, tax settings and reporting are all related to the tax residency country. _(Automatic portfolio creation on signup is ⏳ planned.)_

> **Note:** InvestaLens only imports buy and sell trades. Cash balances and cash transactions are never imported automatically. To track your cash alongside your investments, set up a Cash Account under **Accounts** — you can import bank statements (OFX/QFX, QIF, or CSV) and reconcile them against your portfolio trades. See [ACCOUNTS.md](ACCOUNTS.md).

### Portfolio Structure Recommendations

#### Multiple Brokers, Different Tax Entities

If your broker accounts belong to different tax entities (e.g. one in your personal name and one in a company or trust), keep them in **separate portfolios**. A single portfolio represents one tax entity — mixing tax entities across portfolios will produce inaccurate tax reports.

#### Multiple Brokers, Same Tax Entity

If all your broker accounts are under the same tax entity, you have two options:

**Option 1: All brokers in one portfolio**
Add all holdings into a single portfolio and use custom groups to organise holdings by broker. This keeps your tax reporting consolidated — one Taxable Income Report and one CGT Report covers everything at tax time.

**Option 2: One portfolio per broker**
Separate each broker into its own portfolio and use the Consolidated View to see your total portfolio value across all brokers. Note that at tax time you will need to generate reports for each portfolio separately.

#### When to Separate Brokers into Different Portfolios

Separate portfolios are strongly recommended if you hold the same stock across multiple brokers. InvestaLens tracks holdings at the portfolio level and cannot separate cost base parcels by broker account. If you sell shares via one broker but still hold the same stock via another, InvestaLens cannot distinguish between the two — this can lead to inaccurate cost base and capital gains calculations.

## Adding Your Investments

There are several ways to add your investments into your InvestaLens portfolio. Open the import hub via **Portfolio → select portfolio → "Import"**:

1. **Quick Import** — One-step import for recognised brokers (CommSec, SelfWealth, Stake, CMC Invest, nabtrade, FIIG): pick a file and it imports immediately
2. **Guided Import** — Choose a category — Share Transactions, Bonds & Fixed Interest, or Cash / Bank Statement — and map columns through a short wizard
3. **Custom Import** — Dedicated importers for complex multi-sheet files (e.g. the FIIG Securities data extract covering trades, income, and fees)
4. **AI Importer** — Parse PDFs, screenshots, or non-standard formats with Gemini AI
5. **Add manually** — Manually add individual holdings and trades one by one

All import paths automatically resolve duplicates, so re-importing the same file is safe.

### Method 1: Bulk Import from a CSV File (Recommended)

Importing a CSV spreadsheet containing your historical buy and sell trades is the most flexible way to populate your portfolio. Almost every broker and financial institution allows you to download your transaction history as a spreadsheet.

InvestaLens supports **custom field mapping**, meaning you can import from any broker regardless of their CSV format. You map your file's columns to InvestaLens fields. _(Saving your own column mapping as a reusable template is ⏳ not yet implemented; recognised brokers already have built-in templates via Quick Import.)_

See [DATA_IMPORT.md](DATA_IMPORT.md) for the full list of supported fields and mapping capabilities.

#### Requirements

For your spreadsheet to successfully import:

- The first row must contain a header for each column
- The spreadsheet must contain at minimum the 5 compulsory data fields (column names don't need to match — you'll map them during import)

#### Compulsory Fields

| Field            | Description                                        | Format                                     | Example    |
| ---------------- | -------------------------------------------------- | ------------------------------------------ | ---------- |
| Trade Date       | The date of the trade                              | Any date format (configured during import) | 2005-05-22 |
| Instrument Code  | The instrument code (stock ticker, fund name, etc) | code                                       | TLS        |
| Quantity         | The quantity of shares bought or sold              | Integer (positive value)                   | 1000       |
| Price in Dollars | The price per share in the currency of the market  | Decimal (up to 6dp)                        | 12.123456  |
| Transaction Type | Whether the trade was a buy or sell                | BUY, SELL                                  | BUY        |

#### Optional Fields

| Field              | Description                                           | Format                      | Example                | Notes                                                                   |
| ------------------ | ----------------------------------------------------- | --------------------------- | ---------------------- | ----------------------------------------------------------------------- |
| Combined Code      | Instrument Code and Market Code separated by a period | InstrumentCode.MarketCode   | TLS.ASX                | Can be used instead of separate Instrument Code and Market Code columns |
| Market Code        | The market code                                       | ASX, NZX, LSE, NYSE, NASDAQ | ASX                    |                                                                         |
| Exchange Rate      | Exchange rate applied to share price                  | Decimal (up to 6dp)         | 1.123456               | Defaults to closing rate on trade date                                  |
| Brokerage          | Brokerage fee paid per trade                          | Decimal (up to 2dp)         | 39.95                  | Defaults to zero                                                        |
| Brokerage Currency | Currency the brokerage was paid in                    | ISO 4217 format             | AUD                    | Defaults to market currency                                             |
| Comments           | Comments stored with the transaction                  | text                        | Recommended by advisor |                                                                         |

#### Step-by-Step Import Guide

1. Log into your broker and download your historical trades as a spreadsheet file
2. Open the downloaded file and verify it has the 5 compulsory fields, column headings on the first row, and the correct data format
3. In InvestaLens, open **Portfolio → select your portfolio → "Import"**
4. Choose **Quick Import** (if your broker is recognised) or **Guided Import**
5. **Upload** your spreadsheet file (.csv, .txt, or .xlsx)
6. **Configure** — select the category (e.g. Share Transactions) and confirm the date and price format
7. **Map** your spreadsheet columns to InvestaLens fields — ensure the 5 compulsory fields are matched; for columns that aren't needed, select "-"
8. **Review** the parsed rows (green = valid, red = error) and fix any rejected rows
9. Click **Import** to finalise, then open your portfolio to view the imported holdings

After import, InvestaLens calculates performance as **simple, nominal** returns (capital gain + income, net of fees) and records any dividend, coupon, and corporate-action transactions contained in the import. See [ACTIONS.md](ACTIONS.md) for details on how corporate actions are handled.

#### Opening Balances

If you do not have all of your historical buy and sell transactions, you can set up your current positions without full trade history: record a **Buy** (or **Transfer In**) transaction at your cost base for each holding, dated when you acquired (or transferred) the position. Trades from that point forward are then recorded normally.

### Method 2: Import via Sharesight API ⏳ Not yet implemented

> **⏳ Planned (R4).** Sharesight connection is not yet available. The steps below describe the intended experience.

If you have a Sharesight account, you can connect it to InvestaLens:

1. Click **+ Add Investment**
2. Select **Connect Sharesight**
3. Authenticate with your Sharesight credentials
4. Select which portfolios to import
5. InvestaLens will sync your holdings and transactions

This is entirely optional — InvestaLens works without Sharesight.

### Method 3: Import from a Supported Broker ⏳ Not yet implemented

> **⏳ Planned (R4).** Direct broker API sync is not yet available — use Quick Import with a downloaded CSV instead. The steps below describe the intended experience.

If InvestaLens has a direct integration with your broker:

1. Navigate to **+ Add Investment**
2. Select your broker from the list of supported brokers
3. Follow the prompts to connect your broker account
4. InvestaLens will import your trading history automatically

### Method 4: Add Holdings Manually

To add a new holding that isn't in your portfolio yet:

1. From your portfolio, click **Add Holding**
2. Search for the holding by company name or ticker code
3. Enter the trade details:
   - **Transaction type** — Buy (or Transfer In at cost base if you're setting up an existing position)
   - **Trade date** — the date of the original purchase
   - **Quantity** — number of shares
   - **Unit/share price** — price per share at time of purchase
   - **Brokerage** — fees paid
4. Click **Add to Portfolio**

## Adding Trades, Dividends and Adjustments

Once your portfolio is set up, there are multiple ways to keep it current:

### Adding Trades

- **Broker import** — Automatically sync new trades from supported brokers _(⏳ Not yet implemented — R4)_
- **CSV import** — Bulk import new trades from a spreadsheet
- **Manual entry** — Add individual buy/sell trades from a holding's detail page
- **Trade confirmation emails** — Forward broker trade confirmations to automatically import trades _(⏳ Not yet implemented)_

### Dividends and Adjustments

InvestaLens handles dividends in two ways:

- **Automatic** — Dividends are automatically generated for holdings in your portfolio based on market data (corporate actions such as splits, bonus issues and returns of capital are recorded manually via the Corporate Actions page)
- **Manual** — Add dividends or adjustments manually when needed

For supported asset types and which actions are automated, see [ASSETS.md](ASSETS.md) and [ACTIONS.md](ACTIONS.md).

## Dividend Reinvestments (DRP)

The dividend reinvestment feature allows you to record DRP transactions. When a dividend reinvestment is recorded, both a dividend record and a reinvestment trade (for the new shares) are added to your portfolio.

### Why Track DRP in InvestaLens?

InvestaLens picks up market buy and sell transactions from your broker, but if your share registry reinvests dividends instead of paying them as cash, you need to reflect that in InvestaLens — otherwise your holding quantity and cost base will be inaccurate.

### Automatic DRP ⏳ Not yet implemented

> **⏳ Planned.** Automatic DRP reconciliation against the share registry is not yet available — use **Manual DRP** below. The steps here describe the intended experience.

Automatic DRP is available for select ASX and NZX listed holdings where the company offers a Dividend Reinvestment Plan and InvestaLens has the DRP data available.

To enable automatic DRP:

1. Navigate to the individual holding page
2. Click the **Edit Holding** tab
3. Enable **Automatically reinvest dividends**
4. Return to the **Trades & Income** tab
5. Click **Review automatic transactions** to reconcile against your share registry
6. Click **Confirm selection**

### Manual DRP

To record dividend reinvestments today:

1. On the individual holding page, use the **DRP toggle** to mark the holding as participating in a dividend reinvestment plan
2. When a reinvested dividend occurs, add a manual **BUY** transaction for the shares received (date = payment date, quantity = shares allotted, price = DRP issue price, brokerage = 0)

The dividend itself remains recorded as income, and the BUY establishes the new parcel's cost base.

### DRP Rounding Options ⏳ Not yet implemented

> **⏳ Planned.** Configurable rounding (round down, round to nearest, round up, round down and track residual balance, no rounding) is not yet available — the manual BUY workflow above sidesteps rounding entirely, since you enter the exact shares allotted. See [GAPS.md](GAPS.md).

## Using Labels

Labels allow you to report on specific subsets of holdings within a portfolio, creating custom filtered performance reports.

Labels can be anything you like, and holdings can have more than one label assigned. For example, you could label holdings based on which broker recommended them, or by investment profile (income vs growth).

### Creating and Applying Labels

Labels are managed under **Settings → Labels**:

1. Create a label by typing its name and saving it
2. On the label's row, **attach** the holdings you want tagged (and detach them later if things change) — a holding can carry more than one label

### Using Labels in Reports

Once labels are created and holdings attached, use the **Label filter** in the Performance Report to view performance for specific subsets of your portfolio.

## After Importing Your Portfolio

Once your portfolio is populated:

1. **Review your holdings** — Check that all positions, quantities and cost bases are correct
2. **Verify dividends** — Confirm any unconfirmed dividends match your records
3. **Set up DRP** — Enable dividend reinvestment tracking where applicable
4. **Add labels and custom groups** — Organise holdings for better reporting (see [ACCOUNT.md](ACCOUNT.md))
5. **Explore reports** — Run performance, tax and diversity reports (see [TOOLS.md](TOOLS.md) and [TAX.md](TAX.md))
6. **Set up ongoing sync** — Configure automatic trade imports from your broker _(⏳ planned — R4; re-import a CSV in the meantime, duplicates are resolved automatically)_

## Performance Calculation

InvestaLens currently reports **simple, nominal** returns: capital gain (market value − cost base) plus income (dividends, interest, and coupons, net of accrued interest), less brokerage and custody/management fees, indexed from the start of the selected period. Returns are **not** time-weighted or money-weighted (they do not neutralise the size and timing of contributions and withdrawals) and are **not** inflation-indexed. The per-portfolio **Performance Method** setting (Simple or Compound) exists but is not currently used in calculations _(⏳)_.

> **⏳ Planned enhancement:** true time-weighted and money-weighted (IRR) return methodologies. See [GAPS.md](GAPS.md).

Performance figures include:

- Capital gains and losses (market value − cost base)
- Dividend, interest, and distribution income (net of accrued interest)
- Brokerage and custody/management fees
- Currency conversion for foreign holdings _(automatic FX for CGT and valuation is ⏳ planned — R3)_

For an inflation-indexed (CPI) view, the Tax reports apply the ATO capital-gains methodology, including the indexation method for eligible assets (acquired before 21 September 1999).

---

## Related Documentation

| Document                         | Description                                                       |
| -------------------------------- | ----------------------------------------------------------------- |
| [DATA_IMPORT.md](DATA_IMPORT.md) | Full import architecture, CSV field mapping, and broker templates |
| [TOOLS.md](TOOLS.md)             | All performance, allocation, and tax reports                      |
| [ACCOUNT.md](ACCOUNT.md)         | Portfolio settings, sharing, custom groups, and labels            |
| [ACCOUNTS.md](ACCOUNTS.md)       | Bank & cash accounts, statement import, categories, reconciliation |
| [ASSETS.md](ASSETS.md)           | Supported asset types and stock exchanges                         |
| [TAX.md](TAX.md)                 | Australian tax reporting (CGT, taxable income, AMIT)              |
| [ACTIONS.md](ACTIONS.md)         | Corporate actions (splits, mergers, demergers, rights issues)     |
