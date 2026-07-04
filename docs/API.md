# InvestaLens Public API

> **📖 Part of the [InvestaLens User Manual](../USER-MANUAL.md)** | Previous: [Advanced Analytics](ADVANCED.md)

> **Implementation Status**
>
> | Feature                                  | Status                    |
> | ---------------------------------------- | ------------------------- |
> | Bearer token authentication              | ✅ Implemented            |
> | Rate limiting (100 req/min, enforced)    | ✅ Implemented            |
> | Token scope checking (read/write/admin)  | ✅ Implemented            |
> | JSON response format ({data, meta})      | ✅ Implemented            |
> | GET/POST /api/v1/portfolios              | ✅ Implemented            |
> | GET/PATCH/DELETE /api/v1/portfolios/[id] | ✅ Implemented            |
> | Holdings endpoints                       | ✅ Implemented            |
> | Transactions endpoints                   | ✅ Implemented            |
> | Performance & diversity endpoints        | ✅ Implemented            |
> | Import (with dedup) / Export endpoints   | ✅ Implemented            |
> | GET /api/v1/market/search                | ✅ Implemented            |
> | Market quote endpoint                    | ✅ Implemented            |
> | Token management (endpoints + UI)        | ✅ Implemented            |
> | AI import / chat endpoints (authenticated) | ✅ Implemented          |
> | Watchlist endpoints                      | ⏳ To be Implemented      |
> | Webhooks                                 | ⏳ To be Implemented (R4) |
> | SDKs                                     | ⏳ To be Implemented      |

## Overview

InvestaLens provides a RESTful API for programmatic access to your portfolio data. The API allows you to integrate InvestaLens with external tools, build custom dashboards, automate imports, and access your data from any application.

**Jump to:**

- [Authentication](#authentication)
- [Base URL](#base-url)
- [Rate Limits](#rate-limits)
- [Response Format](#response-format)
- [Portfolio Endpoints](#portfolio-endpoints)
- [Holdings Endpoints](#holdings-endpoints)
- [Transactions Endpoints](#transactions-endpoints)
- [Import/Export Endpoints](#importexport-endpoints)
- [Market Data Endpoints](#market-data-endpoints)
- [Token Management Endpoints](#token-management-endpoints)
- [AI Endpoints](#ai-endpoints)
- [Internal Endpoints (Session Auth)](#internal-endpoints-session-auth)
- [Error Handling](#error-handling)
- [Examples](#examples)

---

## Authentication

InvestaLens uses Bearer Token authentication for all public API requests.

### Obtaining a Token

1. Navigate to **Settings → API Tokens**
2. Create a token, choosing a permission scope and an optional expiry
3. Copy and securely store the token (it will not be shown again)

### Using the Token

Include the token in the `Authorization` header of every request:

```
Authorization: Bearer your-api-token-here
```

### Token Scopes

| Scope   | Permissions                                                    |
| ------- | -------------------------------------------------------------- |
| `read`  | View portfolios, holdings, transactions, and reports           |
| `write` | Create/update transactions, holdings, and portfolios           |
| `admin` | Full access including delete operations                        |

### Revoking Tokens

Navigate to **Settings → API Tokens** to view active tokens and revoke one to immediately invalidate it.

---

## Base URL

All endpoints live under `/api/v1` of your deployment:

```
https://your-domain.com/api/v1
```

For local development:

```
http://localhost:3000/api/v1
```

---

## Rate Limits

A flat limit of **100 requests per minute per token** is enforced. Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 97
X-RateLimit-Reset: 1717603200
```

When the limit is exceeded, the API returns `429 Too Many Requests`. Implement exponential backoff on retries.

---

## Response Format

Successful responses use a `{data, meta}` envelope:

```json
{
  "data": [ ... ],
  "meta": { "count": 2 }
}
```

Errors use an `{error}` envelope:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Portfolio not found"
  }
}
```

Successful `DELETE` requests return `200` with:

```json
{ "data": { "deleted": true } }
```

---

## Portfolio Endpoints

### List Portfolios

```
GET /portfolios
```

### Create Portfolio

```
POST /portfolios
```

### Get / Update / Delete Portfolio

```
GET /portfolios/:id
PATCH /portfolios/:id
DELETE /portfolios/:id
```

### Get Portfolio Performance

```
GET /portfolios/:id/performance?from=2025-07-01&to=2026-06-30
```

**Query parameters:**

| Parameter | Type     | Description                          |
| --------- | -------- | ------------------------------------ |
| `from`    | ISO date | Start date (optional)                |
| `to`      | ISO date | End date (optional, defaults today)  |

### Get Portfolio Diversity

```
GET /portfolios/:id/diversity
```

Returns the portfolio's allocation breakdown.

---

## Holdings Endpoints

### List Holdings

```
GET /portfolios/:id/holdings
```

### Create Holding

```
POST /portfolios/:id/holdings
```

### Get / Delete Holding

```
GET /portfolios/:id/holdings/:holdingId
DELETE /portfolios/:id/holdings/:holdingId
```

---

## Transactions Endpoints

### List Transactions

```
GET /portfolios/:id/transactions
```

**Query parameters:**

| Parameter   | Type   | Description                          |
| ----------- | ------ | ------------------------------------ |
| `holdingId` | string | Filter to a single holding           |
| `limit`     | number | Page size (default: 100, max: 500)   |
| `offset`    | number | Pagination offset                    |

### Create Transaction

```
POST /portfolios/:id/transactions
```

**Request body:**

```json
{
  "date": "2026-06-05",
  "type": "BUY",
  "instrumentCode": "VAS",
  "marketCode": "ASX",
  "quantity": 50,
  "price": 94.5,
  "brokerage": 9.5,
  "currency": "AUD"
}
```

### Get / Update / Delete Transaction

```
GET /portfolios/:id/transactions/:txId
PATCH /portfolios/:id/transactions/:txId
DELETE /portfolios/:id/transactions/:txId
```

---

## Import/Export Endpoints

### Export Portfolio Data

```
GET /portfolios/:id/export?format=json
```

**Query parameters:**

| Parameter | Type   | Description                     |
| --------- | ------ | -------------------------------- |
| `format`  | string | `json` (default) or `csv`        |

CSV exports escape and neutralise cell contents to prevent spreadsheet formula injection.

### Import Transactions

```
POST /portfolios/:id/import
Content-Type: application/json
```

**Request body:**

```json
{
  "csv": "Date,Code,Quantity,Price,Type\n2026-06-01,VAS,50,94.50,BUY",
  "config": {
    "dateFormat": "yyyy-MM-dd"
  }
}
```

The endpoint parses the CSV using the supplied mapping configuration and **deduplicates** against transactions already recorded, exactly like the UI importer — re-submitting the same file is safe.

---

## Market Data Endpoints

### Search Securities

```
GET /market/search?q=vanguard&market=ASX
```

### Get Quote

```
GET /market/quote/:code
```

Returns the latest price data for the instrument code.

---

## Token Management Endpoints

```
GET /auth/token      # list your tokens
POST /auth/token     # create a token (scope, optional expiry)
DELETE /auth/token   # revoke a token
```

Tokens can also be managed in the UI under **Settings → API Tokens**.

---

## AI Endpoints

Both AI endpoints **require authentication** — a bearer token or an active session:

```
POST /ai-import   # parse pasted document text into transactions (Gemini)
POST /chat        # portfolio Q&A chat assistant
```

These are rate-limited like all other endpoints. They require `GOOGLE_GENERATIVE_AI_API_KEY` to be configured on the deployment.

---

## Internal Endpoints (Session Auth)

The following endpoints exist under `/api/v1` but are **internal — session auth, not for token clients**. They power the app's own pages and may change without notice:

| Endpoint                                                | Purpose                              |
| ------------------------------------------------------- | ------------------------------------ |
| `GET /accounts/:id/detail`                               | Bank/cash account detail page data   |
| `GET /analytics/matrix`                                  | Returns matrix for analytics tools   |
| `GET /dashboard/detail`                                  | Dashboard page data                  |
| `GET /market/bond-rates`                                 | FIIG bond rate sheet data            |
| `POST /market/sync-prices`                               | Market data update (prices + info)   |
| `GET /models/:id/instruments/:instrumentId/detail`       | Model constituent detail page data   |
| `GET /portfolios/:id/detail`                             | Portfolio detail page data           |
| `GET /portfolios/:id/holdings/:holdingId/detail`         | Holding detail page data             |
| `GET /portfolios/performance`                            | Multi-portfolio performance series   |

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Quantity must be a positive number"
  }
}
```

### HTTP Status Codes

| Code | Meaning                                 |
| ---- | --------------------------------------- |
| 200  | Success (including successful deletes)  |
| 201  | Created                                 |
| 400  | Bad Request — validation error          |
| 401  | Unauthorised — missing or invalid token |
| 403  | Forbidden — insufficient scope          |
| 404  | Not Found                               |
| 429  | Rate Limited                            |
| 500  | Internal Server Error                   |

---

## Examples

### cURL

```bash
# List all portfolios
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-domain.com/api/v1/portfolios

# Create a buy trade
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-06-05","type":"BUY","instrumentCode":"VAS","marketCode":"ASX","quantity":50,"price":94.50,"brokerage":9.50,"currency":"AUD"}' \
  https://your-domain.com/api/v1/portfolios/pf_001/transactions
```

### TypeScript/JavaScript

```typescript
const response = await fetch("https://your-domain.com/api/v1/portfolios", {
  headers: { Authorization: `Bearer ${token}` },
});
const { data } = await response.json();
```

### Python

```python
import requests

headers = {"Authorization": f"Bearer {token}"}
response = requests.get("https://your-domain.com/api/v1/portfolios", headers=headers)
portfolios = response.json()["data"]
```

> **⏳ Planned:** watchlist endpoints, webhooks (R4), and official SDKs. See [GAPS.md](GAPS.md).

---

## Related Documentation

| Document                               | Description                                             |
| -------------------------------------- | ------------------------------------------------------- |
| [DATA_IMPORT.md](DATA_IMPORT.md)       | Import architecture, CSV field mapping, and data export |
| [ARCHITECTURE.md](ARCHITECTURE.md)     | System architecture and design decisions                |
| [TOOLS.md](TOOLS.md)                   | Reports available in the app                            |
| [SHARESIGHT_API.md](SHARESIGHT_API.md) | Sharesight API as an import source                      |
