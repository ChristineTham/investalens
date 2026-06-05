# InvestaLens

A portfolio tracker and optimiser web application for analysing investment performance.

## Overview

InvestaLens helps investors track, analyse and optimise their investment portfolios. It automatically imports price, performance and dividend data from 700,000+ global stocks, crypto, ETFs and funds, then adds powerful optimisation capabilities on top.

InvestaLens shows you your true investment returns — including capital gains, dividends, currency fluctuations and fees — all in one place. Go beyond what your broker shows you.

## Features (Planned)

### Portfolio Tracking
- Automatically track price and performance data on shares, ETFs, managed funds and crypto
- Import holdings and transactions from CSV files exported by any broker or institution
- Flexible custom field mapping to handle any CSV format with saveable mapping templates
- Optional integration with Sharesight API (supports 200+ global brokers) — not required
- Direct broker API integrations where available
- Support for 60+ stock exchanges and markets worldwide
- Multi-currency support with automatic FX conversion to your base currency
- Track cash accounts and property alongside investments for a holistic wealth view
- Corporate actions (splits, mergers, consolidations) handled automatically
- Custom groups and labels to organise holdings by your own dimensions

### Dividend Tracking & Forecasting
- Automatically track dividends, distributions and interest payments across all holdings
- Dividend reinvestment plan (DRP) tracking showing compounding effects
- Future income report with estimated, announced, pending and paid dividends
- Calendar view showing exact dates, amounts and payment status
- Income breakdown by local (franked/unfranked) and foreign sources
- Forecast dividend income up to 3 years ahead

### Performance Reporting
- Calculate true total return including capital gains, dividends and currency fluctuations
- Annualised performance reporting over any time period (preset or custom dates, 20+ year history)
- Multi-period comparison across up to 5 distinct or cumulative time periods
- Benchmark against any share, ETF or managed fund
- Contribution analysis showing how each holding drives overall returns
- Group and compare performance across countries, industries, sectors and custom dimensions
- Report across multiple portfolios for a complete picture

### Diversification & Allocation
- Diversity report showing asset allocation across FACTSET classifications or custom groupings
- ETF exposure report — see inside your ETFs to know what you actually own and identify overlaps
- Rebalancing insights comparing current allocation to target weights

### Research & Market Monitoring
- Watchlist to track potential investments before buying (price alerts, notes, performance)
- Share Checker — compare hypothetical $10k investments in any security
- Market sentiment indicators (Fear & Greed Index, VIX, market breadth)
- News and corporate actions feed for watched and held securities

### Risk Analysis (X-ray)
- Static portfolio analysis identifying concentration, sector overweight, and correlation risks
- ETF overlap detection across multiple funds
- Drawdown vulnerability and liquidity assessment
- Configurable thresholds with severity-based alerts
- Dividend dependency analysis

### Financial Planning
- FIRE Calculator — model path to financial independence with projections
- Emergency fund tracking with progress visualisation
- Net worth dashboard combining assets and liabilities
- Sensitivity analysis for return rate, contribution, and withdrawal scenarios

### Public API
- RESTful API with Bearer Token authentication
- Full CRUD for portfolios, holdings, and transactions
- Programmatic report generation (JSON, CSV, PDF)
- Webhooks for real-time event notifications
- Bulk import/export endpoints

### Tax Reporting (Australian Focus)
- Taxable income report with dividend income broken out by franked, unfranked, and foreign
- Capital gains tax (CGT) report calculated per ATO rules
- Unrealised CGT report for tax loss harvesting — model net gains from selling positions
- Compare CGT sale allocation methods (FIFO, LIFO, specific identification) to optimise tax
- CGT discounts automatically applied based on tax entity (Individual/Trust, SMSF, Company)
- All trades report for the financial year
- Franking credits tracking
- Share tax reports securely with your accountant

### Portfolio Optimisation & Backtesting
- Mean-variance optimisation (Markowitz efficient frontier)
- Risk parity, minimum variance, CVaR, and maximum diversification strategies
- Monte Carlo simulation for retirement planning and withdrawal sustainability
- Portfolio backtesting with comprehensive risk/return metrics
- Rebalancing recommendations with tax-aware constraints
- Efficient frontier visualisation comparing current vs optimal allocation
- Black-Litterman model for incorporating investor views
- Factor regression analysis (CAPM, Fama-French 3/5-factor, Carhart, q-factor)
- Tactical asset allocation models (momentum, moving averages, target volatility)
- Scenario and stress testing against historical crises

### Visualisation & Reporting
- Interactive dashboards with drill-down capability
- Asset allocation sunburst and treemap charts
- Performance attribution waterfall charts
- Risk/return scatter plots and efficient frontier visualisation
- Dividend income timeline and calendar views
- Export reports to PDF, Excel or Google Sheets
- Secure portfolio sharing with tiered permission levels (read-only, full access)
- Full data export (JSON, CSV) with automated backup scheduling

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 14+ (App Router), React, TypeScript | Server Components for data-heavy pages |
| UI Framework | Tailwind CSS + shadcn/ui + Tremor | Zero-runtime styling, accessible components |
| Charts | Recharts + D3.js | Recharts for standard reports; D3 for custom finance visualisations |
| Core Backend | Next.js API Routes (TypeScript) | Auth, CRUD, import, tax, reports |
| Analytics Engine | Python Serverless Functions | skfolio, scipy, numpy, pandas, statsmodels |
| Database | PostgreSQL (Neon Serverless) | Scales to Azure Database for PostgreSQL |
| ORM | Prisma (with Accelerate) | Type-safe, migrations, serverless connection pooling |
| Auth | NextAuth.js (Auth.js v5) | OAuth + credentials, session in DB |
| Market Data | Yahoo Finance + Alpha Vantage | Abstracted behind DataProvider interface |
| FX Rates | Open Exchange Rates | Cached daily |
| AI (Importer) | Google Gemini via Antigravity SDK + Vercel AI SDK (optional) | Multimodal document extraction (PDFs, screenshots → structured trade data) |
| Cache | Vercel KV → Azure Blob Storage | Analytics result caching |
| Deployment (initial) | Vercel | Free tier, native Next.js + Python support |
| Deployment (scale) | Azure (Static Web Apps + Functions + PostgreSQL) | Premium Functions for analytics, no timeout limits |

## Documentation

| Document | Description |
|----------|-------------|
| **[USER-MANUAL.md](USER-MANUAL.md)** | **Complete user manual — start here** |
| [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md) | User onboarding, portfolio setup, and import guide |
| [docs/DATA_IMPORT.md](docs/DATA_IMPORT.md) | Import pipeline, CSV field mapping, and broker templates |
| [docs/ASSETS.md](docs/ASSETS.md) | Supported asset types and stock exchanges |
| [docs/ACCOUNT.md](docs/ACCOUNT.md) | Account management, sharing, groups, and labels |
| [docs/TOOLS.md](docs/TOOLS.md) | Performance, allocation, and tax reports |
| [docs/TAX.md](docs/TAX.md) | Australian tax reporting (CGT, taxable income, AMIT) |
| [docs/ACTIONS.md](docs/ACTIONS.md) | Corporate actions (splits, mergers, rights, demergers) |
| [docs/ADVANCED.md](docs/ADVANCED.md) | Backtesting, optimisation, Monte Carlo, and factor analysis |
| [docs/API.md](docs/API.md) | Public REST API reference and authentication |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | High-level system architecture and design decisions |
| [docs/SHARESIGHT_API.md](docs/SHARESIGHT_API.md) | Optional Sharesight API integration |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- API credentials (for data import)

### Development

```bash
# Clone the repository
git clone https://github.com/ChristineTham/investalens.git
cd investalens

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

## Project Structure

```
investalens/
├── src/
│   ├── app/            # Next.js app router pages
│   ├── components/     # React components
│   ├── lib/            # Utility functions and shared logic
│   ├── services/       # External API integrations (import connectors)
│   └── types/          # TypeScript type definitions
├── prisma/             # Database schema and migrations
├── public/             # Static assets
├── tests/              # Test files
└── docs/               # Additional documentation
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

Christine Tham
