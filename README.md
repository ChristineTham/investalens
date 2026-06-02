# InvestaLens

A portfolio tracker and optimiser web application for analysing investment performance.

## Overview

InvestaLens helps investors track, analyse and optimise their investment portfolios. It automatically imports price, performance and dividend data from 700,000+ global stocks, crypto, ETFs and funds, then adds powerful optimisation capabilities on top.

InvestaLens shows you your true investment returns — including capital gains, dividends, currency fluctuations and fees — all in one place. Go beyond what your broker shows you.

## Features (Planned)

### Portfolio Tracking
- Automatically track price and performance data on shares, ETFs, managed funds and crypto
- Import holdings and transactions from Sharesight (which integrates with 200+ global brokers)
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

### Tax Reporting (Australian Focus)
- Taxable income report with dividend income broken out by franked, unfranked, and foreign
- Capital gains tax (CGT) report calculated per ATO rules
- Unrealised CGT report for tax loss harvesting — model net gains from selling positions
- Compare CGT sale allocation methods (FIFO, LIFO, specific identification) to optimise tax
- CGT discounts automatically applied based on tax entity (Individual/Trust, SMSF, Company)
- All trades report for the financial year
- Franking credits tracking
- Share tax reports securely with your accountant

### Portfolio Optimisation
- Mean-variance optimisation (Markowitz efficient frontier)
- Risk parity and minimum variance portfolio construction
- Monte Carlo simulation for scenario analysis and stress testing
- Rebalancing recommendations with tax-aware constraints
- Efficient frontier visualisation comparing current vs optimal allocation
- Black-Litterman model for incorporating investor views
- Factor exposure analysis

### Visualisation & Reporting
- Interactive dashboards with drill-down capability
- Asset allocation sunburst and treemap charts
- Performance attribution waterfall charts
- Risk/return scatter plots and efficient frontier visualisation
- Dividend income timeline and calendar views
- Export reports to PDF, Excel or Google Sheets
- Secure portfolio sharing with tiered permission levels (read-only, full access)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React with TypeScript |
| UI Framework | Tailwind CSS + shadcn/ui |
| Charts | Recharts or D3.js |
| Backend | Next.js (App Router with API routes) |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth.js |
| Data Source | Yahoo Finance and Alphavantage |
| Deployment | Vercel |

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
│   ├── services/       # External API integrations (Sharesight)
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
