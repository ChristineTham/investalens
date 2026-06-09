# R1 Overview: MVP (Australian Market)

## Scope

A fully functional portfolio tracker for Australian investors, deployable free on Vercel.

### In Scope

- **Authentication** — Email/password + Google OAuth via NextAuth.js
- **Portfolio management** — Create, configure, share portfolios; custom groups; labels
- **Manual entry** — Add/edit/delete transactions (BUY, SELL, DIVIDEND, INTEREST, COUPON, MATURITY, SPLIT, FEE, TRANSFER_IN/OUT, RETURN_OF_CAPITAL, ADJUSTMENT, MERGER_IN/OUT, RIGHTS_ISSUE, BONUS)
- **CSV import** — Full field mapping, validation, deduplication, broker templates (CommSec, SelfWealth, Stake, CMC Markets, CMC Invest, Bell Direct, nabtrade, FIIG)
- **Market data** — ASX daily prices via Yahoo Finance, price caching
- **Performance calculation** — Money-weighted returns, annualised returns
- **Reports** — Performance, Contribution Analysis, Multi-Period, Sold Securities, Future Income, Calendar, Diversity, Drawdown Risk, Historical Cost, All Trades
- **Tax** — Taxable Income Report, CGT Report (with discount, parcel tracking, sale allocation methods), Unrealised CGT, AMIT schema support (full AMIT processing deferred to post-MVP)
- **Corporate actions** — Automated (splits, consolidations, bonus, return of capital) + manual recording (mergers, demergers, IPOs, rights)
- **Bonds/Fixed income** — Bond tracking, coupon calendar, maturity alerts, FIIG import
- **Cash accounts** — Cash tracking alongside investments
- **DRP** — Dividend reinvestment recording
- **Watchlist** — Track potential investments with price alerts
- **Data export** — CSV (trades, holdings, dividends), JSON backup
- **Public REST API** — Full CRUD, Bearer token auth, rate limiting
- **Consolidated view** — Across multiple portfolios
- **Dashboard** — Summary view with key metrics

### Out of Scope (deferred)

- International markets (R3)
- Advanced analytics — optimisation, Monte Carlo, backtesting, factor analysis (R2)
- AI Importer (R2)
- FIRE Calculator, Market Sentiment, X-ray (R2)
- Net worth & liabilities (R4)
- Emergency fund (R4)
- Webhooks (R4)
- Automated backups (R4)
- PDF export (R4)
- Sharesight API integration (R4)

## Technical Constraints

- Must deploy on Vercel free tier (Hobby plan)
- Database: Neon free tier (0.5 GB, 190 compute hours)
- No Python functions needed (all R1 logic is TypeScript)
- Must work without any paid API keys (Yahoo Finance is free)

## P1 Subphase Breakdown

| Subphase | Focus                                                           | Estimated Files |
| -------- | --------------------------------------------------------------- | --------------- |
| P1a      | Database schema, auth, portfolio/transaction CRUD, UI shell     | ~40 files       |
| P1b      | CSV import engine, market data fetching, price caching          | ~25 files       |
| P1c      | Performance calculations, all reports, tax reporting            | ~35 files       |
| P1d      | Corporate actions, bonds, groups/labels, API, export, watchlist | ~30 files       |
