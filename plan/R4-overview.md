# R4 Overview: Enrichment & Platform Maturity

## Objective

Add net worth tracking, platform polish features, integrations, export enhancements, and performance optimisations.

## Prerequisites

- R1 + R2 + R3 complete
- Reference: `docs/ACCOUNT.md`, `docs/API.md`, `DESIGN.md`

---

## Scope

### In Scope (R4)
- Net worth dashboard (liabilities, property, super, non-investment assets)
- Emergency fund tracker
- Automated data backups (to cloud storage)
- Webhooks (notify on events)
- PDF report export
- Sharesight API integration (import from Sharesight)
- DRP automation enhancements (auto-detect from dividends)
- Performance optimisations (caching, pre-computation, lazy loading)
- Consolidated portfolio view enhancements
- Notification system (email alerts for price targets, maturities, dividends)
- Mobile-responsive UI polish
- Dark mode
- Data import from other tools (Yahoo Finance portfolio, Google Finance)
- Audit log (track all changes)

### Out of Scope (Future)
- Native mobile app
- Real-time streaming prices
- Social features / sharing
- Broker API auto-trading
- Multi-tenant / white-label

---

## Subphase Breakdown

| Phase | Focus | Files |
|-------|-------|-------|
| R4-P1 | All R4 features (single coding phase) | `plan/R4-P1.md` |
| R4-P2 | Validation in Codespaces | `plan/R4-P2.md` |

---

## Architecture Impact

- **Net Worth**: New models (Asset, Liability) separate from portfolio system
- **Webhooks**: Event-driven with queue (use database-backed queue or Vercel Runtime Cache)
- **PDF Export**: Server-side rendering using react-pdf or puppeteer
- **Audit Log**: New AuditEntry model, middleware to capture all mutations
- **Notifications**: Email via Resend (free tier: 100 emails/day) or SendGrid
