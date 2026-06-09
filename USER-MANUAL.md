# InvestaLens User Manual

Welcome to InvestaLens — a comprehensive portfolio tracker and optimiser for investors. This manual guides you through every aspect of the platform, from initial setup to advanced analytics.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Adding & Importing Investments](#2-adding--importing-investments)
3. [Supported Assets](#3-supported-assets)
4. [Portfolio Management](#4-portfolio-management)
5. [Performance & Reporting](#5-performance--reporting)
6. [Tax Reporting](#6-tax-reporting)
7. [Corporate Actions](#7-corporate-actions)
8. [Research & Planning Tools](#8-research--planning-tools)
9. [Advanced Analytics](#9-advanced-analytics)
10. [Data Export & Backup](#10-data-export--backup)
11. [API Access](#11-api-access)

---

## 1. Getting Started

Set up your account, create your first portfolio, and understand how InvestaLens organises your investments.

### What You'll Do First

1. **Create your account** — A default portfolio is created automatically based on your tax residency
2. **Import your investments** — Bring in your holdings via CSV, broker API, or manual entry
3. **Review and confirm** — Verify dividends, set up DRP tracking, and organise holdings
4. **Explore reports** — Run performance, tax, and allocation reports

### Key Concepts

| Concept          | Description                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| **Portfolio**    | Represents a single tax entity — all holdings share the same base currency, tax rules, and reporting |
| **Holding**      | A position in a security (shares, ETF, fund, bond, custom investment)                                |
| **Transaction**  | A buy, sell, dividend, coupon, or other event recorded against a holding                             |
| **Custom Group** | Your own categorisation scheme applied across reports                                                |
| **Label**        | A tag for filtering subsets of holdings in reports                                                   |

### Portfolio Structure

- **One portfolio per tax entity** — Don't mix personal and company holdings
- **Same stock across brokers** — Use separate portfolios if you hold the same security at multiple brokers (avoids cost base confusion)
- **Consolidated View** — See all portfolios combined when you need the big picture

> **Full guide:** [Getting Started](docs/GETTING-STARTED.md)

---

## 2. Adding & Importing Investments

InvestaLens is source-agnostic — import from any broker, any format.

### Import Methods (Ranked by Flexibility)

| Method           | Best For                                                             | Guide                                                                              |
| ---------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **CSV Import**   | Any broker — map columns to InvestaLens fields, save templates       | [Data Import](docs/DATA_IMPORT.md)                                                 |
| **AI Importer**  | PDFs, screenshots, non-standard formats — AI reads and maps the data | [Account](docs/ACCOUNT.md#ai-importer)                                             |
| **Broker API**   | Supported brokers with automatic sync                                | [Getting Started](docs/GETTING-STARTED.md#method-3-import-from-a-supported-broker) |
| **Manual Entry** | One-off trades, corrections, historical records                      | [Getting Started](docs/GETTING-STARTED.md#method-4-add-holdings-manually)          |

### Supported Broker Templates

Pre-built CSV mapping templates for quick import:

| Broker              | Region            |
| ------------------- | ----------------- |
| CommSec             | Australia         |
| SelfWealth          | Australia         |
| Stake               | AU/US             |
| CMC Markets         | Australia         |
| CMC Invest          | Australia         |
| Bell Direct         | Australia         |
| nabtrade            | Australia         |
| FIIG Securities     | Australia (Bonds) |
| Interactive Brokers | Global            |
| Schwab              | US                |
| Vanguard            | AU/US             |

Custom templates can be created for any broker and saved for reuse.

### What Gets Imported

InvestaLens supports 16 transaction types including BUY, SELL, DIVIDEND, SPLIT, INTEREST, COUPON, MATURITY, TRANSFER_IN/OUT, RETURN_OF_CAPITAL, MERGER_IN/OUT, RIGHTS_ISSUE, BONUS, ADJUSTMENT, and FEE.

For bonds and fixed income, additional fields are available: Coupon Rate, Maturity Date, Face Value, and Payment Frequency.

> **Full guide:** [Data Import Architecture](docs/DATA_IMPORT.md)

---

## 3. Supported Assets

InvestaLens tracks investments across all major asset classes.

### Asset Types at a Glance

| Asset Type                                    | Auto-Pricing | How to Add                         |
| --------------------------------------------- | ------------ | ---------------------------------- |
| Listed shares (ASX, NYSE, LSE, 60+ exchanges) | ✅           | Search by ticker                   |
| ETFs and managed funds                        | ✅           | Search by ticker                   |
| Bonds (listed)                                | ✅           | Search by ticker                   |
| Bonds (unlisted/OTC)                          | Manual       | Custom Investment (Fixed Interest) |
| Cryptocurrencies                              | ✅           | Search by name                     |
| Foreign currencies                            | ✅           | Search by currency code            |
| Term deposits                                 | Manual       | Custom Investment (Fixed Interest) |
| Investment property                           | Manual       | Custom Investment                  |
| Superannuation (accumulation)                 | Manual       | Custom Investment                  |
| Precious metals                               | Manual       | Custom Investment                  |

### Bond Portfolio Features

InvestaLens provides dedicated bond analytics:

- Yield to maturity, modified duration, and credit quality breakdown
- Maturity ladder and coupon calendar
- Income forecasting and accrued interest tracking
- Maturity alerts (30/60/90 days before expiry)
- Import from FIIG Securities, ASX-listed bonds, and XTBs

### Net Worth & Liabilities

Track your complete financial picture — mortgages, loans, and credit cards alongside your investments to see true net worth over time.

> **Full guide:** [Asset Support](docs/ASSETS.md)

---

## 4. Portfolio Management

Organise, share, and manage multiple portfolios.

### Organisation Tools

| Feature               | Purpose                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| **Custom Groups**     | Group holdings by your own categories (e.g. "Growth", "Defensive", "Income") — applies to all reports |
| **Labels**            | Tag holdings for filtered reporting (e.g. "Advisor A picks", "Tax loss candidates")                   |
| **Consolidated View** | Aggregate view across all portfolios                                                                  |

### Sharing & Collaboration

Share portfolio access with advisers, accountants, or family:

- **Read Only** — View all data
- **Read and Write** — Add/modify holdings and trades
- **Admin** — Full access except account-level changes

### Key Settings

| Setting                | Impact                                                                      |
| ---------------------- | --------------------------------------------------------------------------- |
| Tax Residency          | Determines currency, tax rules, reports (permanent — cannot change)         |
| Tax Entity Type        | Determines CGT discount rate (Individual 50%, SMSF 33⅓%, Company 0%)        |
| Sale Allocation Method | How cost base parcels are matched to sells (FIFO, LIFO, Minimise CGT, etc.) |
| Performance Method     | Simple or compound return calculation                                       |

### Transferring Holdings

Move securities between portfolios by recording a sell at cost base in the source and a buy at cost base in the destination.

> **Full guide:** [Account & Portfolio Management](docs/ACCOUNT.md)

---

## 5. Performance & Reporting

Comprehensive reporting suite covering performance, allocation, risk, and compliance.

### Performance Reports

| Report                    | Purpose                                                        |
| ------------------------- | -------------------------------------------------------------- |
| **Performance Report**    | Returns over any period, grouped and filtered by your criteria |
| **Contribution Analysis** | Which holdings drove (or dragged) portfolio performance        |
| **Multi-Period Report**   | Compare performance across up to 5 time periods                |
| **Sold Securities**       | Realised gains/losses on closed positions                      |
| **Future Income**         | Projected dividends and interest (up to 36 months)             |
| **Calendar**              | Month-by-month dividend schedule                               |

### Asset Allocation Reports

| Report                       | Purpose                                                               |
| ---------------------------- | --------------------------------------------------------------------- |
| **Diversity Report**         | Portfolio weightings by sector, country, asset type, or custom group  |
| **Exposure Report**          | Look-through ETF holdings to see true underlying exposure and overlap |
| **Drawdown Risk**            | Maximum drawdown and RoMaD for each holding                           |
| **Multi-Currency Valuation** | Portfolio valued in any of 67+ currencies at any date                 |

### Risk Analysis (X-ray)

Automated portfolio health check scanning for:

- Concentration risk (single holding, sector, country, currency)
- ETF overlap and hidden duplications
- Liquidity concerns and dividend dependency
- High correlation between holdings
- Missing or stale data

Configurable thresholds and severity levels (Critical / Warning / Info).

> **Full guide:** [Tools & Reports](docs/TOOLS.md)

---

## 6. Tax Reporting

Australian-focused tax reporting with full CGT calculation, AMIT support, and tax planning tools.

### Available Tax Reports

| Report                     | Purpose                                                                  |
| -------------------------- | ------------------------------------------------------------------------ |
| **Taxable Income Report**  | All dividend/distribution income mapped to ATO form codes                |
| **CGT Report**             | Realised capital gains with discount, losses, and parcel-level breakdown |
| **Unrealised CGT Report**  | Hypothetical tax liability if positions were sold today                  |
| **Historical Cost Report** | Opening/closing cost base for accounting purposes                        |

### Key Features

- **Sale allocation methods** — FIFO, LIFO, Minimise Capital Gain, Maximise Capital Gain, Minimise CGT (considers discount eligibility)
- **Lock-in** — Preserve CGT allocation for completed financial years
- **AMIT support** — Enter Annual Tax Statement components for ETFs and trusts
- **Stapled securities** — Handles dual trust/company distributions
- **Foreign exchange** — Automatic AUD conversion with manual override option
- **Tax planning** — Tax loss selling identification, parcel comparison, Division 296 (SMSF)

### Tax Planning Strategies

Use the Unrealised CGT Report to:

1. Identify tax loss selling candidates before EOFY
2. Compare which parcels to sell for minimum tax
3. Plan drawdowns across financial years to stay in lower brackets
4. Model rebalancing without triggering large CGT events

> **Full guide:** [Tax Reporting](docs/TAX.md)

---

## 7. Corporate Actions

InvestaLens handles most corporate events automatically — and guides you through those requiring decisions.

### Automation Summary

| Automated                     | Manual (requires your decision) |
| ----------------------------- | ------------------------------- |
| Share splits & consolidations | Mergers & acquisitions          |
| Bonus shares                  | Demergers (spin-offs)           |
| Special dividends             | Renounceable rights             |
| Return of capital (ASX/NZX)   | IPOs                            |
| Name/ticker changes (ASX/NZX) | Share purchase plans            |

### What You Need to Do

- **Check notifications** — InvestaLens emails you and shows alerts for corporate events
- **Record mergers** — Use the "Merge this Holding" feature when an acquisition completes
- **Record demergers** — Follow the company's demerger booklet for cost base allocation
- **Decide on rights** — Take up, sell on market, or let lapse

> **Full guide:** [Corporate Actions](docs/ACTIONS.md)

---

## 8. Research & Planning Tools

Tools for research, monitoring, and financial planning beyond your existing portfolio.

### Research

| Tool                 | Purpose                                                                           |
| -------------------- | --------------------------------------------------------------------------------- |
| **Share Checker**    | Hypothetical $10,000 investment in any security — see what it would have returned |
| **Watchlist**        | Monitor potential investments with price alerts and research notes                |
| **Market Sentiment** | Fear & Greed Index, VIX, Put/Call Ratio, Market Breadth, Yield Curve              |

### Financial Planning

| Tool                | Purpose                                                                         |
| ------------------- | ------------------------------------------------------------------------------- |
| **FIRE Calculator** | Model your path to financial independence — years to FIRE, sensitivity analysis |
| **Emergency Fund**  | Track savings target (3–6 months expenses) alongside investments                |
| **Net Worth**       | Total assets minus liabilities over time                                        |

The FIRE Calculator integrates with your actual portfolio — pre-fills current value, uses your real historical return, and factors in dividend income and tax settings.

> **Full guide:** [Tools & Reports](docs/TOOLS.md)

---

## 9. Advanced Analytics

Quantitative tools for portfolio construction, optimisation, and forward-looking analysis.

### Portfolio Backtesting

Test hypothetical allocations against history:

- Ticker-level, asset-class, or dynamic allocation backtests
- Configurable rebalancing (monthly to annual, or band-based)
- Full output: CAGR, Sharpe, Sortino, max drawdown, rolling returns, and more

### Monte Carlo Simulation

Project future portfolio outcomes using randomised return paths:

- Parametric (normal/t-distribution) or historical bootstrap methods
- Probability of reaching goals, ruin probability, and percentile fan charts

### Portfolio Optimisation

20+ optimisation strategies across four families:

| Family                      | Strategies                                         |
| --------------------------- | -------------------------------------------------- |
| **Mean-Variance**           | Mean-Variance, CVaR, CDaR, Max Sharpe, Risk Parity |
| **Hierarchical/Clustering** | HRP, HERC, Nested Clusters (NCO), Schur Complement |
| **Naive**                   | Equal Weight (1/N), Inverse Volatility             |
| **Ensemble**                | Stacking (combine multiple strategies)             |

With 20+ risk measures, 12 constraint types, regularisation (L1/L2/Elastic Net), robust optimisation with uncertainty sets, and pre-selection filters.

### Efficient Frontier

Visualise all optimal portfolios — see where your current allocation sits and how close it is to the frontier.

### Black-Litterman Model

Combine market equilibrium with your personal views (absolute or relative, with confidence levels). Extended with Entropy Pooling, Opinion Pooling, and factor-level views.

### Estimation Methods

- **Expected returns** — Empirical, exponentially weighted, shrinkage, equilibrium, factor model
- **Covariance** — 11 estimators including Ledoit-Wolf, Random Matrix Theory denoising, Gerber, Graphical Lasso
- **Distribution modelling** — Heavy-tailed distributions (Student's t, Johnson Su, NIG) and Vine Copulas for joint dependence

### Model Validation

Prevent overfitting with Walk Forward cross-validation, Combinatorial Purged CV, and hyperparameter tuning via grid/randomised/online search.

### Factor Analysis

Decompose returns into systematic risk factors (CAPM through Fama-French 5-Factor + momentum).

### Scenario & Stress Testing

- 7 historical crisis scenarios (GFC, COVID, Dot-com, etc.)
- Custom hypothetical scenarios
- Copula-based conditional stress testing ("what if my largest holding drops 20%?")
- Factor stress testing (stress risk factors, propagate through loadings)

### Tactical Asset Allocation

Signal-based dynamic strategies (momentum, mean-reversion, trend-following, volatility targeting) with full backtest output.

> **Full guide:** [Advanced Analytics](docs/ADVANCED.md)

---

## 10. Data Export & Backup

You always own your data. Export everything at any time.

### Export Options

| Format             | Contents                                                         |
| ------------------ | ---------------------------------------------------------------- |
| CSV (Trades)       | All transactions — re-importable into InvestaLens or other tools |
| CSV (Holdings)     | Current positions with cost base and market value                |
| CSV (Dividends)    | All dividend and distribution records                            |
| JSON (Full Backup) | Complete portfolio data including settings                       |
| PDF (Reports)      | Any report as formatted PDF                                      |

### Automated Backups

Schedule daily, weekly, or monthly exports (JSON or CSV) delivered via email or cloud storage.

> **Full guide:** [Data Import & Export](docs/DATA_IMPORT.md#data-export)

---

## 11. API Access

Programmatic access to all portfolio data via a RESTful API.

### Capabilities

- Read portfolios, holdings, transactions, and reports
- Create/update transactions and holdings
- Trigger imports and exports
- Subscribe to webhooks for real-time notifications (trade executed, dividend paid, price alert triggered)
- Rate limited to 100 requests/minute with burst allowance

### Authentication

Bearer token with configurable scopes (read, write, admin) and optional expiry.

> **Full guide:** [API Reference](docs/API.md)

---

## Quick Reference: Document Map

| Document                                   | What It Covers                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------ |
| [Getting Started](docs/GETTING-STARTED.md) | Account setup, import guide, DRP, labels, performance calculation              |
| [Data Import](docs/DATA_IMPORT.md)         | CSV mapping, broker templates, transaction types, export, backups              |
| [Assets](docs/ASSETS.md)                   | All supported asset types, bonds, custom investments, 60+ exchanges            |
| [Account](docs/ACCOUNT.md)                 | Portfolios, tax settings, sharing, groups, labels, AI Importer, Emergency Fund |
| [Tools & Reports](docs/TOOLS.md)           | Performance, allocation, tax reports, Watchlist, FIRE, X-ray                   |
| [Tax](docs/TAX.md)                         | CGT, taxable income, AMIT, stapled securities, FX, tax planning                |
| [Corporate Actions](docs/ACTIONS.md)       | Splits, mergers, demergers, IPOs, rights issues, DRP                           |
| [Advanced Analytics](docs/ADVANCED.md)     | Backtesting, Monte Carlo, optimisation, factor analysis, stress testing        |
| [API](docs/API.md)                         | REST API authentication, endpoints, webhooks, SDKs                             |
