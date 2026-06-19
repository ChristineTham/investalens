# InvestaLens User Manual

Welcome to InvestaLens — a comprehensive portfolio tracker and optimiser for investors. This manual guides you through every aspect of the platform, from initial setup to advanced analytics.

> **Implementation Status**
>
> | Section                                                        | Status                       |
> | -------------------------------------------------------------- | ---------------------------- |
> | Getting Started (auth, portfolios, import, manual entry)       | ✅ Implemented               |
> | CSV Import (9 broker templates, 5-step wizard)                 | ✅ Implemented               |
> | Supported Assets (equities, ETFs, bonds, crypto)               | ✅ Implemented               |
> | Portfolio Management (groups, labels, sharing, consolidated)   | ✅ Implemented               |
> | Performance & Reporting (6 performance + 4 allocation reports) | ✅ Implemented               |
> | Tax Reporting (Taxable Income, CGT, Unrealised CGT)            | ✅ Implemented               |
> | Corporate Actions (split, bonus, ROC, rights, merger)          | ✅ Implemented               |
> | Watchlist                                                      | ✅ Implemented               |
> | Data Export (CSV trades/holdings/dividends, JSON backup)       | ✅ Implemented               |
> | API Access (portfolios, market search, auth, rate limiting)    | ✅ Implemented               |
> | Research Tools (Share Checker, Market Sentiment)               | ✅ Implemented (R2)          |
> | Planning Tools (FIRE Calculator)                               | ✅ Implemented (R2)          |
> | Advanced Analytics (backtesting, Monte Carlo, optimisation)    | ✅ Implemented (R2)          |
> | AI Importer + AI Chat Assistant                                | ✅ Implemented (R2)          |
> | Emergency Fund, Net Worth                                      | ⏳ To be Implemented (R4)    |
> | PDF Export & Automated Backups                                 | ⏳ To be Implemented (R4)    |
> | Webhooks                                                       | ⏳ To be Implemented (R4)    |

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

1. **Create your account** — Register at `/register` with name, email, and password (minimum 8 characters). Or sign in with Google OAuth.
2. **Create a portfolio** — Click "New Portfolio" on `/portfolio`, choose tax residency and entity type
3. **Import your investments** — Use the CSV import wizard or add holdings manually via instrument search
4. **Explore reports** — Navigate to Reports or Tax for performance and tax analysis

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

| Method           | Best For                                                             | Status         |
| ---------------- | -------------------------------------------------------------------- | -------------- |
| **CSV Import**   | Any broker — map columns to InvestaLens fields via 5-step wizard     | ✅ Implemented |
| **Manual Entry** | One-off trades, corrections — add transactions per holding           | ✅ Implemented |
| **AI Importer**  | PDFs, screenshots, non-standard formats — AI reads and maps the data | ✅ Implemented |
| **Broker API**   | Supported brokers with automatic sync                                | ⏳ R4          |

### How to Import (CSV)

1. Navigate to a portfolio detail page
2. Click **"Import CSV"**
3. **Upload** — drag and drop your broker's CSV file
4. **Configure** — select a broker template (auto-fills mappings) or set date format/decimal separator manually
5. **Map** — assign CSV columns to InvestaLens fields (Trade Date, Code, Quantity, Price, Type are required)
6. **Review** — see parsed transactions colour-coded (green=valid, red=error, yellow=duplicate)
7. **Import** — confirm to insert transactions into the database

### Supported Broker Templates

Pre-built CSV mapping templates for quick import:

| Broker              | Region            | Status |
| ------------------- | ----------------- | ------ |
| CommSec             | Australia         | ✅     |
| SelfWealth          | Australia         | ✅     |
| Stake               | AU/US             | ✅     |
| CMC Markets         | Australia         | ✅     |
| CMC Invest          | Australia         | ✅     |
| Bell Direct         | Australia         | ✅     |
| nabtrade            | Australia         | ✅     |
| FIIG Securities     | Australia (Bonds) | ✅     |
| Interactive Brokers | Global            | ✅     |
| Schwab              | US                | ⏳     |
| Vanguard            | AU/US             | ⏳     |

Custom templates can be created for any broker and saved for reuse.

### What Gets Imported

InvestaLens supports 16 transaction types including BUY, SELL, DIVIDEND, SPLIT, INTEREST, COUPON, MATURITY, TRANSFER_IN/OUT, RETURN_OF_CAPITAL, MERGER_IN/OUT, RIGHTS_ISSUE, BONUS, ADJUSTMENT, and FEE.

For bonds and fixed income, additional fields are available: Coupon Rate, Maturity Date, Face Value, and Payment Frequency.

> **Full guide:** [Data Import Architecture](docs/DATA_IMPORT.md)

---

## 3. Supported Assets

InvestaLens tracks investments across all major asset classes.

### Asset Types at a Glance

| Asset Type                                    | Auto-Pricing | How to Add                         | Status |
| --------------------------------------------- | ------------ | ---------------------------------- | ------ |
| Listed shares (ASX, NYSE, LSE, 60+ exchanges) | ✅           | Search by ticker                   | ✅     |
| ETFs and managed funds                        | ✅           | Search by ticker                   | ✅     |
| Bonds (listed)                                | ✅           | Search by ticker                   | ✅     |
| Bonds (unlisted/OTC)                          | Manual       | Custom Investment (Fixed Interest) | ✅     |
| Cryptocurrencies                              | ✅           | Search by name                     | ✅     |
| Foreign currencies                            | ✅           | Search by currency code            | ✅     |
| Term deposits                                 | Manual       | Custom Investment (Fixed Interest) | ✅     |
| Investment property                           | Manual       | Custom Investment                  | ✅     |
| Superannuation (accumulation)                 | Manual       | Custom Investment                  | ✅     |
| Precious metals                               | Manual       | Custom Investment                  | ✅     |

### Bond Portfolio Features

InvestaLens provides dedicated bond analytics (navigate to `/portfolio/[id]/bonds`):

- Yield to maturity calculation ✅
- Modified duration ✅
- Maturity ladder (sorted by days to maturity) ✅
- Coupon schedule generation ✅
- Maturity alerts (30/60/90 days before expiry) ✅
- Import from FIIG Securities ✅
- Credit quality breakdown ✅
- Income forecasting and accrued interest tracking ✅

### Net Worth & Liabilities

Track your complete financial picture — mortgages, loans, and credit cards alongside your investments to see true net worth over time. _(⏳ To be Implemented — R4)_

> **Full guide:** [Asset Support](docs/ASSETS.md)

---

## 4. Portfolio Management

Organise, share, and manage multiple portfolios.

### Organisation Tools

| Feature               | Purpose                                                                                               | Status                       |
| --------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------- |
| **Custom Groups**     | Group holdings by your own categories (e.g. "Growth", "Defensive", "Income") — applies to all reports | ✅ `/settings/groups`        |
| **Labels**            | Tag holdings for filtered reporting (e.g. "Advisor A picks", "Tax loss candidates")                   | ✅ `/settings/labels`        |
| **Consolidated View** | Aggregate view across all portfolios                                                                  | ✅ `/portfolio/consolidated` |

### Sharing & Collaboration

Share portfolio access with advisers, accountants, or family (manage at `/settings/sharing`):

- **Read Only** — View all data ✅
- **Read and Write** — Add/modify holdings and trades ✅
- **Admin** — Full access except account-level changes ✅

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

| Report                    | Purpose                                                        | Status                        |
| ------------------------- | -------------------------------------------------------------- | ----------------------------- |
| **Performance Report**    | Returns over any period, grouped and filtered by your criteria | ✅ `/reports/performance`     |
| **Contribution Analysis** | Which holdings drove (or dragged) portfolio performance        | ✅ `/reports/contribution`    |
| **Multi-Period Report**   | Compare performance across up to 5 time periods                | ✅ Server action (stub UI)    |
| **Sold Securities**       | Realised gains/losses on closed positions                      | ✅ `/reports/sold-securities` |
| **Future Income**         | Projected dividends and interest (up to 36 months)             | ✅ `/reports/future-income`   |
| **Calendar**              | Month-by-month dividend schedule                               | ✅ Server action (stub UI)    |

### Asset Allocation Reports

| Report                       | Purpose                                                               | Status                     |
| ---------------------------- | --------------------------------------------------------------------- | -------------------------- |
| **Diversity Report**         | Portfolio weightings by sector, country, asset type, or custom group  | ✅ `/reports/diversity`    |
| **Exposure Report**          | Look-through ETF holdings to see true underlying exposure and overlap | ✅ `/analytics/exposure`   |
| **Drawdown Risk**            | Maximum drawdown and RoMaD for each holding                           | ✅ Server action (stub UI) |
| **Multi-Currency Valuation** | Portfolio valued in any of 67+ currencies at any date                 | ⏳ R3                      |

### Risk Analysis (X-ray)

Automated portfolio health check at `/tools/checker`, scanning for:

- Concentration risk (single holding > 20% of portfolio)
- Stale price data (> 7 days old)
- Missing cost base (no buy transactions)
- Duplicate holdings across portfolios
- ETF overlap detection via `/analytics/exposure`

Results shown with severity badges (error / warning / info) and fix suggestions.

> **Full guide:** [Tools & Reports](docs/TOOLS.md)

---

## 6. Tax Reporting

Australian-focused tax reporting with full CGT calculation, AMIT support, and tax planning tools.

### Available Tax Reports

| Report                     | Purpose                                                                  | Status                     |
| -------------------------- | ------------------------------------------------------------------------ | -------------------------- |
| **Taxable Income Report**  | All dividend/distribution income mapped to ATO form codes                | ✅ `/tax/taxable-income`   |
| **CGT Report**             | Realised capital gains with discount, losses, and parcel-level breakdown | ✅ `/tax/cgt`              |
| **Unrealised CGT Report**  | Hypothetical tax liability if positions were sold today                  | ✅ `/tax/unrealised`       |
| **Historical Cost Report** | Opening/closing cost base for accounting purposes                        | ✅ Server action (stub UI) |

### Key Features

- **Sale allocation methods** — FIFO, LIFO, Minimise Capital Gain, Maximise Capital Gain, Minimise CGT (considers discount eligibility) ✅
- **CGT parcel matcher** — Compare all 5 methods to find optimal allocation ✅
- **CGT discount** — 50% individual/trust, 33⅓% SMSF, 0% company ✅
- **Lock-in** — Preserve CGT allocation for completed financial years _(⏳ To be Implemented)_
- **AMIT support** — Enter Annual Tax Statement components for ETFs and trusts _(Schema ready, ⏳ full processing To be Implemented)_
- **Stapled securities** — Handles dual trust/company distributions _(⏳ To be Implemented)_
- **Foreign exchange** — Automatic AUD conversion with manual override option _(⏳ R3)_
- **Tax planning** — Tax loss selling identification, parcel comparison, Division 296 (SMSF) _(⏳ To be Implemented)_

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

| Automated (✅ Implemented)    | Manual — requires your decision (✅ Implemented) |
| ----------------------------- | ------------------------------------------------ |
| Share splits & consolidations | Mergers (MERGER_IN/OUT server action)            |
| Bonus shares                  | Rights issues (via corporate actions page)       |
| Return of capital             |                                                  |

| To be Implemented | |
| ------------------------------------ | |
| Demergers (spin-offs) | ⏳ |
| IPO recording | ⏳ |
| Automated corporate action detection | ⏳ |
| Name/ticker change tracking | ⏳ |

### How to Record Corporate Actions

1. Navigate to a holding detail page
2. Click the holding code to open it
3. Access **Corporate Actions** page
4. Select action type: Stock Split, Bonus Issue, Return of Capital, or Rights Issue
5. Enter the date and relevant values (ratio, quantity, price)
6. Click "Record Action"

> **Full guide:** [Corporate Actions](docs/ACTIONS.md)

---

## 8. Research & Planning Tools

Tools for research, monitoring, and financial planning beyond your existing portfolio.

### Research

| Tool                 | Purpose                                                                           | Status                    |
| -------------------- | --------------------------------------------------------------------------------- | ------------------------- |
| **Watchlist**        | Monitor potential investments with price alerts and research notes                | ✅ `/tools/watchlist`     |
| **Share Checker**    | Automated portfolio health checks — concentration, stale data, duplicates         | ✅ `/tools/checker`       |
| **Market Sentiment** | Fear & Greed Index, VIX, ASX summary, sector heatmap                              | ✅ `/tools/sentiment`     |
| **AI Assistant**     | Chat-based portfolio Q&A powered by Gemini                                        | ✅ `/tools/assistant`     |

### Financial Planning

| Tool                | Purpose                                                                         | Status              |
| ------------------- | ------------------------------------------------------------------------------- | ------------------- |
| **FIRE Calculator** | Model your path to financial independence — years to FIRE, sensitivity analysis | ✅ `/tools/fire`    |
| **Emergency Fund**  | Track savings target (3–6 months expenses) alongside investments                | ⏳ R4               |
| **Net Worth**       | Total assets minus liabilities over time                                        | ⏳ R4               |

The FIRE Calculator runs entirely client-side for instant feedback. It supports Australian superannuation integration, Coast FIRE calculation, and pessimistic/baseline/optimistic scenario comparison.

> **Full guide:** [Tools & Reports](docs/TOOLS.md)

---

## 9. Advanced Analytics

Quantitative tools for portfolio construction, optimisation, and forward-looking analysis. The Python analytics backend (`api/analytics/`) provides computation via FastAPI on Vercel Services.

### Portfolio Backtesting (`/analytics/backtest`)

Test hypothetical allocations against history:

- 5 strategies: Equal Weight, Min Variance, Max Sharpe, Risk Parity, Mean-Variance
- Walk-forward methodology with configurable rebalancing (monthly, quarterly, annually)
- Full output: CAGR, Sharpe, Sortino, max drawdown, Calmar ratio, equity curve, drawdown chart
- Strategy comparison and model selection via cross-validation

### Monte Carlo Simulation (`/analytics/monte-carlo`)

Project future portfolio outcomes using randomised return paths:

- 3 methods: Bootstrap (historical resampling), Parametric (multivariate normal), Copula (Student-t for tail risk)
- Up to 10,000 simulations with fan chart (5th–95th percentile bands)
- Withdrawal modelling for retirement planning
- Distribution fitting (Normal, Student-t, Skew-Normal) with best-fit selection

### Risk Metrics (`/analytics/risk`)

Comprehensive risk dashboard with 5 tabs:

- **Overview** — 19 metrics including Sharpe, Sortino, Calmar, Treynor, Omega, VaR, CVaR, capture ratios, R², skewness, kurtosis
- **Drawdowns** — Drawdown chart + episode table (start, trough, recovery, depth, duration)
- **Distribution** — Return histogram with VaR/CVaR statistics
- **Rolling** — Rolling Sharpe, Sortino, Beta over configurable window
- **Decomposition** — Per-holding risk contribution pie chart

Real benchmark comparison using ASX 200, S&P 500, MSCI World, and ETF proxies.

### Portfolio Optimisation (`/analytics/optimize`)

| Family                      | Strategies                                         |
| --------------------------- | -------------------------------------------------- |
| **Mean-Variance**           | Max Sharpe, Min Risk, Max Return (3 objectives × 3 risk measures) |
| **Hierarchical**            | Hierarchical Risk Parity (HRP) with dendrogram     |
| **Risk Parity**             | Inverse volatility / risk budgeting                |

Weight constraints (min/max per asset), current vs recommended comparison chart, and rebalancing trade calculator.

### Efficient Frontier (`/analytics/frontier`)

Interactive scatter plot showing the risk-return tradeoff curve:

- 50-point frontier with individual assets plotted
- Max Sharpe and Min Risk special points highlighted
- Hover to see allocation weights at any frontier point

### Black-Litterman Model (`/analytics/black-litterman`)

Combine market equilibrium with your personal investment views:

- Absolute views ("CBA returns 12%") and relative views ("CBA outperforms BHP by 5%")
- Per-view confidence sliders
- Prior vs posterior expected returns comparison table
- Optimal weights under BL model

### Estimation Methods

- **Expected returns** — Empirical, Shrunk (James-Stein), Exponentially Weighted, Equilibrium (CAPM)
- **Covariance** — Empirical, Ledoit-Wolf, OAS, Exponentially Weighted, Graphical Lasso

### Factor Analysis (`/analytics/factors`)

Decompose returns into systematic risk factors:

- Principal Component Analysis (PCA) with explained variance and loadings
- Fama-French regression (market, size, value factors)

### Correlation Analysis (`/analytics/correlations`)

- Full correlation matrix heatmap (colour-coded −1 red to +1 blue)
- Hierarchical clustering dendrogram
- Period selector (1Y, 3Y, 5Y)

### Tactical Allocation (`/analytics/tactical`)

6 signal-based dynamic weighting strategies:

- Momentum, Mean Reversion, Risk-Adjusted Momentum
- Volatility Targeting, MA Crossover, Dual Momentum
- Signal scores, recommended weights, comparison chart

### Stress Testing (`/analytics/stress-test`)

3 stress testing modes:

- **Historical** — 6 crisis scenarios (GFC, COVID, Dot-com, 2022 Rate Shock, Black Monday, Asian Crisis)
- **Factor** — "If market drops X%, what happens?" with per-asset beta decomposition
- **Custom** — Per-asset shock inputs via the What-If page

### AI Features

- **AI Importer** — Parse broker statements, contract notes, and tax documents using Gemini AI (requires `GOOGLE_GENERATIVE_AI_API_KEY`)
- **AI Chat Assistant** — Ask questions about your portfolio, risk metrics, and investment strategies

> **Full guide:** [Advanced Analytics](docs/ADVANCED.md)

---

## 10. Data Export & Backup

You always own your data. Export everything at any time via `/settings/export`.

### Export Options

| Format             | Contents                                                         | Status |
| ------------------ | ---------------------------------------------------------------- | ------ |
| CSV (Trades)       | All transactions — re-importable into InvestaLens or other tools | ✅     |
| CSV (Holdings)     | Current positions with cost base and market value                | ✅     |
| CSV (Dividends)    | All dividend and distribution records                            | ✅     |
| JSON (Full Backup) | Complete portfolio data including settings                       | ✅     |
| PDF (Reports)      | Any report as formatted PDF                                      | ⏳ R4  |

### Automated Backups

Schedule daily, weekly, or monthly exports (JSON or CSV) delivered via email or cloud storage. _(⏳ To be Implemented — R4)_

> **Full guide:** [Data Import & Export](docs/DATA_IMPORT.md#data-export)

---

## 11. API Access

Programmatic access to portfolio data via a RESTful API.

### Implemented Capabilities

- ✅ List/create portfolios (`GET/POST /api/v1/portfolios`)
- ✅ Get/update/delete portfolio (`GET/PATCH/DELETE /api/v1/portfolios/[id]`)
- ✅ Search instruments (`GET /api/v1/market/search?q=...`)
- ✅ Bearer token authentication with scope checking (read/write/admin)
- ✅ Rate limited to 100 requests/minute per token
- ✅ JSON response format with error codes

### To be Implemented

- ⏳ Holdings endpoints (GET/POST/DELETE)
- ⏳ Transactions endpoints (GET/POST/PATCH/DELETE)
- ⏳ Reports endpoints
- ⏳ Import/Export endpoints
- ⏳ Watchlist endpoints
- ⏳ Market quote endpoint
- ⏳ Webhooks for real-time notifications (R4)
- ⏳ Token management UI
- ⏳ SDKs

### Authentication

Bearer token with configurable scopes (read, write, admin) and optional expiry. Tokens are managed via `/settings/api-tokens`.

```bash
curl http://localhost:3000/api/v1/portfolios \
  -H "Authorization: Bearer your-api-token-here"
```

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
