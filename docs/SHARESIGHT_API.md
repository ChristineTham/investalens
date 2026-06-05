# Sharesight API Integration

> **Note:** Sharesight is one of many supported import sources. InvestaLens does not depend on Sharesight. See [DATA_IMPORT.md](DATA_IMPORT.md) for the full data import architecture.

## Overview

For users who have a Sharesight account, InvestaLens can optionally import portfolio data via the [Sharesight API](https://api.sharesight.com/doc/). Sharesight provides OAuth2 authentication and REST endpoints for accessing portfolios, holdings, trades, and performance data.

## Authentication

Sharesight uses OAuth2 Authorization Code flow:

1. User clicks "Connect Sharesight" in InvestaLens
2. Redirect to Sharesight authorisation page
3. User grants access
4. Sharesight redirects back with authorisation code
5. Exchange code for access/refresh tokens
6. Store tokens securely for ongoing sync

## Key API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /portfolios` | List all portfolios |
| `GET /portfolios/:id` | Portfolio details |
| `GET /portfolios/:id/holdings` | Current holdings |
| `GET /portfolios/:id/trades` | Transaction history |
| `GET /portfolios/:id/performance` | Performance summary |
| `GET /portfolios/:id/diversity` | Asset allocation |

## Data Mapping

### Sharesight → InvestaLens

| Sharesight | InvestaLens |
|-----------|-------------|
| Portfolio | Portfolio |
| Holding | Position |
| Trade | Transaction |
| Instrument | Security |
| Payout | Distribution |

## Rate Limits

- Respect Sharesight API rate limits (currently 300 requests/5 minutes)
- Implement exponential backoff on 429 responses
- Use incremental sync (only fetch changes since last sync)

## Sync Strategy

1. **Initial import**: Full fetch of all portfolios, holdings, and trades
2. **Incremental sync**: Poll for changes periodically (configurable interval)
3. **Manual refresh**: User-triggered full resync option

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [DATA_IMPORT.md](DATA_IMPORT.md) | Full import architecture and all supported sources |
| [GETTING-STARTED.md](GETTING-STARTED.md) | How to connect Sharesight during onboarding |
