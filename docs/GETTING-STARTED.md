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
> | DRP recording                      | ✅ Implemented (server action)   |
> | Labels                             | ✅ Implemented                   |
> | Performance calculation (MWR)      | ✅ Implemented                   |
> | Broker API sync                    | ⏳ To be Implemented (R4)        |
> | Auto portfolio creation on signup  | ⏳ To be Implemented             |

This guide walks you through setting up your InvestaLens portfolio and importing your investments.

## Overview

Your first step in InvestaLens is to add your investments into your portfolio. Once added, InvestaLens will automatically calculate your performance, capital gains and losses, dividend income and more.

You can choose to record either all of your previous historical buy and sell trades, or simply set up some opening balances for each holding and then record trades from that point forward.

## Setting Up Your Portfolio

When you create your account, a default portfolio is automatically created with the settings of your selected tax residency country. InvestaLens portfolios represent tax entities — the base currency, tax settings and reporting are all related to the tax residency country.

> **Note:** InvestaLens only imports buy and sell trades. Cash balances and cash transactions are never imported automatically. To track your cash alongside your investments, set up a Cash Account.

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

There are several ways to add your investments into your InvestaLens portfolio:

1. **Import from a CSV file** — Bulk import your historical trades from a CSV/spreadsheet exported from any broker or institution, with custom field mapping
2. **Import via Sharesight** — If you use Sharesight, import your portfolio via their API
3. **Import from your broker** — If InvestaLens supports a direct integration with your broker
4. **Add manually** — Manually add individual holdings and trades one by one

### Method 1: Bulk Import from a CSV File (Recommended)

Importing a CSV spreadsheet containing your historical buy and sell trades is the most flexible way to populate your portfolio. Almost every broker and financial institution allows you to download your transaction history as a spreadsheet.

InvestaLens supports **custom field mapping**, meaning you can import from any broker regardless of their CSV format. You map your file's columns to InvestaLens fields, and can save these mappings as templates for future imports.

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
3. In InvestaLens, click **+ Add Investment**
4. Select the **Upload via file** option
5. Click inside the upload box and select your spreadsheet file
6. Select **Individual trades** as the import type
7. Click **Confirm Upload**
8. Select the date and price format used in your file and click **Next**
9. Map your spreadsheet columns to InvestaLens fields — ensure the 5 compulsory fields are matched. For columns that aren't needed, select "-". Optionally save this mapping as a template for future imports from the same broker.
10. Review the itemised list of trades being imported
11. Fix any rejected trades by clicking on the incorrect data and making adjustments
12. Click **Import** to finalise
13. Click **Go to Portfolio** to view your imported holdings

After import, InvestaLens will calculate performance using a money-weighted return methodology (taking account of the size and timing of cash flows) and will automatically create dividends and corporate actions for the imported holdings. See [ACTIONS.md](ACTIONS.md) for details on how corporate actions are handled.

#### Opening Balances

If you do not have all of your historical buy and sell transactions, you can import with **Opening Balances** instead. This sets up your current positions without full trade history.

### Method 2: Import via Sharesight API

If you have a Sharesight account, you can connect it to InvestaLens:

1. Click **+ Add Investment**
2. Select **Connect Sharesight**
3. Authenticate with your Sharesight credentials
4. Select which portfolios to import
5. InvestaLens will sync your holdings and transactions

This is entirely optional — InvestaLens works without Sharesight.

### Method 3: Import from a Supported Broker

If InvestaLens has a direct integration with your broker:

1. Navigate to **+ Add Investment**
2. Select your broker from the list of supported brokers
3. Follow the prompts to connect your broker account
4. InvestaLens will import your trading history automatically

### Method 4: Add Holdings Manually

To add a new holding that isn't in your portfolio yet:

1. Click **Add Investment** (or **Add Holding** from the investments page)
2. Search for the holding by company name or ticker code
3. Enter the trade details:
   - **Trade date** — the date of the original purchase
   - **Transaction type** — Buy or Opening Balance
   - **Quantity** — number of shares
   - **Unit/share price** — price per share at time of purchase
   - **Exchange rate** — (for foreign stocks only)
   - **Brokerage** — fees paid
4. Optionally add comments and attachments for future reference
5. Click **Save Trade**

## Adding Trades, Dividends and Adjustments

Once your portfolio is set up, there are multiple ways to keep it current:

### Adding Trades

- **Broker import** — Automatically sync new trades from supported brokers
- **CSV import** — Bulk import new trades from a spreadsheet
- **Manual entry** — Add individual buy/sell trades from a holding's detail page
- **Trade confirmation emails** — Forward broker trade confirmations to automatically import trades

### Dividends and Adjustments

InvestaLens handles dividends in two ways:

- **Automatic** — Dividends and corporate actions are automatically generated for holdings in your portfolio based on market data
- **Manual** — Add dividends or adjustments manually when needed

For supported asset types and which actions are automated, see [ASSETS.md](ASSETS.md) and [ACTIONS.md](ACTIONS.md).

## Dividend Reinvestments (DRP)

The dividend reinvestment feature allows you to record DRP transactions. When a dividend reinvestment is recorded, both a dividend record and a reinvestment trade (for the new shares) are added to your portfolio.

### Why Track DRP in InvestaLens?

InvestaLens picks up market buy and sell transactions from your broker, but if your share registry reinvests dividends instead of paying them as cash, you need to reflect that in InvestaLens — otherwise your holding quantity and cost base will be inaccurate.

### Automatic DRP

Automatic DRP is available for select ASX and NZX listed holdings where the company offers a Dividend Reinvestment Plan and InvestaLens has the DRP data available.

To enable automatic DRP:

1. Navigate to the individual holding page
2. Click the **Edit Holding** tab
3. Enable **Automatically reinvest dividends**
4. Return to the **Trades & Income** tab
5. Click **Review automatic transactions** to reconcile against your share registry
6. Click **Confirm selection**

### Manual DRP

For international stocks or holdings without automatic DRP data:

1. On the individual holding page, select the **Trades & Income** tab
2. Click **Confirm** on the dividend you want to reinvest
3. Tick **Dividend Reinvestment**
4. Enter the number of shares received
5. Enter the share price (or use the automated price)
6. Click **Save and confirm payout**

### DRP Rounding Options

- **Round down** — Rounds down shares allocated; residual value is lost
- **Round to the nearest** — Standard rounding rules apply
- **Round up** — Rounds up shares allocated
- **Round down and track balance** — Rounds down and carries residual forward to the next reinvestment
- **No rounding** — No rounding applied (suited to brokers that support fractional DRP)

> **Important:** If using "round down and track balance", confirm dividends in chronological order as each balance carries forward to the next.

## Using Labels

Labels allow you to report on specific subsets of holdings within a portfolio, creating custom filtered performance reports.

Labels can be anything you like, and holdings can have more than one label assigned. For example, you could label holdings based on which broker recommended them, or by investment profile (income vs growth).

### Creating and Applying Labels

Labels can be created and applied from:

- The **Settings** tab
- The **Performance Report** (via "Filter by Label" > "Manage")
- An **Individual Holding Page** (via "Manage Labels")

To create a label:

1. Navigate to one of the above locations
2. Type in the label name
3. Select the holdings to apply the label to
4. Click **Create Label**

### Using Labels in Reports

Once labels are created, use the **Filter by Label** dropdown in the Performance Report to view performance for specific subsets of your portfolio.

## After Importing Your Portfolio

Once your portfolio is populated:

1. **Review your holdings** — Check that all positions, quantities and cost bases are correct
2. **Verify dividends** — Confirm any unconfirmed dividends match your records
3. **Set up DRP** — Enable dividend reinvestment tracking where applicable
4. **Add labels and custom groups** — Organise holdings for better reporting (see [ACCOUNT.md](ACCOUNT.md))
5. **Explore reports** — Run performance, tax and diversity reports (see [TOOLS.md](TOOLS.md) and [TAX.md](TAX.md))
6. **Set up ongoing sync** — Configure automatic trade imports from your broker

## Performance Calculation

InvestaLens uses a money-weighted return methodology, meaning investment performance takes account of the size and timing of cash flows. This gives you a true picture of your actual investment experience, including the impact of when you added or withdrew funds.

Performance is calculated including:

- Capital gains and losses
- Dividend and distribution income
- Currency fluctuations (for foreign holdings)
- Brokerage and fees

---

## Related Documentation

| Document                         | Description                                                       |
| -------------------------------- | ----------------------------------------------------------------- |
| [DATA_IMPORT.md](DATA_IMPORT.md) | Full import architecture, CSV field mapping, and broker templates |
| [TOOLS.md](TOOLS.md)             | All performance, allocation, and tax reports                      |
| [ACCOUNT.md](ACCOUNT.md)         | Portfolio settings, sharing, custom groups, and labels            |
| [ASSETS.md](ASSETS.md)           | Supported asset types and stock exchanges                         |
| [TAX.md](TAX.md)                 | Australian tax reporting (CGT, taxable income, AMIT)              |
| [ACTIONS.md](ACTIONS.md)         | Corporate actions (splits, mergers, demergers, rights issues)     |
