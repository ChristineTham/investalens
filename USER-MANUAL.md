# InvestaLens User Manual

Welcome to InvestaLens — a comprehensive portfolio tracker and optimiser for investors. This manual guides you through every aspect of the platform, from initial setup to advanced analytics.

> **Implementation Status**
>
> | Section                                                        | Status                       |
> | -------------------------------------------------------------- | ---------------------------- |
> | Getting Started (auth, portfolios, import, manual entry)       | ✅ Implemented               |
> | Multi-Type Import (shares, bonds, cash; quick + custom importers) | ✅ Implemented             |
> | Supported Assets (equities, ETFs, bonds, crypto)               | ✅ Implemented               |
> | Stock Information (profile, fundamentals, analysts, news)      | ✅ Implemented               |
> | Portfolio Management (groups, labels, sharing, consolidated)   | ✅ Implemented               |
> | Performance & Reporting (6 performance + 4 allocation reports) | ✅ Implemented               |
> | Tax Reporting (Taxable Income, CGT + CPI indexation, Unrealised CGT, bonds) | ✅ Implemented           |
> | Proposed 2027 CGT regime projection (opt-in)                   | ✅ Implemented               |
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

### Navigation Overview

After signing in, you land on the **Dashboard** (`/dashboard`) which shows your total portfolio value, gain/loss, and recent activity. The sidebar provides access to all sections:

| Sidebar Link   | What It Contains                                                          |
| -------------- | ------------------------------------------------------------------------- |
| **Dashboard**  | Summary cards (purchase cost, total value, capital gain, income, total gain, portfolios/holdings), portfolio performance chart, allocation treemap, portfolio summary table, recent activity |
| **Portfolio**  | Portfolio overview cards (allocation donut, returns, recent activity); create/manage portfolios, holdings, imports, bonds, cash |
| **Reports**    | 10 performance and allocation reports                                     |
| **Tax**        | Taxable income, CGT, and unrealised CGT reports                           |
| **Tools**      | Watchlist, FIRE calculator, Share Checker, Market Sentiment, AI Assistant |
| **Analytics**  | 13 quantitative analysis tools (backtesting, optimisation, Monte Carlo, etc.) |
| **Settings**   | Groups, labels, sharing, export, API tokens, market data (fetch share &amp; bond prices and company information), Tax &amp; CGT (entity type, allocation, 2027 regime), Instrument Tax (CGT vs income) |

### What You'll Do First

1. **Create your account** — Register at `/register` with name, email, and password (minimum 8 characters). Or sign in with Google OAuth.
2. **Create a portfolio** — From the sidebar click **Portfolio**, then "New Portfolio", choose tax residency and entity type
3. **Import your investments** — Click into your portfolio, then use the "Import" or "✨ AI Import" button
4. **Explore reports** — Click **Reports** or **Tax** in the sidebar for performance and tax analysis

### Dashboard at a Glance

The Dashboard gives you an instant overview of every portfolio combined:

- **Summary cards** — Purchase Cost, Total Value, Capital Gain, Income (dividends/interest/coupons, net of accrued interest), Total Gain (capital gain + income − fees, with %), and Portfolios / Holdings count
- **Portfolio Performance chart** — An area/line chart of each portfolio's value over time with a consolidated total line. Indexed to percentage gain/loss from the start of the selected time range so portfolios and the benchmark share a common baseline. Pick a benchmark (ASX 200, S&P 500, MSCI World, and more) shown as a dotted reference line, and switch the timescale (1Y, 3Y, 5Y, 10Y, All)
- **Portfolio Allocation treemap** — Current value broken down by portfolio, then by holding, with each portfolio in its own colour and holdings as shades of that colour. Click any holding to open its detail page
- **Portfolio Summary table** — Cost base, market value, capital gain, income, fees, and total gain per portfolio
- **Recent Activity** — The latest activity across all portfolios (trades, dividends, coupons, and custody fees) with date, instrument, type, quantity, price, fees, and amount. Every row links to its holding (or the Bonds page for custody fees), and a "View All" button opens the full activity history

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

InvestaLens is source-agnostic — import shares, bonds, and cash from any broker, any format.

### Import Methods (Ranked by Flexibility)

| Method           | Best For                                                             | Status         |
| ---------------- | -------------------------------------------------------------------- | -------------- |
| **Quick Import** | Known brokers (CommSec, SelfWealth, Stake, CMC Invest, nabtrade, FIIG) — pick a file and it imports in one step | ✅ Implemented |
| **Guided Import**| Shares, bonds, or cash/bank statements — map columns via a category wizard | ✅ Implemented |
| **Custom Import**| Complex multi-sheet files that templates can't handle (e.g. the FIIG data extract) | ✅ Implemented |
| **Manual Entry** | One-off trades, corrections — add transactions per holding           | ✅ Implemented |
| **AI Importer**  | PDFs, screenshots, non-standard formats — AI reads and maps the data | ✅ Implemented |
| **Broker API**   | Supported brokers with automatic sync                                | ⏳ R4          |

All import paths automatically **resolve duplicates** against transactions you have already imported, so re-importing the same file is safe.

### How to Import

1. From the sidebar, click **Portfolio** → select your portfolio
2. Click **"Import"** in the portfolio header
3. Choose an import path on the hub:
   - **Quick Import** — click a broker button, pick the file, done
   - **Guided Import** — choose a category (Share Transactions, Bonds & Fixed Interest, or Cash / Bank Statement) and step through Upload → Configure → Map → Review → Import
   - **Custom Import** — choose a dedicated importer (e.g. FIIG Data Extract) and pick the file
4. Review parsed rows (green=valid, red=error), then confirm

### How to Import (Bonds — FIIG)

The FIIG Securities data-extract workbook (`.xls`) contains separate sheets for trades, income and fees. Use **Custom Import → FIIG Data Extract** to import all of them in one step:

- **Trades** become BUY/SELL bond transactions (with accrued interest and per-$1 pricing on face value)
- **Income payments** become COUPON income and RETURN_OF_CAPITAL principal repayments
- **Custody fees** are recorded as portfolio fee invoices
- **Security metadata** enriches each bond (type, sector, coupon rate, payment frequency, maturity)

### How to Import (AI)

1. From the sidebar, click **Portfolio** → select your portfolio
2. Click **"Import"** → then click **"✨ AI Import"** button in the top-right
3. Select the document type (Contract Note, Trade Confirmation, Dividend Statement, etc.)
4. Paste your document text into the text area
5. Click **"Parse with AI"** — Gemini extracts transactions automatically
6. Review the parsed transactions table
7. Click **"Import"** to confirm

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

For bonds and fixed income, additional fields are available: Coupon Rate, Maturity Date, Face Value, Payment Frequency, and Accrued Interest. The dedicated FIIG importer also records coupon income, principal repayments, and custody fee invoices.

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

InvestaLens provides dedicated bond analytics (navigate via **Portfolio \u2192 select portfolio \u2192 click \"Bonds\" button**):

- Yield to maturity calculation ✅
- Modified duration ✅
- Maturity ladder (sorted by days to maturity) ✅
- Coupon schedule generation ✅
- Maturity alerts (30/60/90 days before expiry) ✅
- Import from FIIG Securities — trades, coupon income, principal repayments, and custody fees in one step ✅
- Update current bond capital prices from the FIIG rate sheet (Settings → Market Data → "Update"), matched by ISIN ✅
- Coupon income, principal repayments, and custody fee tracking with summary totals ✅
- Returns include income and net custody fees; accrued interest on trades is tracked and netted into income ✅
- Credit quality breakdown ✅
- Income forecasting and accrued interest tracking ✅
- Tax treatment: traditional bonds are CGT-exempt (gains reported as income); listed bonds &amp; hybrids are subject to CGT — override per instrument under Settings → Instrument Tax ✅

### Net Worth & Liabilities

Track your complete financial picture — mortgages, loans, and credit cards alongside your investments to see true net worth over time. _(⏳ To be Implemented — R4)_

> **Full guide:** [Asset Support](docs/ASSETS.md)

---

## Stock Information

Each share and ETF holding shows rich, periodically-refreshed company information sourced from Yahoo Finance (via the Python `yfinance` backend). Open any holding (**Portfolio → select portfolio → click a holding code**) to see a tabbed **Company Information** panel:

| Tab            | What It Shows                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------- |
| **Overview**   | Business summary, sector/industry/country, website, and a grid of key fundamentals (market cap, P/E, forward P/E, price/book, EPS, beta, dividend yield, profit margin, ROE, revenue growth, 52-week high/low) |
| **Analysts**   | Analyst price targets (low/mean/median/high with upside vs current price), a recommendation trend chart (strong buy → strong sell), and recent rating changes (upgrades/downgrades) |
| **Financials** | Five-year income-statement summary (revenue, gross profit, EBITDA, net income)                     |
| **News**       | Recent news headlines with publisher and date, linking to the full article                         |
| **Events**     | Next earnings date, ex-dividend and dividend dates, and EPS estimates                               |

### How to Refresh Stock Information

Stock information is fetched together with prices. Go to **Settings → Market Data** and click **"Update"** — in one step InvestaLens updates share and ETF prices (Yahoo Finance), bond prices (FIIG rate sheet), and the company information for your share/ETF holdings. A live progress bar shows each phase (shares & ETFs → bonds → company info) and the current ticker as it works. Bonds, cash, and currencies are skipped for company info. The panel shows when the data was last updated.

> **Note (self-hosted on Vercel):** company information is computed by the Python `yfinance` backend, which the app calls server-to-server. If your deployment has **Deployment Protection** enabled, enable **Protection Bypass for Automation** (Settings → Deployment Protection) so these internal calls aren't blocked with a 401, then redeploy.

> **Full guide:** [Asset Support](docs/ASSETS.md)

---

## 4. Portfolio Management

Organise, share, and manage multiple portfolios.

### Portfolio Overview

The **Portfolio** page shows each portfolio as a rich summary card:

- **Allocation donut** — current value split across the portfolio's holdings, with a top-holdings legend and percentages
- **Current value** and **1M / 6M / 1Y / 3Y returns** (contribution-adjusted capital return)
- **Recent activity** — the three most recent transactions

When you hold more than one portfolio, a **highlighted Consolidated View card** leads the grid, showing total value, portfolio/holding counts, and an allocation donut by portfolio. Click it for the combined view, or click any portfolio card to open that portfolio.

### Organisation Tools

| Feature               | Purpose                                                                                               | How to Access                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **Custom Groups**     | Group holdings by your own categories (e.g. "Growth", "Defensive", "Income") — applies to all reports | Sidebar → Settings → Custom Groups                 |
| **Labels**            | Tag holdings for filtered reporting (e.g. "Advisor A picks", "Tax loss candidates")                   | Sidebar → Settings → Labels                        |
| **Consolidated View** | Aggregate view across all portfolios                                                                  | Sidebar → Portfolio → "Consolidated View" card (highlighted) |

### Sharing & Collaboration

Share portfolio access with advisers, accountants, or family (Sidebar → Settings → Sharing):

- **Read Only** — View all data ✅
- **Read and Write** — Add/modify holdings and trades ✅
- **Admin** — Full access except account-level changes ✅

### Key Settings

| Setting                | Impact                                                                      |
| ---------------------- | --------------------------------------------------------------------------- |
| Tax Residency          | Determines currency, tax rules, reports (permanent — cannot change)         |
| Tax Entity Type        | Determines CGT discount rate (Individual 50%, SMSF 33⅓%, Company 0%)        |
| Sale Allocation Method | How cost base parcels are matched to sells (FIFO, LIFO, Minimise CGT, etc.) |
| CGT Regime             | Current (50% discount) or proposed 2027 projection (indexation + 30% min-tax) |
| Instrument Tax Class   | Override CGT vs income treatment per instrument (Settings → Instrument Tax)  |
| Performance Method     | Simple or compound return calculation                                       |

### Transferring Holdings

Move securities between portfolios by recording a sell at cost base in the source and a buy at cost base in the destination.

> **Full guide:** [Account & Portfolio Management](docs/ACCOUNT.md)

---

## 5. Performance & Reporting

Comprehensive reporting suite covering performance, allocation, risk, and compliance.

### How Returns Are Calculated

Throughout the dashboard and reports, returns combine capital and income, net of costs:

- **Cost base** includes brokerage paid on purchases
- **Capital gain** = market value − cost base
- **Income** = dividends + interest + coupons, **net of accrued interest** (accrued interest paid when buying a bond reduces income because it is recovered at the next coupon; accrued interest received on a sale adds to income)
- **Total gain** = capital gain + income − custody/management fees

Bond market value uses the latest stored price per $1 of face value, so refreshing market data (Settings → Market Data → "Update") keeps bond valuations current.

> **Note on returns:** Dashboard and report returns are simple, nominal figures — they are **not time-weighted** and **not inflation-indexed**. For an inflation-indexed (CPI) view, the Tax reports apply the ATO capital gains methodology, including the indexation method for eligible assets (acquired before 21 September 1999).

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
| **CGT Report**             | Realised gains with discount **and** CPI indexation, losses, parcel breakdown, and an opt-in 2027 projection | ✅ `/tax/cgt`              |
| **Unrealised CGT Report**  | Hypothetical tax liability if positions were sold today                  | ✅ `/tax/unrealised`       |
| **Historical Cost Report** | Opening/closing cost base for accounting purposes                        | ✅ Server action (stub UI) |

### Key Features

- **Sale allocation methods** — FIFO, LIFO, Minimise Capital Gain, Maximise Capital Gain, Minimise CGT (considers discount eligibility) ✅
- **CGT parcel matcher** — Compare all 5 methods to find optimal allocation ✅
- **CGT discount** — 50% individual/trust, 33⅓% SMSF, 0% company ✅
- **CGT indexation method** — Cost base indexed by CPI for assets acquired before 21 September 1999; uses whichever method gives the lower gain ✅
- **Bond CGT treatment** — Traditional bonds exempt from CGT (gains reported as income); listed bonds &amp; hybrids subject to CGT; override per instrument ✅
- **Proposed 2027 regime projection** — Opt-in toggle modelling cost-base indexation, the 30% minimum tax, and the 1 July 2027 transitional split ✅
- **Manual franking classification** — Edit any dividend to set franked/unfranked amounts and franking credits (auto-fetched dividends are unclassified); compute credits from the franked amount at the 30% / 25% company tax rate ✅
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

1. From the sidebar, click **Portfolio** → select your portfolio
2. Click a holding code to open the holding detail page
3. Click the **"Corporate Actions"** button in the top-right
4. Select action type: Stock Split, Bonus Issue, Return of Capital, or Rights Issue
5. Enter the date and relevant values (ratio, quantity, price)
6. Click "Record Action"

> **Full guide:** [Corporate Actions](docs/ACTIONS.md)

---

## 8. Research & Planning Tools

Tools for research, monitoring, and financial planning beyond your existing portfolio.

### Research

All research tools are accessible via **Sidebar → Tools**:

| Tool                 | Purpose                                                                           | How to Access             |
| -------------------- | --------------------------------------------------------------------------------- | ------------------------- |
| **Watchlist**        | Monitor potential investments with price alerts and research notes                | Tools → Watchlist         |
| **Share Checker**    | Automated portfolio health checks — concentration, stale data, duplicates         | Tools → Share Checker     |
| **Market Sentiment** | Fear & Greed Index, VIX, ASX summary, sector heatmap                              | Tools → Market Sentiment  |
| **AI Assistant**     | Chat-based portfolio Q&A powered by Gemini                                        | Tools → AI Assistant      |

### Financial Planning

| Tool                | Purpose                                                                         | How to Access       |
| ------------------- | ------------------------------------------------------------------------------- | ------------------- |
| **FIRE Calculator** | Model your path to financial independence — years to FIRE, sensitivity analysis | Tools → FIRE Calculator |
| **Emergency Fund**  | Track savings target (3–6 months expenses) alongside investments                | ⏳ R4               |
| **Net Worth**       | Total assets minus liabilities over time                                        | ⏳ R4               |

The FIRE Calculator runs entirely client-side for instant feedback. It supports Australian superannuation integration, Coast FIRE calculation, and pessimistic/baseline/optimistic scenario comparison.

> **Full guide:** [Tools & Reports](docs/TOOLS.md)

---

## 9. Advanced Analytics

Quantitative tools for portfolio construction, optimisation, and forward-looking analysis. All analytics tools are accessible via **Sidebar → Analytics**. The Python analytics backend (`api/analytics/`) provides computation via FastAPI on Vercel Services.

### Portfolio Backtesting (Analytics → Backtesting)

Test hypothetical allocations against history:

- 5 strategies: Equal Weight, Min Variance, Max Sharpe, Risk Parity, Mean-Variance
- Walk-forward methodology with configurable rebalancing (monthly, quarterly, annually)
- Full output: CAGR, Sharpe, Sortino, max drawdown, Calmar ratio, equity curve, drawdown chart
- Strategy comparison and model selection via cross-validation

### Monte Carlo Simulation (Analytics → Monte Carlo Simulation)

Project future portfolio outcomes using randomised return paths:

- 3 methods: Bootstrap (historical resampling), Parametric (multivariate normal), Copula (Student-t for tail risk)
- Up to 10,000 simulations with fan chart (5th–95th percentile bands)
- Withdrawal modelling for retirement planning
- Distribution fitting (Normal, Student-t, Skew-Normal) with best-fit selection

### Risk Metrics (Analytics → Risk Metrics)

Comprehensive risk dashboard with 5 tabs:

- **Overview** — 19 metrics including Sharpe, Sortino, Calmar, Treynor, Omega, VaR, CVaR, capture ratios, R², skewness, kurtosis
- **Drawdowns** — Drawdown chart + episode table (start, trough, recovery, depth, duration)
- **Distribution** — Return histogram with VaR/CVaR statistics
- **Rolling** — Rolling Sharpe, Sortino, Beta over configurable window
- **Decomposition** — Per-holding risk contribution pie chart

Real benchmark comparison using ASX 200, S&P 500, MSCI World, and ETF proxies.

### Portfolio Optimisation (Analytics → Portfolio Optimisation)

| Family                      | Strategies                                         |
| --------------------------- | -------------------------------------------------- |
| **Mean-Variance**           | Max Sharpe, Min Risk, Max Return (3 objectives × 3 risk measures) |
| **Hierarchical**            | Hierarchical Risk Parity (HRP) with dendrogram     |
| **Risk Parity**             | Inverse volatility / risk budgeting                |

Weight constraints (min/max per asset), current vs recommended comparison chart, and rebalancing trade calculator.

### Efficient Frontier (Analytics → Efficient Frontier)

Interactive scatter plot showing the risk-return tradeoff curve:

- 50-point frontier with individual assets plotted
- Max Sharpe and Min Risk special points highlighted
- Hover to see allocation weights at any frontier point

### Black-Litterman Model (Analytics → Black-Litterman)

Combine market equilibrium with your personal investment views:

- Absolute views ("CBA returns 12%") and relative views ("CBA outperforms BHP by 5%")
- Per-view confidence sliders
- Prior vs posterior expected returns comparison table
- Optimal weights under BL model

### Estimation Methods

- **Expected returns** — Empirical, Shrunk (James-Stein), Exponentially Weighted, Equilibrium (CAPM)
- **Covariance** — Empirical, Ledoit-Wolf, OAS, Exponentially Weighted, Graphical Lasso

### Factor Analysis (Analytics → Factor Analysis)

Decompose returns into systematic risk factors:

- Principal Component Analysis (PCA) with explained variance and loadings
- Fama-French regression (market, size, value factors)

### Correlation Analysis (Analytics → Correlation Analysis)

- Full correlation matrix heatmap (colour-coded −1 red to +1 blue)
- Hierarchical clustering dendrogram
- Period selector (1Y, 3Y, 5Y)

### Tactical Allocation (Analytics → Tactical Allocation)

6 signal-based dynamic weighting strategies:

- Momentum, Mean Reversion, Risk-Adjusted Momentum
- Volatility Targeting, MA Crossover, Dual Momentum
- Signal scores, recommended weights, comparison chart

### Stress Testing (Analytics → Stress Testing)

Accessible at `/analytics/what-if` with 3 tabs:

- **Historical** — 6 crisis scenarios (GFC, COVID, Dot-com, 2022 Rate Shock, Black Monday, Asian Crisis)
- **Factor** — "If market drops X%, what happens?" with per-asset beta decomposition
- **Custom** — Per-asset shock inputs

### AI Features

- **AI Importer** — Parse broker statements, contract notes, and tax documents using Gemini AI (requires `GOOGLE_GENERATIVE_AI_API_KEY`)
- **AI Chat Assistant** — Ask questions about your portfolio, risk metrics, and investment strategies

> **Full guide:** [Advanced Analytics](docs/ADVANCED.md)

---

## 10. Data Export & Backup

You always own your data. Export everything at any time via **Sidebar → Settings → Export**.

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
- ✅ List/create holdings (`GET/POST /api/v1/portfolios/[id]/holdings`)
- ✅ Get/delete holding (`GET/DELETE /api/v1/portfolios/[id]/holdings/[holdingId]`)
- ✅ List/create transactions (`GET/POST /api/v1/portfolios/[id]/transactions`)
- ✅ Get/update/delete transaction (`GET/PATCH/DELETE /api/v1/portfolios/[id]/transactions/[txId]`)
- ✅ Portfolio performance (`GET /api/v1/portfolios/[id]/performance`)
- ✅ Portfolio diversity (`GET /api/v1/portfolios/[id]/diversity`)
- ✅ Import transactions (`POST /api/v1/portfolios/[id]/import`)
- ✅ Export portfolio (`GET /api/v1/portfolios/[id]/export`)
- ✅ Search instruments (`GET /api/v1/market/search?q=...`)
- ✅ Market quote (`GET /api/v1/market/quote/[code]`)
- ✅ Token management (`GET/POST/DELETE /api/v1/auth/token`)
- ✅ AI import (`POST /api/v1/ai-import`)
- ✅ AI chat (`POST /api/v1/chat`)
- ✅ Bearer token authentication with scope checking (read/write/admin)
- ✅ Rate limited to 100 requests/minute per token
- ✅ JSON response format with error codes

### To be Implemented

- ⏳ Webhooks for real-time notifications (R4)
- ⏳ SDKs

### Authentication

Bearer token with configurable scopes (read, write, admin) and optional expiry. Tokens are managed via **Sidebar → Settings → API Tokens**.

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
