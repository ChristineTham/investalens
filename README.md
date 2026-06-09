# InvestaLens

A comprehensive portfolio tracker and optimiser for Australian investors. Track holdings across any broker, calculate performance, generate ATO-compliant tax reports, and manage bonds, corporate actions, and more.

## Features (R1 MVP)

- **Authentication** — Email/password + Google OAuth via NextAuth.js v5
- **Portfolio Management** — Create, rename, delete, share portfolios with access levels
- **CSV Import** — 5-step wizard with 9 broker templates (CommSec, SelfWealth, Stake, CMC, Bell Direct, nabtrade, FIIG, IB)
- **Market Data** — ASX prices via Yahoo Finance, instrument search, daily price cron
- **Reports** — Performance, Contribution, Diversity, Future Income, Sold Securities, All Trades, Drawdown, Multi-Period, Calendar, Historical Cost
- **Tax** — Taxable Income Report, CGT with 5 allocation methods + discount, Unrealised CGT
- **Corporate Actions** — Splits, bonus, return of capital, rights issues, mergers
- **Bonds** — YTM, duration, maturity ladder, coupon schedule, credit ratings
- **Organisation** — Custom groups, labels, consolidated view
- **Watchlist** — Track potential investments
- **Data Export** — CSV (trades, holdings, dividends) + JSON backup
- **REST API** — Bearer token auth, rate limiting, portfolio/market endpoints

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, RSC, Server Actions) |
| UI | shadcn/ui (Base UI primitives), Tailwind CSS v4, Recharts |
| Database | PostgreSQL (Neon Serverless) via Prisma ORM 7 |
| Auth | NextAuth.js v5 (JWT sessions) |
| Language | TypeScript 5 + Python 3.12 (analytics backend) |
| Deployment | Vercel (free tier compatible) |
| Design | Rosely design system (warm cream/pink palette) |

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
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed test data
npx prisma db seed

# Start dev server
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000). Login with seeded user: `test@investalens.dev` / `TestPass123!`

### GitHub Codespaces

The project includes a devcontainer configuration. Open in Codespaces and run:

```bash
pnpm install && npx prisma generate && npx prisma migrate dev && npx prisma db seed
pnpm run dev
```

## Project Structure

```
app/                    # Next.js App Router pages
  (auth)/               # Login, register (unauthenticated)
  (dashboard)/          # All authenticated pages
    portfolio/          # Portfolio CRUD, holdings, import
    reports/            # 10 report pages
    tax/                # Tax reports (taxable income, CGT, unrealised)
    tools/              # Watchlist
    settings/           # Groups, labels, sharing, export, API tokens
    analytics/          # Advanced analytics (R2)
  api/                  # API routes
    auth/               # NextAuth.js handlers
    cron/               # Price fetching cron
    v1/                 # Public REST API
api/                    # Python serverless functions (Vercel)
components/
  ui/                   # shadcn/ui components (17 installed)
  charts/               # Recharts components (5)
  forms/                # Import wizard, transaction form, etc.
  layout/               # Sidebar, header
lib/
  actions/              # Server actions (auth, portfolio, holdings, etc.)
  calculations/         # Performance, position, parcels, bond analytics
  reports/              # Report generators (performance, tax, etc.)
  import/               # CSV parser, mapper, dedup, broker templates
  providers/            # Yahoo Finance, instrument search
  services/             # Price service, maturity alerts
  export/               # CSV/JSON export functions
  api/                  # API middleware, rate limiting
  validators/           # Zod schemas
prisma/
  schema.prisma         # 22 models
  migrations/           # Database migrations
  seed.ts               # Test data seeder
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

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | Your Neon connection string (pooled) | ✅ |
| `AUTH_SECRET` | Random 32+ char string (`openssl rand -hex 32`) | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Optional |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Optional |
| `CRON_SECRET` | Secret for cron endpoint auth | Optional |
| `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL | Optional |

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
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

### 6. Verify

- Visit your deployment URL — should show landing page
- Navigate to `/register` to create an account
- The daily price cron runs automatically at 08:00 UTC weekdays

### Vercel Configuration

The project includes `vercel.json` with:
- Python function config (60s timeout for analytics)
- Cron schedule: `/api/cron/prices` at 08:00 UTC Mon–Fri

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm run dev` | Start development server |
| `pnpm run build` | Production build |
| `pnpm run lint` | ESLint check |
| `npx tsc --noEmit` | TypeScript type check |
| `npx prisma generate` | Generate Prisma client |
| `npx prisma migrate dev` | Create/apply migrations |
| `npx prisma db seed` | Seed test data |
| `npx prisma studio` | Visual database browser |

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
