# InvestaLens

A comprehensive portfolio tracker and optimiser for Australian investors. Track holdings across any broker, calculate performance, generate ATO-compliant tax reports, and manage bonds, corporate actions, and more.

## Features (R1 MVP)

- **Authentication** — Email/password + Google OAuth via NextAuth.js v5
- **Portfolio Management** — Create, rename, delete, share portfolios with access levels
- **Multi-Type Import** — Import hub for shares, bonds, and cash. One-step quick import for known brokers, a category-based guided wizard, and dedicated custom importers (e.g. the FIIG multi-sheet data extract). 9 broker templates (CommSec, SelfWealth, Stake, CMC, Bell Direct, nabtrade, FIIG, IB) plus generic bank-statement templates. All paths resolve duplicates automatically
- **Market Data** — ASX prices via Yahoo Finance, FIIG rate-sheet bond prices (matched by ISIN), instrument search, daily price cron
- **Stock Information** — Rich company data per holding via yfinance (Python): profile & description, key fundamentals, analyst price targets & recommendation trend, upgrades/downgrades, earnings/dividend calendar, recent news, financial statements, and corporate actions
- **Reports** — Performance, Contribution, Diversity, Future Income, Sold Securities, All Trades, Drawdown, Multi-Period, Calendar, Historical Cost
- **Tax** — Taxable Income Report, CGT with 5 allocation methods + discount, Unrealised CGT
- **Corporate Actions** — Splits, bonus, return of capital, rights issues, mergers
- **Bonds** — YTM, duration, maturity ladder, coupon schedule, credit ratings, coupon income, principal repayments, custody fee tracking, and live FIIG rate-sheet price updates
- **Organisation** — Custom groups, labels, consolidated view
- **Watchlist** — Track potential investments
- **Data Export** — CSV (trades, holdings, dividends) + JSON backup
- **REST API** — Bearer token auth, rate limiting, full CRUD (portfolios, holdings, transactions, performance, diversity, import/export, market quote, token management)

## Features (R2 Analytics)

- **Risk Metrics** — 19 metrics (Sharpe, Sortino, VaR, CVaR, Calmar, Omega, capture ratios, R², skewness, kurtosis) with 5-tab dashboard
- **Backtesting** — Walk-forward backtest with 5 strategies, equity curves, strategy comparison, cross-validation
- **Portfolio Optimisation** — Mean-Variance, HRP, Risk Parity with weight constraints and rebalancing trades
- **Efficient Frontier** — Interactive scatter plot with frontier curve, Max Sharpe, Min Risk points
- **Black-Litterman** — Combine market equilibrium with absolute/relative investment views
- **Monte Carlo** — Bootstrap, parametric, copula simulations with fan charts and withdrawal modelling
- **FIRE Calculator** — Financial independence projection with Coast FIRE, scenarios, super integration
- **Stress Testing** — 6 historical crisis scenarios, factor stress, custom shocks
- **Factor Analysis** — PCA + Fama-French factor decomposition
- **Correlation Analysis** — Heatmap, hierarchical clustering, rolling correlations
- **Tactical Allocation** — 6 signal-based strategies (momentum, mean reversion, vol targeting, etc.)
- **ETF X-ray** — Look-through to underlying holdings, overlap detection, concentration alerts
- **Share Checker** — Automated portfolio health checks (stale data, concentration, duplicates)
- **Market Sentiment** — Fear & Greed Index, VIX, ASX summary, sector heatmap
- **AI Importer** — Parse financial documents with Gemini AI (optional)
- **AI Chat Assistant** — Portfolio Q&A powered by Gemini (optional)

## Tech Stack

| Layer      | Technology                                                |
| ---------- | --------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, RSC, Server Actions)              |
| UI         | shadcn/ui (Base UI primitives), Tailwind CSS v4, Recharts |
| Database   | PostgreSQL (Neon Serverless) via Prisma ORM 7             |
| Auth       | NextAuth.js v5 (JWT sessions)                             |
| Language   | TypeScript 5 + Python 3.12 (analytics backend)            |
| Deployment | Vercel (free tier compatible)                             |
| Design     | Rosely design system (warm cream/pink palette)            |

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm
- PostgreSQL database (Neon recommended)
- Python 3.12 + uv (for analytics backend)

### Local Development

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL and AUTH_SECRET

# Generate Prisma client
pnpm exec prisma generate

# Run migrations
pnpm exec prisma migrate dev

# Seed test data
pnpm exec prisma db seed

# Start dev server
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000). Login with seeded user: `test@investalens.dev` / `TestPass123!`

### GitHub Codespaces

The project includes a devcontainer configuration. Open in Codespaces and run:

```bash
pnpm install && pnpm exec prisma generate && pnpm exec prisma migrate dev && pnpm exec prisma db seed
pnpm run dev
```

## Project Structure

```
app/                    # Next.js App Router pages
  (auth)/               # Login, register (unauthenticated)
  (dashboard)/          # All authenticated pages
    dashboard/          # Summary dashboard (cards, performance chart, allocation treemap, recent activity, all transactions)
    portfolio/          # Portfolio CRUD, holdings, import, bonds, cash
    reports/            # 10 report pages
    tax/                # Tax reports (taxable income, CGT, unrealised)
    tools/              # Watchlist, FIRE, Share Checker, Sentiment, AI Assistant
    settings/           # Groups, labels, sharing, export, API tokens
    analytics/          # 13 analytics tools (risk, backtest, optimize, frontier, etc.)
  api/                  # API routes
    auth/               # NextAuth.js handlers
    cron/               # Price fetching cron
    v1/                 # Public REST API (portfolios, holdings, transactions, market, auth)
  help/                 # Public help/documentation pages
api/                    # Python FastAPI analytics (Vercel Services)
  analytics/            # Optimize, backtest, frontier, Monte Carlo, stress test, stock-info (yfinance)
  utils/                # Python helpers (transforms, response)
components/
  ui/                   # shadcn/ui components (17 installed)
  charts/               # Recharts + custom chart components (15)
  analytics/            # Analytics UI components (selectors, metric cards)
  forms/                # Import wizard, transaction form, etc.
  layout/               # Sidebar, header, breadcrumbs
lib/
  actions/              # Server actions (auth, portfolio, holdings, transactions, etc.)
  calculations/         # Performance, position, parcels, bond analytics, risk, drawdown, FIRE
  constants/            # Shared constants (benchmarks)
  data/                 # Static data (exchange registry)
  reports/              # Report generators (performance, tax, etc.)
  import/               # CSV parser, mapper, cash mapper, dedup, broker + cash templates, custom importers (FIIG)
  providers/            # Yahoo Finance, FIIG bond rates, instrument search, FX rates
  services/             # Price, analytics data, benchmark, ETF X-ray, share checker, sentiment, factor data, stock info
  export/               # CSV/JSON export functions
  api/                  # API middleware, rate limiting
  validators/           # Zod schemas
prisma/
  schema.prisma         # 24 models
  migrations/           # Database migrations
  seed.ts               # Test data seeder
scripts/                # Standalone scripts (seed benchmarks, fetch prices, test pipeline)
test-data/              # Sample broker CSVs for testing
```

## Deploy to Vercel

### 1. Push to GitHub

```bash
git add -A
git commit -m "feat: R1 MVP"
git push origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository (`ChristineTham/investalens`)
3. Vercel auto-detects Next.js — no build settings changes needed

### 3. Set Environment Variables

In Vercel project settings → Environment Variables, add:

| Variable               | Value                                           | Required |
| ---------------------- | ----------------------------------------------- | -------- |
| `DATABASE_URL`         | Your Neon connection string (pooled)            | ✅       |
| `AUTH_SECRET`          | Random 32+ char string (`openssl rand -hex 32`) | ✅       |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                          | Optional |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret                      | Optional |
| `CRON_SECRET`          | Secret for cron endpoint auth                   | Optional |
| `NEXT_PUBLIC_APP_URL`  | Your Vercel deployment URL                      | Optional |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key (for AI Import + Chat)    | Optional |

### 4. Deploy

Click **Deploy**. Vercel will:

- Install dependencies via pnpm
- Generate Prisma client
- Build the Next.js app
- Deploy serverless functions

### 5. Run Database Migration

After first deploy, run migrations against your production database:

```bash
# Set DATABASE_URL to your production Neon connection string
DATABASE_URL="postgresql://..." pnpm exec prisma migrate deploy
```

### 6. Verify

- Visit your deployment URL — should show landing page
- Navigate to `/register` to create an account
- The daily price cron runs automatically at 08:00 UTC weekdays

### Vercel Configuration

The project includes `vercel.json` with:

- `experimentalServices` — Next.js frontend + Python FastAPI analytics as separate services
- Cron schedule: `/api/cron/prices` at 08:00 UTC Mon–Fri (fetches holding + benchmark prices)
- Framework Preset must be set to **"Services"** in Vercel dashboard

## Scripts

| Command                       | Purpose                  |
| ----------------------------- | ------------------------ |
| `pnpm run dev`                | Start development server |
| `pnpm run build`              | Production build         |
| `pnpm run lint`               | ESLint check             |
| `pnpm exec tsc --noEmit`      | TypeScript type check    |
| `pnpm exec prisma generate`   | Generate Prisma client   |
| `pnpm exec prisma migrate dev`| Create/apply migrations  |
| `pnpm exec prisma db seed`    | Seed test data           |
| `pnpm exec prisma studio`     | Visual database browser  |

## Documentation

- [User Manual](USER-MANUAL.md) — Complete feature guide
- [Getting Started](docs/GETTING-STARTED.md) — Account setup and import
- [Data Import](docs/DATA_IMPORT.md) — CSV mapping and broker templates
- [Tax Reporting](docs/TAX.md) — CGT, taxable income, AMIT
- [API Reference](docs/API.md) — REST API endpoints
- [Architecture](docs/ARCHITECTURE.md) — Technical design decisions
- [Contributing](CONTRIBUTING.md) — Development guidelines

## License

See [LICENSE](LICENSE).
