# InvestaLens Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                   │
│  ┌───────────┐  ┌───────────┐  ┌────────────────┐  │
│  │ Dashboard │  │ Portfolio │  │  Optimisation  │  │
│  │   Views   │  │  Manager  │  │     Engine     │  │
│  └───────────┘  └───────────┘  └────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │ API Routes
┌──────────────────────┼──────────────────────────────┐
│                  Backend (Next.js)                    │
│  ┌───────────┐  ┌───────────┐  ┌────────────────┐  │
│  │   Auth    │  │  Portfolio │  │  Optimisation  │  │
│  │  Service  │  │   Service  │  │    Service     │  │
│  └───────────┘  └───────────┘  └────────────────┘  │
└──────────┬───────────┬───────────────┬──────────────┘
           │           │               │
    ┌──────┴──┐  ┌─────┴─────┐  ┌─────┴──────┐
    │PostgreSQL│  │ Sharesight│  │Market Data │
    │    DB    │  │    API    │  │    APIs    │
    └─────────┘  └───────────┘  └────────────┘
```

## Data Flow

### Portfolio Import
1. User authenticates with Sharesight via OAuth2
2. App fetches portfolios, holdings, and transactions
3. Data is normalised and stored in PostgreSQL
4. Background jobs keep data in sync

### Performance Calculation
1. Historical prices fetched from market data APIs
2. Time-weighted returns calculated per holding and portfolio
3. FX rates applied for multi-currency portfolios
4. Results cached for dashboard display

### Portfolio Optimisation
1. User selects universe of assets and constraints
2. Historical returns and covariance matrix computed
3. Optimisation solver finds efficient frontier
4. Results presented with comparison to current allocation

## Key Design Decisions

- **Next.js App Router** for unified frontend/backend with server components
- **PostgreSQL** for relational data (portfolios, transactions, prices)
- **Prisma** for type-safe database access and migrations
- **Server-side calculations** for optimisation (keeps sensitive data secure)
- **Incremental sync** with Sharesight to minimise API calls
