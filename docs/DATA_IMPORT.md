# Data Import Architecture

> **📖 Part of the [InvestaLens User Manual](../USER-MANUAL.md)** | Previous: [Getting Started](GETTING-STARTED.md) | Next: [Assets](ASSETS.md)

> **Implementation Status (R1 MVP)**
>
> | Feature                                                                                                   | Status                         |
> | --------------------------------------------------------------------------------------------------------- | ------------------------------ |
> | CSV parser (papaparse, auto-detect)                                                                       | ✅ Implemented                 |
> | Field mapping engine                                                                                      | ✅ Implemented                 |
> | Deduplication (all import paths)                                                                          | ✅ Implemented                 |
> | 9 broker templates (CommSec, SelfWealth, Stake, CMC Markets, CMC Invest, Bell Direct, nabtrade, FIIG, IB) | ✅ Implemented                 |
> | Multi-type import hub (shares, bonds, cash)                                                               | ✅ Implemented                 |
> | Quick (one-step) import for known brokers                                                                 | ✅ Implemented                 |
> | Cash / bank statement import (signed amount or debit/credit)                                              | ✅ Implemented                 |
> | Custom importers for complex files (FIIG multi-sheet extract)                                             | ✅ Implemented                 |
> | Bond income (coupons, principal) & custody fee import                                                     | ✅ Implemented                 |
> | Excel (.xlsx/.xls) upload                                                                                 | ✅ Implemented                 |
> | Mapping template save/load                                                                                | ⏳ To be Implemented           |
> | AI Importer (PDF/screenshot)                                                                              | ✅ Implemented (R2)            |
> | Broker API sync (Sharesight)                                                                              | ⏳ To be Implemented (R4)      |
> | CSV export (trades, holdings, dividends)                                                                  | ✅ Implemented (server action) |
> | JSON full backup                                                                                          | ✅ Implemented (server action) |
> | PDF export                                                                                                | ⏳ To be Implemented (R4)      |
> | Automated scheduled backups                                                                               | ⏳ To be Implemented (R4)      |

## Overview

InvestaLens is a **standalone portfolio tracker** that does not depend on any single external service. It supports importing investment data from multiple sources, giving users full flexibility over how they bring in their portfolio data.

Import sources include:

- **CSV / Excel files** from any broker or financial institution (with custom field mapping)
- **Quick import** for recognised brokers (one click, no manual mapping)
- **Cash / bank statements** imported into cash accounts
- **Custom importers** for complex multi-sheet files (e.g. the FIIG data extract)
- **Sharesight API** (OAuth2 integration for users who have Sharesight accounts)
- **Direct broker integrations** (where APIs are available)
- **Manual entry** (individual transactions added via the UI)

### Import Hub

The import page (**Portfolio → select portfolio → "Import"**) is organised as a hub with three paths:

| Path             | Description                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| **Quick Import** | One-step buttons for known brokers (CommSec, SelfWealth, Stake, CMC Invest, nabtrade, FIIG). Pick a file and it parses, deduplicates, and imports immediately — no review step. |
| **Guided Import**| Choose a category — Share Transactions, Bonds & Fixed Interest, or Cash / Bank Statement — then step through Upload → Configure → Map → Review → Import. |
| **Custom Import**| Dedicated routines for files templates cannot handle, such as the FIIG multi-sheet workbook. Each importer fully parses its file and emits normalised transactions, income, fees, and instrument metadata. |

Every path resolves duplicates against previously imported data, so re-running the same file is always safe.

## Design Principles

1. **Source-agnostic**: The internal data model is independent of any external service. All imports are normalised into a common schema.
2. **Flexible CSV import**: Users can import CSV files from any source and map columns to InvestaLens fields, accommodating any broker's export format.
3. **Extensible connectors**: New import sources can be added as plugins/connectors without changes to the core data model.
4. **No vendor lock-in**: Users own their data. Portfolios can be populated entirely without any third-party API.

## Import Sources

### 1. CSV Import (Primary)

The most flexible import method. Users can import CSV/spreadsheet files exported from any broker, trading platform, or financial institution.

#### Custom Field Mapping

InvestaLens provides a column mapping interface that allows users to:

- Map any CSV column to an InvestaLens field
- Define date formats (dd/mm/yyyy, mm/dd/yyyy, yyyy-mm-dd, etc.)
- Specify decimal separators and number formats
- Handle currency columns and exchange rates
- Skip or ignore irrelevant columns
- Save mapping templates for reuse with the same broker

#### Supported InvestaLens Fields

| Field             | Required | Description                                                |
| ----------------- | -------- | ---------------------------------------------------------- |
| Trade Date        | Yes      | Date the transaction occurred                              |
| Instrument Code   | Yes      | Ticker symbol or fund identifier                           |
| Quantity          | Yes      | Number of units traded                                     |
| Price             | Yes      | Price per unit                                             |
| Transaction Type  | Yes      | See supported types below                                  |
| Market Code       | No       | Exchange/market identifier (e.g. ASX, NYSE)                |
| Brokerage/Fees    | No       | Transaction costs                                          |
| Currency          | No       | Transaction currency (ISO 4217)                            |
| Exchange Rate     | No       | FX rate if applicable                                      |
| Comments/Notes    | No       | Free-text notes                                            |
| Coupon Rate       | No       | Annual coupon rate for bonds/fixed income (%)              |
| Maturity Date     | No       | Maturity/expiry date for bonds and term deposits           |
| Face Value        | No       | Par value per unit for bonds (default $100)                |
| Payment Frequency | No       | Coupon frequency (Monthly, Quarterly, Semi-Annual, Annual) |
| Accrued Interest  | No       | Accrued interest paid/received on a bond trade             |

#### Supported Transaction Types

| Type              | Description                                                           | Example                               |
| ----------------- | --------------------------------------------------------------------- | ------------------------------------- |
| BUY               | Purchase of securities                                                | Buying 100 shares of VAS              |
| SELL              | Sale of securities                                                    | Selling 50 shares of CBA              |
| DIVIDEND          | Cash dividend or distribution received                                | Quarterly dividend from BHP           |
| SPLIT             | Share split or consolidation adjustment                               | 2:1 stock split                       |
| INTEREST          | Interest income (bonds, cash accounts, term deposits)                 | Monthly interest on term deposit      |
| COUPON            | Bond coupon payment received                                          | Semi-annual coupon on corporate bond  |
| MATURITY          | Bond or term deposit reaching maturity (principal returned)           | Bond redeemed at par on maturity date |
| FEE               | Standalone fee not attached to a trade (platform fees, admin charges) | Annual platform fee                   |
| TRANSFER_IN       | Securities transferred into the portfolio from another account        | Broker-to-broker transfer             |
| TRANSFER_OUT      | Securities transferred out of the portfolio                           | Moving shares to another broker       |
| RETURN_OF_CAPITAL | Capital return reducing cost base                                     | Trust distribution (tax-deferred)     |
| ADJUSTMENT        | Manual quantity or cost base adjustment                               | Corporate action correction           |
| MERGER_IN         | Shares received from a merger/acquisition                             | Acquiring company shares received     |
| MERGER_OUT        | Shares cancelled in a merger/acquisition                              | Target company shares cancelled       |
| RIGHTS_ISSUE      | Shares acquired via a rights issue                                    | Renounceable rights exercised         |
| BONUS             | Bonus shares received (scrip issue)                                   | 1-for-10 bonus issue                  |

#### Mapping Templates

Users can save and share field mapping configurations for common brokers:

| Broker/Platform     | Region    | Notes                                       |
| ------------------- | --------- | ------------------------------------------- |
| CommSec             | Australia | Standard trade confirmation export          |
| SelfWealth          | Australia | Transaction history CSV                     |
| Stake               | AU/US     | Supports both AU and US markets             |
| Interactive Brokers | Global    | Activity statement flex query               |
| Schwab              | US        | Transaction history export                  |
| Vanguard            | AU/US     | Transaction history                         |
| CMC Markets         | Australia | Trade history export (CFD and stockbroking) |
| CMC Invest          | Australia | Investment platform transaction history     |
| Bell Direct         | Australia | Trade confirmations and settlement reports  |
| nabtrade            | Australia | Trade confirmations                         |
| FIIG Securities     | Australia | Bond and fixed income trade confirmations   |
| Sharesight          | Global    | Trade export (alternative to API)           |
| Custom              | Any       | User-defined mapping                        |

New templates can be contributed by users or added over time.

### 1a. Cash / Bank Statement Import

Under **Guided Import → Cash / Bank Statement**, you can import a bank or cash-account statement into a named cash account (created automatically if it doesn't exist). The mapper supports either:

- A single **signed Amount** column (positive = money in, negative = money out), or
- Separate **Debit** (money out) and **Credit** (money in) columns

An optional Type column is mapped to canonical cash types (deposit, withdrawal, interest, fee, dividend received, transfer in/out); when absent the direction is inferred from the sign. Account balances are updated automatically and duplicate rows (same date, amount, type, description) are skipped.

### 1b. Custom Importers (Complex Files)

Some files cannot be handled by simple column mapping — for example a workbook with several sheets. **Custom Import** runs a dedicated routine that fully parses the file and emits normalised data.

**FIIG Securities Data Extract** (`.xls`) is the built-in example. It consolidates multiple sheets in one import:

| Sheet             | Imported As                                                            |
| ----------------- | --------------------------------------------------------------------- |
| TransactionHistory| BUY / SELL bond trades (quantity = face value, price per $1 of face, with accrued interest) |
| IncomePayments    | COUPON income (interest) and RETURN_OF_CAPITAL (principal repayments)  |
| Fees              | Custody fee invoices recorded against the portfolio                    |
| SecurityStatic    | Instrument metadata — type, sector, coupon rate, payment frequency, maturity |

New custom importers are added as modules in `lib/import/custom/` and registered in the importer registry without changes to the core data model.

### 2. Sharesight API Integration

For users who already use Sharesight as their portfolio tracker, InvestaLens can import data via the Sharesight REST API. This is **one of many import options**, not a requirement.

See [SHARESIGHT_API.md](SHARESIGHT_API.md) for full API integration details.

### 3. Direct Broker Integrations

Where brokers provide APIs, InvestaLens can integrate directly:

- OAuth2 or API key authentication
- Automatic transaction sync
- Each broker connector is an independent module

### 4. Manual Entry

Users can always add transactions manually via the UI, useful for:

- One-off corrections
- Historical trades without digital records
- Non-standard assets (property, collectibles, private equity)

## Internal Data Model

All import sources normalise into the same internal schema:

```
ImportSource → Normaliser → InvestaLens Transaction Schema → Database
```

### Core Entities

| Entity              | Description                                        |
| ------------------- | -------------------------------------------------- |
| Portfolio           | A collection of holdings representing a tax entity |
| Transaction         | A buy, sell, dividend, or other event              |
| Position/Holding    | Current state of an instrument in a portfolio      |
| Security/Instrument | A tradeable asset (stock, ETF, fund, crypto)       |
| Distribution        | Dividend or income payment                         |

### Import Pipeline

1. **Ingest**: Raw data received (CSV upload, API response, manual entry)
2. **Parse**: Extract fields according to source format or user-defined mapping
3. **Validate**: Check required fields, data types, date ranges
4. **Normalise**: Convert to internal schema (resolve instrument codes, apply FX rates)
5. **Deduplicate**: Detect and flag potential duplicate transactions
6. **Store**: Persist to database with source provenance metadata

## Sync Strategy

| Method                         | Trigger             | Scope                       |
| ------------------------------ | ------------------- | --------------------------- |
| CSV import                     | Manual upload       | Batch of transactions       |
| API sync (Sharesight, brokers) | Manual or scheduled | Incremental since last sync |
| Manual entry                   | User action         | Single transaction          |

## Future Import Sources

The architecture supports adding new connectors for:

- Open Banking APIs (CDR in Australia, PSD2 in EU)
- Brokerage APIs as they become available
- Other portfolio trackers (export/import)
- Accounting software (Xero, MYOB)

---

## Data Export

InvestaLens supports full data export for backup, portability, and external analysis. You always own your data.

### Export Formats

| Format             | Contents                                                   | Use Case                                  |
| ------------------ | ---------------------------------------------------------- | ----------------------------------------- |
| CSV (Trades)       | All transactions in InvestaLens standard format            | Re-import into InvestaLens or other tools |
| CSV (Holdings)     | Current positions with cost base and market value          | Snapshot for spreadsheet analysis         |
| CSV (Dividends)    | All dividend and distribution records                      | Income reconciliation                     |
| JSON (Full Backup) | Complete portfolio data including settings, groups, labels | Full backup and restore                   |
| PDF (Reports)      | Any report exported as formatted PDF                       | Sharing with advisers, record keeping     |

### How to Export

1. **Individual reports**: Click **Export** on any report page (PDF, CSV, or Google Drive)
2. **All Trades**: Navigate to **Tax > All Trades Report**, set date range to "Since Inception", and export as CSV
3. **Full backup**: Navigate to **Settings > Data Management > Export All Data**
4. **Per-holding**: From any Individual Holding Page, export trade history

### Export Schema (CSV Trades)

The exported CSV uses the same field structure as the import format, ensuring round-trip compatibility:

| Column           | Description                         |
| ---------------- | ----------------------------------- |
| Trade Date       | ISO 8601 date                       |
| Transaction Type | BUY, SELL, DIVIDEND, etc.           |
| Instrument Code  | Ticker symbol                       |
| Market Code      | Exchange identifier                 |
| Quantity         | Number of units                     |
| Price            | Price per unit (in market currency) |
| Brokerage        | Transaction fee                     |
| Currency         | Trade currency (ISO 4217)           |
| Exchange Rate    | FX rate applied                     |
| Comments         | User notes                          |

### Automated Backups

Configure scheduled exports via **Settings > Data Management**:

- **Frequency**: Daily, weekly, or monthly
- **Format**: JSON (recommended for full restore) or CSV
- **Destination**: Download link via email, or connected cloud storage

> **Note:** Exported data contains sensitive financial information. Store backups securely and do not share access credentials.

---

## Related Documentation

| Document                                 | Description                                                  |
| ---------------------------------------- | ------------------------------------------------------------ |
| [GETTING-STARTED.md](GETTING-STARTED.md) | Step-by-step import guide and portfolio setup                |
| [SHARESIGHT_API.md](SHARESIGHT_API.md)   | Sharesight API endpoints, authentication, and sync           |
| [ACCOUNT.md](ACCOUNT.md)                 | AI Importer, portfolio settings, and share transfers         |
| [ASSETS.md](ASSETS.md)                   | Supported asset types, bond tracking, and custom investments |
| [ACTIONS.md](ACTIONS.md)                 | How corporate actions affect imported data                   |
| [API.md](API.md)                         | Programmatic import/export via REST API                      |
