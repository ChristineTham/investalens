# InvestaLens Architecture

## High-Level Architecture

InvestaLens uses a **dual-runtime architecture**: a Next.js application for the frontend, API, and core portfolio logic, plus Python serverless functions for computationally intensive analytics (optimisation, Monte Carlo, factor models, copula fitting).

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js / React)                     │
│  ┌───────────┐  ┌───────────┐  ┌────────────┐  ┌───────────────┐   │
│  │ Dashboard │  │ Portfolio │  │  Reports   │  │  Analytics    │   │
│  │   Views   │  │  Manager  │  │  & Tools   │  │    UI         │   │
│  └───────────┘  └───────────┘  └────────────┘  └───────────────┘   │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │      API Gateway         │
              │   (Next.js API Routes)   │
              └─────┬──────────────┬────┘
                    │              │
    ┌───────────────┴───┐    ┌────┴──────────────────────┐
    │  Core Backend     │    │  Analytics Engine          │
    │  (TypeScript)     │    │  (Python Serverless)       │
    │                   │    │                            │
    │ • Auth Service    │    │ • Portfolio Optimisation   │
    │ • Portfolio CRUD  │    │ • Monte Carlo Simulation   │
    │ • Import Engine   │    │ • Factor Analysis          │
    │ • Tax Calculations│    │ • Covariance Estimation    │
    │ • Report Engine   │    │ • Copula / Distribution    │
    │ • Webhook Dispatch│    │ • Backtesting Engine       │
    │ • Price Fetcher   │    │ • Stress Testing           │
    └────────┬──────────┘    └────────────┬──────────────┘
             │                            │
    ┌────────┴────────┐          ┌────────┴────────┐
    │   PostgreSQL    │          │   Object Store   │
    │   (Primary DB)  │          │  (Result Cache)  │
    └─────────────────┘          └─────────────────┘
             │
    ┌────────┴────────────────────────┐
    │         External Services        │
    │  • Yahoo Finance / Alphavantage  │
    │  • Open Exchange Rates (FX)      │
    │  • Sharesight API (optional)     │
    │  • Broker APIs (optional)        │
    │  • Google Gemini (AI Importer)    │
    └─────────────────────────────────┘
```

---

## Data Flow

### Portfolio Import

1. User imports data via CSV upload, broker API, Sharesight, or manual entry
2. Import Engine parses and normalises data to internal schema
3. Data is validated, deduplicated, and stored in PostgreSQL
4. For API sources, background jobs keep data in sync incrementally

### Performance Calculation

1. Historical prices fetched from market data APIs (cached in DB)
2. Simple, nominal returns calculated per holding and portfolio (capital gain + income, net of fees); time-weighted / money-weighted (IRR) returns are a planned enhancement
3. FX rates applied for multi-currency portfolios
4. Results cached for dashboard display with configurable TTL

### Advanced Analytics (Python Path)

1. User configures analysis parameters via the frontend
2. Next.js client component calls the Python FastAPI endpoint directly (served as a Vercel Service at `/api/analytics/`)
3. Python function runs computation (optimisation, simulation, factor analysis, etc.)
4. Results returned as JSON and cached in-memory with configurable TTL
5. Python and Next.js run as separate Vercel Services via `experimentalServices` in `vercel.json`

### Portfolio Optimisation

1. User selects universe of assets and constraints
2. Historical returns fetched; covariance matrix estimated (choice of 11 estimators)
3. Optimisation solver runs selected strategy (mean-variance, HRP, HERC, etc.)
4. Results include efficient frontier, optimal weights, and comparison to current allocation

---

## Tech Stack Decisions

### Decision Framework

Each technology choice was evaluated against these criteria:

1. **Free-tier viability** — Must deploy at zero cost for initial development and small user base
2. **Scalability path** — Must scale to Azure (preferred hyperscaler) without rewrite
3. **Developer experience** — Strong typing, good tooling, active ecosystem
4. **Serverless-first** — Minimise infrastructure management; pay only for usage
5. **Dual-runtime support** — TypeScript for core logic, Python for scientific computing

---

### Frontend Framework

| Option                      | Pros                                                                                   | Cons                                                       |
| --------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Next.js (App Router)** ✅ | SSR/SSG, API routes, React Server Components, native Vercel support, massive ecosystem | Large bundle if not careful, Vercel-optimised but portable |
| Remix                       | Nested routes, great data loading, runs anywhere                                       | Smaller ecosystem, less mature hosting story               |
| SvelteKit                   | Excellent performance, smaller bundles, growing ecosystem                              | Smaller talent pool, fewer component libraries             |
| Nuxt (Vue)                  | Similar to Next.js for Vue, good SSR                                                   | Vue ecosystem smaller for finance/charting                 |
| Astro                       | Content-focused, partial hydration, fast                                               | Less suited for highly interactive app UI                  |

**Decision: Next.js 14+ (App Router)**

- React Server Components reduce client JS for data-heavy pages (reports, tables)
- API routes co-located with frontend simplify deployment and reduce latency
- Native deployment to Vercel free tier; portable to Azure Static Web Apps + Azure Functions
- Largest ecosystem for charting libraries (Recharts, D3, Tremor) and financial UI components
- TypeScript-first with excellent DX

---

### UI Framework

| Option                          | Pros                                                                                  | Cons                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Tailwind CSS + shadcn/ui** ✅ | Utility-first, copy-paste components (own the code), fully customisable, small bundle | More manual assembly than opinionated libraries               |
| Material UI (MUI)               | Complete, battle-tested, accessible                                                   | Heavy bundle, opinionated styling, runtime CSS-in-JS overhead |
| Chakra UI                       | Good DX, accessible, composable                                                       | Runtime overhead, less customisable than Tailwind             |
| Ant Design                      | Enterprise-grade, extensive components                                                | Very opinionated, CJK-first documentation                     |
| Mantine                         | Modern, many hooks, good DX                                                           | Smaller community than MUI/Tailwind                           |

**Decision: Tailwind CSS + shadcn/ui (Base UI)**

- Zero runtime overhead (styles compiled at build time)
- shadcn/ui provides accessible, well-designed components (tables, charts, forms, dialogs) as source code you own
- Easily themed for financial application aesthetics (data-dense layouts, dark mode)
- Tree-shakes perfectly — only CSS you use ships to client
- Tremor (built on Tailwind + shadcn primitives) adds pre-built dashboard components

---

### Charting

| Option                           | Pros                                               | Cons                                       |
| -------------------------------- | -------------------------------------------------- | ------------------------------------------ |
| **Recharts** ✅ (primary)        | React-native, composable, good for standard charts | Limited for highly custom financial charts |
| D3.js (supplementary)            | Unlimited customisation, industry standard         | Steep learning curve, imperative API       |
| Lightweight Charts (TradingView) | Professional financial charts, candlesticks, free  | Limited chart types beyond financial       |
| Apache ECharts                   | Extremely powerful, many chart types               | Large bundle, less React-native            |
| Plotly.js                        | Scientific plotting, interactive                   | Very large bundle                          |

**Decision: Recharts (primary) + D3.js (custom visualisations)**

- Recharts for standard reports: line, bar, pie, area, scatter, treemap
- D3.js for efficient frontier curves, correlation heatmaps, Sankey/waterfall charts
- TradingView Lightweight Charts considered for future price chart feature
- Avoids massive bundle — Recharts tree-shakes well

---

### Backend Runtime

| Option                                 | Pros                                                   | Cons                                                         |
| -------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| **Next.js API Routes (TypeScript)** ✅ | Co-located with frontend, type-safe, simple deployment | Serverless timeout limits, no Python                         |
| Express / Fastify (Node.js)            | Flexible, long-running processes                       | Separate deployment, more infrastructure                     |
| **Python (FastAPI)** ✅ for analytics  | Access to skfolio, scipy, numpy, scikit-learn          | Separate runtime, cold starts                                |
| Django                                 | Batteries-included, good ORM                           | Heavyweight for this use case, duplicate of Next.js features |
| Go                                     | Fast, low memory, great for microservices              | No scientific computing ecosystem                            |

**Decision: Dual-runtime — Next.js API Routes + Python Serverless Functions**

**TypeScript (Next.js)** handles:

- Authentication and session management
- Portfolio CRUD, transaction processing, import pipeline
- Tax calculations (CGT, AMIT — rule-based logic suits TypeScript)
- Report generation, data aggregation
- Webhook dispatch, price fetching, cron jobs
- Public REST API

**Python** handles (via serverless functions):

- Portfolio optimisation (skfolio: HRP, HERC, NCO, mean-variance, risk parity)
- Covariance estimation (Ledoit-Wolf, Random Matrix Theory denoising, Gerber, Graphical Lasso)
- Monte Carlo simulation (parametric, bootstrap, copula-based)
- Factor analysis and regression (statsmodels, scikit-learn)
- Distribution fitting (Vine Copulas, heavy-tailed distributions)
- Backtesting engine (vectorised operations on large time series)
- Black-Litterman with Entropy Pooling
- Cross-validation and hyperparameter tuning

**Why not pure TypeScript for analytics?**

- No TypeScript equivalent of skfolio, scipy.optimize, statsmodels, or copulae
- NumPy/pandas vectorisation is 10–100× faster than JS for matrix operations
- Python scientific ecosystem is irreplaceable for quantitative finance

---

### Python Serverless: Function Design

Serverless constraints require careful function architecture:

#### Deployment Host Limits (Free Tier)

| Platform                      | Max Duration                  | Max Bundle Size   | Memory       | Cold Start |
| ----------------------------- | ----------------------------- | ----------------- | ------------ | ---------- |
| Vercel (Hobby)                | 10s (default), 60s (Pro)      | 50 MB (zipped)    | 1024 MB      | 1–5s       |
| Cloudflare Workers            | 30s (free), 15 min (paid)     | 10 MB (no Python) | 128 MB       | <1ms       |
| Azure Functions (Consumption) | 5 min (default), 10 min (max) | No hard limit     | Up to 1.5 GB | 2–10s      |
| AWS Lambda                    | 15 min                        | 250 MB (unzipped) | Up to 10 GB  | 1–10s      |
| Netlify Functions             | 10s (free), 26s (paid)        | 50 MB             | 1024 MB      | 1–5s       |

#### Optimisation Strategies

| Strategy                       | Description                                                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **Slim dependencies**          | Use `numpy`, `scipy`, `pandas` only — avoid full scikit-learn where possible. Ship pre-compiled wheels. Target <50 MB zipped |
| **Lazy imports**               | Import heavy modules inside function handler, not at module level — reduces cold start                                       |
| **Chunked computation**        | Break large optimisations into stages: (1) data prep, (2) covariance estimation, (3) optimisation. Cache intermediates       |
| **Result caching**             | Cache optimisation results keyed by (portfolio_hash, parameters, data_date). Avoid re-running identical jobs                 |
| **Pre-warmed pools**           | On Azure: use Premium plan with pre-warmed instances for production. On Vercel: use cron to keep functions warm              |
| **Async job pattern**          | For jobs >10s: return a job ID immediately, client polls for completion. Avoids gateway timeouts                             |
| **Custom Docker (scale path)** | When outgrowing serverless limits: deploy Python functions as Azure Container Apps with auto-scale to zero                   |

#### Function Decomposition

Split analytics into focused, independently deployable functions:

```
/api/analytics/
├── optimize/          # Portfolio optimisation (single strategy)
├── frontier/          # Efficient frontier (calls optimize N times)
├── montecarlo/        # Monte Carlo simulation
├── backtest/          # Historical backtest
├── factor/            # Factor regression
├── covariance/        # Covariance estimation (cacheable)
├── stress-test/       # Scenario & conditional stress testing
└── validate/          # Cross-validation & model selection
```

Each function is <30 MB, completes in <10s for typical portfolios (≤50 assets), and caches results.

---

### Database

| Option                       | Pros                                                  | Cons                                                                      |
| ---------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------- |
| **PostgreSQL (via Neon)** ✅ | Full SQL, JSONB, excellent for financial data, mature | Requires managed service for serverless                                   |
| Supabase (PostgreSQL)        | Hosted Postgres + Auth + Realtime, generous free tier | Vendor coupling, less control                                             |
| PlanetScale (MySQL)          | Serverless MySQL, branching, generous free tier       | MySQL limitations (no arrays, weaker JSON)                                |
| Turso (libSQL/SQLite)        | Edge-replicated, very fast reads, generous free tier  | Limited for complex queries, no stored procedures                         |
| MongoDB Atlas                | Flexible schema, free tier                            | Poor for relational financial data, no ACID transactions across documents |
| CockroachDB                  | Distributed PostgreSQL, free tier                     | Overkill for initial scale, higher complexity                             |

**Decision: PostgreSQL via Neon Serverless**

- **Neon** provides serverless PostgreSQL with auto-suspend (free tier: 0.5 GB storage, 190 compute hours/month)
- PostgreSQL is the natural fit for financial data: ACID transactions, decimal precision, complex joins (portfolio → holdings → transactions → prices)
- JSONB columns for flexible metadata (broker-specific fields, AMIT components)
- Scales to Azure Database for PostgreSQL Flexible Server when migrating to hyperscaler
- Connection pooling via Neon's serverless driver (`@neondatabase/serverless`) — works in edge/serverless without persistent connections
- Alternative: **Supabase** (same underlying Postgres, adds Auth/Realtime but more vendor lock-in)

**Migration path to Azure:**

1. Initial: Neon free tier (serverless PostgreSQL)
2. Growth: Neon Pro or Supabase Pro
3. Scale: Azure Database for PostgreSQL Flexible Server (same SQL, same schema, pg_dump migration)

---

### ORM / Database Client

| Option        | Pros                                                   | Cons                                                                                                    |
| ------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| **Prisma** ✅ | Type-safe, auto-generated client, migrations, great DX | Edge runtime incompatibility (requires Prisma Accelerate or Data Proxy for serverless), slight overhead |
| Drizzle ORM   | Lightweight, SQL-like syntax, edge-compatible, fast    | Less mature, fewer features than Prisma                                                                 |
| Kysely        | Type-safe SQL builder, lightweight                     | No migrations, no auto-generated types from schema                                                      |
| TypeORM       | Mature, decorator-based                                | Heavy, less type-safe than Prisma, declining ecosystem                                                  |
| Raw SQL (pg)  | Maximum control, no overhead                           | No type safety, manual migrations                                                                       |

**Decision: Prisma (with Prisma Accelerate for serverless)**

- Schema-first design with auto-generated TypeScript types ensures compile-time safety for financial data
- Prisma Migrate handles schema evolution (adding new transaction types, bond fields, etc.)
- Prisma Accelerate provides connection pooling and caching for serverless environments
- If edge performance becomes critical, Drizzle is the escape hatch (compatible migration path)

---

### Authentication

| Option                          | Pros                                                          | Cons                                      |
| ------------------------------- | ------------------------------------------------------------- | ----------------------------------------- |
| **NextAuth.js (Auth.js v5)** ✅ | Native Next.js integration, many providers, open source, free | Self-hosted, requires session storage     |
| Clerk                           | Excellent DX, pre-built UI, generous free tier (10K MAU)      | Vendor lock-in, paid beyond free tier     |
| Supabase Auth                   | Free with Supabase, good OAuth support                        | Tied to Supabase ecosystem                |
| Auth0                           | Enterprise-grade, extensive features                          | Expensive beyond free tier (7K MAU limit) |
| Lucia                           | Lightweight, flexible, no vendor lock-in                      | More manual setup, smaller community      |
| Firebase Auth                   | Google-backed, generous free tier                             | Vendor lock-in to Google ecosystem        |

**Decision: NextAuth.js (Auth.js v5)**

- Zero cost at any scale (self-hosted, open source)
- Native Next.js App Router integration with middleware-based route protection
- Supports OAuth providers (Google, GitHub) + email/password + magic links
- Session stored in database (PostgreSQL) — no external service dependency
- Scales identically on Vercel, Azure, or any Node.js host
- API token management (for public API) built on top of NextAuth sessions

---

### Market Data APIs

| Option                          | Pros                                                           | Cons                                   |
| ------------------------------- | -------------------------------------------------------------- | -------------------------------------- |
| **Yahoo Finance (yfinance)** ✅ | Free, comprehensive global coverage, real-time delayed         | Unofficial API, may break, rate limits |
| **Alpha Vantage** ✅            | Official API, free tier (25 req/day premium, 500/day with key) | Limited free tier, slower for bulk     |
| Twelve Data                     | Official, good coverage, 800 req/day free                      | Paid for real-time                     |
| Polygon.io                      | Professional-grade, extensive US coverage                      | Paid only ($29+/mo)                    |
| IEX Cloud                       | Good US data, tiered pricing                                   | US-focused, limited international      |
| Open Exchange Rates             | 1000 req/mo free, 194 currencies                               | FX only, no equities                   |
| EOD Historical Data             | Global coverage, affordable                                    | Less community support                 |

**Decision: Yahoo Finance (primary) + Alpha Vantage (supplementary) + Open Exchange Rates (FX)**

- Yahoo Finance provides broad global coverage for daily prices (60+ exchanges) at zero cost
- Alpha Vantage fills gaps and provides fundamental data
- Open Exchange Rates for reliable FX conversions (free tier sufficient for daily rates)
- Abstracted behind a DataProvider interface — swap providers without changing business logic
- Caching layer (DB + in-memory) reduces API calls: prices only fetched once per day per instrument

---

### AI Services (AI Importer)

| Option                                        | Pros                                                                                                                               | Cons                                                 |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Google Gemini (Antigravity SDK)** ✅        | Multimodal ingestion (PDFs, images, documents), agent loop with tool orchestration, MCP support, generous free tier, Python-native | Python-only SDK, newer ecosystem                     |
| **Google Gemini (Vercel AI SDK)** ✅ fallback | TypeScript-native, works in Next.js API routes, unified provider interface, streaming                                              | Less agentic than Antigravity, no built-in tool loop |
| OpenAI (GPT-4o)                               | Strong document understanding, structured output                                                                                   | Cost per call, vendor lock-in, no free tier          |
| Anthropic (Claude)                            | Strong document analysis, large context                                                                                            | Similar cost profile to OpenAI                       |
| Local models (Ollama)                         | Free, private                                                                                                                      | Requires GPU, less accurate                          |

**Decision: Google Gemini — via Antigravity SDK (primary) + Vercel AI SDK (fallback)**

**Primary path — Antigravity SDK (Python serverless function):**

- `pip install google-antigravity` — same agent loop and multimodal pipeline that powers Google Antigravity
- Native support for file attachments: images, PDFs, screenshots, documents with automatic MIME detection
- Agent orchestration handles multi-step extraction (read document → identify trades → validate → structure)
- Runs in the Python analytics functions (already deployed for optimisation/backtesting)
- MCP integration enables connecting to external data sources for instrument resolution
- Free tier (Gemini API via Google AI Studio) sufficient for development; scales to Vertex AI for production

**Fallback path — Vercel AI SDK (TypeScript):**

- `npm install ai @ai-sdk/google` — Google Gemini provider for the Vercel AI SDK
- Used when the Python function is unavailable or for lightweight extraction (simple CSV validation, field suggestions)
- Runs directly in Next.js API routes — no cold start penalty
- Streaming responses for real-time user feedback during import
- Provider-swappable: can point to OpenAI, Anthropic, or any supported model without code changes

**Why Gemini over OpenAI:**

- Generous free tier (Gemini API: 1500 req/day for Flash, 50 req/day for Pro) vs OpenAI (paid only)
- Gemini 2.5 Flash/Pro vision quality now matches GPT-4o for document extraction
- Google AI Studio API key works identically on Vercel and Azure (no platform-specific service needed)
- Antigravity SDK's agentic loop handles complex multi-page documents autonomously
- Vertex AI available as enterprise scale path (same models, Google Cloud compliance)

**Graceful degradation:** AI Importer is always optional; standard CSV import with manual field mapping works without any AI service.

---

### Object Storage / Caching

| Option                              | Pros                                              | Cons                                      |
| ----------------------------------- | ------------------------------------------------- | ----------------------------------------- |
| **Vercel KV (Redis)** ✅ initial    | Serverless Redis, simple, free tier               | Limited storage on free tier              |
| **Azure Blob Storage** (scale path) | Unlimited, cheap, Azure-native                    | Not serverless-friendly for small objects |
| Upstash Redis                       | Serverless Redis, generous free tier, global      | Per-request pricing adds up               |
| Cloudflare R2                       | S3-compatible, no egress fees, generous free tier | Requires Cloudflare ecosystem             |

**Decision: Vercel KV initially → Azure Blob Storage at scale**

Used for:

- Caching analytics results (optimisation outputs, backtest results)
- Storing exported report PDFs
- Job queue state for async analytics
- Rate limit counters for public API

---

### Deployment Platform

| Platform                          | Free Tier                                         | Python Support                  | Scaling Path            | Cold Start       |
| --------------------------------- | ------------------------------------------------- | ------------------------------- | ----------------------- | ---------------- |
| **Vercel** ✅ initial             | Generous (100 GB bandwidth, serverless functions) | Yes (Python runtime)            | Vercel Pro → Enterprise | 1–5s             |
| Netlify                           | Good (100 GB bandwidth, serverless functions)     | Limited (AWS Lambda under hood) | Netlify Pro             | 1–5s             |
| Cloudflare Pages + Workers        | Very generous (unlimited bandwidth)               | No native Python (Pyodide only) | Workers Paid            | <1ms (JS only)   |
| Azure Static Web Apps + Functions | Free tier for static + 1M function executions/mo  | Yes (Python in Azure Functions) | Azure App Service / AKS | 2–10s            |
| Railway                           | $5 free credit/mo, containers                     | Yes (any runtime)               | Scale vertically        | None (always-on) |
| Fly.io                            | 3 VMs free, containers                            | Yes (any runtime)               | Scale horizontally      | None (always-on) |

**Decision: Vercel (initial) → Azure (production scale)**

**Phase 1 — Development & MVP (Vercel Free/Pro):**

- Next.js deploys natively with zero configuration
- Python serverless functions supported (Vercel Python Runtime)
- Automatic preview deployments for PRs
- Edge middleware for auth checks and rate limiting
- Free tier sufficient for development and small user base
- Constraint: 10s function timeout (free), 60s (Pro) — analytics functions must respect this

**Phase 2 — Growth (Azure):**

- **Azure Static Web Apps** for frontend (global CDN, free SSL, custom domains)
- **Azure Functions (Python)** for analytics engine (5-min timeout, larger memory, Premium plan for pre-warming)
- **Azure Database for PostgreSQL Flexible Server** (managed, auto-scale)
- **Azure Blob Storage** for file uploads, exports, result cache
- **Google Vertex AI** for AI Importer at scale (same Gemini models, Google Cloud compliance/SLA)
- **Azure Front Door** for global load balancing and WAF

**Why Vercel first:**

- Fastest path from code to production for Next.js
- Python runtime works for functions <50 MB and <60s
- Free tier covers development and early users
- No infrastructure management

**Why Azure for scale:**

- Azure Functions Consumption plan: 1M free executions/month, 5-min timeout
- Azure Functions Premium: pre-warmed instances eliminate cold starts
- Can run full skfolio with all dependencies (no 50 MB bundle limit)
- Azure Container Apps for workloads that outgrow serverless (batch backtests, large-scale Monte Carlo)
- Enterprise compliance (SOC 2, ISO 27001) for financial data

---

## Deployment Architecture

### Phase 1: Vercel

```
                    ┌─────────────────────┐
                    │   Vercel Edge CDN    │
                    └──────────┬──────────┘
                               │
              ┌────────────────┴────────────────┐
              │        Vercel Functions          │
              │                                  │
              │  ┌──────────┐  ┌──────────────┐ │
              │  │ Node.js  │  │   Python     │ │
              │  │ (API +   │  │ (Analytics)  │ │
              │  │  SSR)    │  │              │ │
              │  └────┬─────┘  └──────┬───────┘ │
              └───────┼───────────────┼─────────┘
                      │               │
               ┌──────┴──────┐  ┌─────┴─────┐
               │  Neon DB    │  │ Vercel KV  │
               │ (Postgres)  │  │  (Cache)   │
               └─────────────┘  └───────────┘
```

### Phase 2: Azure

```
                    ┌─────────────────────┐
                    │  Azure Front Door    │
                    │  (CDN + WAF)         │
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                      │
┌────────┴────────┐  ┌────────┴────────┐  ┌─────────┴─────────┐
│ Azure Static    │  │ Azure Functions  │  │ Azure Functions    │
│ Web Apps        │  │ (Node.js)        │  │ (Python - Premium) │
│ (Frontend)      │  │ Core API         │  │ Analytics Engine   │
└─────────────────┘  └────────┬─────────┘  └─────────┬─────────┘
                              │                       │
                     ┌────────┴────────┐     ┌────────┴────────┐
                     │ Azure Database  │     │  Azure Blob     │
                     │ for PostgreSQL  │     │  Storage        │
                     └─────────────────┘     └─────────────────┘
                              │
                     ┌────────┴────────┐
                     │ Google Vertex  │
                     │ AI (Gemini)    │
                     └─────────────────┘
```

---

## Key Design Decisions Summary

| Decision                                  | Rationale                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Dual-runtime (TypeScript + Python)        | TypeScript for web app logic; Python for scientific computing (no JS equivalent of skfolio/scipy) |
| Serverless-first                          | Zero infrastructure management, pay-per-use, auto-scale, free tier viable                         |
| Function decomposition                    | Keep each Python function <30 MB, <10s — fits free tier limits                                    |
| Async job pattern for heavy analytics     | Avoids gateway timeouts; client submits job, polls for result                                     |
| PostgreSQL (not NoSQL)                    | Financial data is inherently relational; ACID required for transactions and CGT calculations      |
| Source-agnostic import                    | Pluggable connectors; no vendor dependency; works fully without any third-party service           |
| Provider interfaces for external services | DataProvider, AIProvider, AuthProvider — swap implementations without changing business logic     |
| Progressive deployment                    | Start on Vercel free → migrate to Azure for enterprise scale, without application rewrite         |
| Result caching                            | Analytics results cached by (portfolio_hash, params, date) — avoid redundant computation          |

---

## Security Architecture

| Layer                    | Measure                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------ |
| Authentication           | NextAuth.js with secure session cookies (HttpOnly, SameSite, Secure)                 |
| API tokens               | Hashed in database (bcrypt), scoped permissions, optional expiry                     |
| Data at rest             | PostgreSQL encryption (Neon/Azure), encrypted blob storage                           |
| Data in transit          | TLS everywhere (enforced by deployment platform)                                     |
| Input validation         | Zod schemas on all API routes; parameterised queries via Prisma (no SQL injection)   |
| Rate limiting            | Per-user and per-IP limits on API; analytics functions rate-limited to prevent abuse |
| Secrets management       | Environment variables via platform (Vercel/Azure Key Vault); never in code           |
| CORS                     | Strict origin allowlist for API endpoints                                            |
| CSP                      | Content Security Policy headers via Next.js middleware                               |
| Financial data isolation | Row-level security — users can only access their own portfolios                      |

---

## Performance Considerations

| Concern                           | Strategy                                                               |
| --------------------------------- | ---------------------------------------------------------------------- |
| Dashboard load time               | React Server Components for data-heavy pages; stream expensive queries |
| Report generation                 | Pre-compute on data change (event-driven), serve from cache            |
| Price data freshness              | Background cron fetches daily prices; cache in DB with TTL             |
| Analytics cold starts             | Keep functions warm via cron ping; use async pattern for long jobs     |
| Large portfolios (1000+ holdings) | Paginate, virtual scroll; batch analytics into chunks                  |
| Multi-currency conversion         | Cache FX rates daily; batch convert on import, not per-request         |
| Bundle size                       | Dynamic imports for analytics UI; route-level code splitting           |

---

## Related Documentation

| Document                                 | Description                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| [GETTING-STARTED.md](GETTING-STARTED.md) | User onboarding and portfolio setup                                             |
| [DATA_IMPORT.md](DATA_IMPORT.md)         | Import pipeline, CSV mapping, and connector architecture                        |
| [SHARESIGHT_API.md](SHARESIGHT_API.md)   | Optional Sharesight API integration                                             |
| [TOOLS.md](TOOLS.md)                     | Reports and analysis tools                                                      |
| [ASSETS.md](ASSETS.md)                   | Supported asset types and exchanges                                             |
| [ACCOUNT.md](ACCOUNT.md)                 | Account, portfolio management, and sharing                                      |
| [ACCOUNTS.md](ACCOUNTS.md)               | Bank & cash accounts, statement import, categories, linking, reconciliation     |
| [TAX.md](TAX.md)                         | Australian tax reporting                                                        |
| [ACTIONS.md](ACTIONS.md)                 | Corporate actions handling                                                      |
| [API.md](API.md)                         | Public REST API reference                                                       |
| [ADVANCED.md](ADVANCED.md)               | Advanced analytics (optimisation, Monte Carlo, factor analysis, stress testing) |
