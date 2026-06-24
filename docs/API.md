# InvestaLens Public API

> **📖 Part of the [InvestaLens User Manual](../USER-MANUAL.md)** | Previous: [Advanced Analytics](ADVANCED.md)

> **Implementation Status**
>
> | Feature                                  | Status                    |
> | ---------------------------------------- | ------------------------- |
> | Bearer token authentication              | ✅ Implemented            |
> | Rate limiting (100 req/min)              | ✅ Implemented            |
> | Token scope checking (read/write/admin)  | ✅ Implemented            |
> | JSON response format                     | ✅ Implemented            |
> | GET/POST /api/v1/portfolios              | ✅ Implemented            |
> | GET/PATCH/DELETE /api/v1/portfolios/[id] | ✅ Implemented            |
> | Holdings endpoints                       | ✅ Implemented            |
> | Transactions endpoints                   | ✅ Implemented            |
> | Performance & diversity endpoints        | ✅ Implemented            |
> | Import / Export endpoints                | ✅ Implemented            |
> | GET /api/v1/market/search                | ✅ Implemented            |
> | Market quote endpoint                    | ✅ Implemented            |
> | Token management (endpoints + UI)        | ✅ Implemented            |
> | AI import / chat endpoints               | ✅ Implemented            |
> | Watchlist endpoints                      | ⏳ To be Implemented      |
> | Webhooks                                 | ⏳ To be Implemented (R4) |
> | SDKs                                     | ⏳ To be Implemented      |

## Overview

InvestaLens provides a RESTful API for programmatic access to your portfolio data. The API allows you to integrate InvestaLens with external tools, build custom dashboards, automate imports, and access your data from any application.

**Jump to:**

- [Authentication](#authentication)
- [Base URL](#base-url)
- [Rate Limits](#rate-limits)
- [Core Endpoints](#core-endpoints)
- [Portfolio Endpoints](#portfolio-endpoints)
- [Holdings Endpoints](#holdings-endpoints)
- [Transactions Endpoints](#transactions-endpoints)
- [Reports Endpoints](#reports-endpoints)
- [Import/Export Endpoints](#importexport-endpoints)
- [Watchlist Endpoints](#watchlist-endpoints)
- [Market Data Endpoints](#market-data-endpoints)
- [Webhooks](#webhooks)
- [Error Handling](#error-handling)
- [SDKs and Examples](#sdks-and-examples)

---

## Authentication

InvestaLens uses Bearer Token authentication for all API requests.

### Obtaining a Token

1. Navigate to **Account > API Access**
2. Click **Generate API Token**
3. Copy and securely store the token (it will not be shown again)
4. Optionally set an expiry date and permission scope

### Using the Token

Include the token in the `Authorization` header of every request:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Token Scopes

| Scope   | Permissions                                                    |
| ------- | -------------------------------------------------------------- |
| `read`  | View portfolios, holdings, transactions, and reports           |
| `write` | Create/update transactions, holdings, and settings             |
| `admin` | Full access including delete operations and API key management |

### Revoking Tokens

Navigate to **Account > API Access** to view active tokens. Click **Revoke** to immediately invalidate a token.

---

## Base URL

```
https://api.investalens.app/v1
```

For self-hosted instances:

```
https://your-domain.com/api/v1
```

---

## Rate Limits

| Plan     | Requests per Minute | Daily Limit |
| -------- | ------------------: | ----------: |
| Free     |                  60 |       1,000 |
| Standard |                 300 |      10,000 |
| Premium  |               1,000 |     100,000 |

Rate limit headers are included in every response:

```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 297
X-RateLimit-Reset: 1717603200
```

When rate limited, the API returns `429 Too Many Requests`. Implement exponential backoff on retries.

---

## Core Endpoints

### Health Check

```
GET /health
```

No authentication required.

**Response:**

```json
{
  "status": "OK",
  "version": "1.0.0",
  "timestamp": "2026-06-05T10:00:00.000Z"
}
```

### Current User

```
GET /me
```

Returns the authenticated user's profile and settings.

**Response:**

```json
{
  "id": "usr_abc123",
  "email": "user@example.com",
  "settings": {
    "baseCurrency": "AUD",
    "locale": "en-AU",
    "dateFormat": "dd/MM/yyyy"
  }
}
```

---

## Portfolio Endpoints

### List Portfolios

```
GET /portfolios
```

**Response:**

```json
{
  "portfolios": [
    {
      "id": "pf_001",
      "name": "Personal Investments",
      "taxResidency": "AU",
      "baseCurrency": "AUD",
      "taxEntityType": "individual",
      "createdAt": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

### Get Portfolio

```
GET /portfolios/:id
```

Returns portfolio details including summary statistics.

### Get Portfolio Performance

```
GET /portfolios/:id/performance?period=1Y
```

**Query parameters:**

| Parameter   | Type     | Description                                                  |
| ----------- | -------- | ------------------------------------------------------------ |
| `period`    | string   | `1D`, `1W`, `1M`, `3M`, `6M`, `YTD`, `1Y`, `3Y`, `5Y`, `MAX` |
| `startDate` | ISO date | Custom start date (overrides period)                         |
| `endDate`   | ISO date | Custom end date (defaults to today)                          |
| `benchmark` | string   | Ticker to benchmark against (e.g. `VAS.ASX`)                 |

**Response:**

```json
{
  "portfolioId": "pf_001",
  "period": "1Y",
  "totalReturn": 12.45,
  "capitalGain": 8.2,
  "dividendIncome": 4.25,
  "currencyGain": 0.0,
  "annualisedReturn": 12.45,
  "startValue": 100000.0,
  "endValue": 112450.0
}
```

### Get Portfolio Allocation

```
GET /portfolios/:id/allocation?groupBy=sector
```

**Query parameters:**

| Parameter | Type     | Description                                                                   |
| --------- | -------- | ----------------------------------------------------------------------------- |
| `groupBy` | string   | `market`, `currency`, `sector`, `industry`, `country`, `type`, `custom_group` |
| `date`    | ISO date | Point-in-time allocation (defaults to today)                                  |

---

## Holdings Endpoints

### List Holdings

```
GET /portfolios/:id/holdings
```

**Query parameters:**

| Parameter | Type   | Description                               |
| --------- | ------ | ----------------------------------------- |
| `status`  | string | `open`, `closed`, `all` (default: `open`) |
| `label`   | string | Filter by label name                      |

**Response:**

```json
{
  "holdings": [
    {
      "id": "hld_001",
      "instrumentCode": "VAS",
      "marketCode": "ASX",
      "name": "Vanguard Australian Shares Index ETF",
      "quantity": 500,
      "averageCost": 85.5,
      "costBase": 42750.0,
      "marketValue": 47250.0,
      "unrealisedGain": 4500.0,
      "unrealisedGainPct": 10.53,
      "lastPrice": 94.5,
      "lastPriceDate": "2026-06-05",
      "currency": "AUD"
    }
  ]
}
```

### Get Holding Detail

```
GET /portfolios/:id/holdings/:holdingId
```

Returns full holding detail including trade history, dividends, and corporate actions.

---

## Transactions Endpoints

### List Transactions

```
GET /portfolios/:id/transactions
```

**Query parameters:**

| Parameter    | Type     | Description                                                                 |
| ------------ | -------- | --------------------------------------------------------------------------- |
| `startDate`  | ISO date | Filter from date                                                            |
| `endDate`    | ISO date | Filter to date                                                              |
| `type`       | string   | Filter by type: `BUY`, `SELL`, `DIVIDEND`, `SPLIT`, `FEE`, `INTEREST`, etc. |
| `instrument` | string   | Filter by instrument code                                                   |
| `limit`      | number   | Page size (default: 100, max: 1000)                                         |
| `offset`     | number   | Pagination offset                                                           |

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
  "currency": "AUD",
  "comment": "Monthly DCA"
}
```

**Response:** `201 Created` with the created transaction object.

### Bulk Import Transactions

```
POST /portfolios/:id/transactions/import
```

**Request body:**

```json
{
  "activities": [
    {
      "date": "2026-06-01",
      "type": "BUY",
      "instrumentCode": "MSFT",
      "marketCode": "NASDAQ",
      "quantity": 5,
      "price": 450.0,
      "brokerage": 0,
      "currency": "USD"
    }
  ],
  "deduplication": true
}
```

**Response:** `201 Created` with import summary (imported count, skipped duplicates, errors).

### Delete Transaction

```
DELETE /portfolios/:id/transactions/:transactionId
```

**Response:** `204 No Content`

---

## Reports Endpoints

### Generate Report

```
GET /portfolios/:id/reports/:reportType
```

**Report types:** `performance`, `diversity`, `cgt`, `taxable-income`, `unrealised-cgt`, `sold-securities`, `future-income`, `historical-cost`, `all-trades`, `contribution`, `exposure`, `drawdown`, `multi-period`

**Common query parameters:**

| Parameter   | Type     | Description                    |
| ----------- | -------- | ------------------------------ |
| `startDate` | ISO date | Report start date              |
| `endDate`   | ISO date | Report end date                |
| `groupBy`   | string   | Grouping option                |
| `format`    | string   | `json` (default), `csv`, `pdf` |

**Example:**

```
GET /portfolios/pf_001/reports/cgt?startDate=2025-07-01&endDate=2026-06-30&format=json
```

---

## Import/Export Endpoints

### Export Portfolio Data

```
GET /portfolios/:id/export?format=json
```

**Query parameters:**

| Parameter   | Type     | Description                              |
| ----------- | -------- | ---------------------------------------- |
| `format`    | string   | `json`, `csv`                            |
| `scope`     | string   | `all`, `trades`, `holdings`, `dividends` |
| `startDate` | ISO date | Filter from date (for trades/dividends)  |

### Import from File

```
POST /portfolios/:id/import/csv
Content-Type: multipart/form-data
```

Upload a CSV file with a field mapping configuration. Returns a preview of parsed transactions for confirmation.

---

## Watchlist Endpoints

### List Watchlists

```
GET /watchlists
```

### Get Watchlist

```
GET /watchlists/:id
```

### Add to Watchlist

```
POST /watchlists/:id/items
```

**Request body:**

```json
{
  "instrumentCode": "NVDA",
  "marketCode": "NASDAQ",
  "notes": "AI growth play, wait for pullback",
  "priceAlert": {
    "below": 120.0,
    "above": 150.0
  }
}
```

### Remove from Watchlist

```
DELETE /watchlists/:id/items/:itemId
```

---

## Market Data Endpoints

### Get Security Price

```
GET /market/securities/:code?market=ASX
```

**Response:**

```json
{
  "instrumentCode": "VAS",
  "marketCode": "ASX",
  "name": "Vanguard Australian Shares Index ETF",
  "price": 94.5,
  "change": 0.75,
  "changePct": 0.8,
  "lastUpdated": "2026-06-05T16:00:00+10:00",
  "currency": "AUD"
}
```

### Search Securities

```
GET /market/search?q=vanguard&market=ASX
```

### Get Market Sentiment

```
GET /market/sentiment
```

Returns current Fear & Greed Index, VIX, and other sentiment indicators (see [TOOLS.md](TOOLS.md#market-sentiment-indicators)).

---

## Webhooks

Register webhooks to receive real-time notifications when events occur in your portfolio.

### Supported Events

| Event                       | Trigger                                         |
| --------------------------- | ----------------------------------------------- |
| `transaction.created`       | New transaction added (manual, import, or sync) |
| `dividend.received`         | Dividend or distribution confirmed              |
| `price.alert`               | Watchlist price alert triggered                 |
| `corporate_action.detected` | Corporate action applied to a holding           |
| `report.ready`              | Async report generation completed               |

### Registering a Webhook

```
POST /webhooks
```

**Request body:**

```json
{
  "url": "https://your-app.com/webhooks/investalens",
  "events": ["dividend.received", "price.alert"],
  "secret": "your-signing-secret"
}
```

### Webhook Payload

All webhook payloads include:

```json
{
  "event": "dividend.received",
  "timestamp": "2026-06-05T10:00:00.000Z",
  "data": { ... }
}
```

Payloads are signed with HMAC-SHA256 using your secret. Verify the `X-InvestaLens-Signature` header.

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Quantity must be a positive number",
    "details": [{ "field": "quantity", "issue": "must be > 0" }]
  }
}
```

### HTTP Status Codes

| Code | Meaning                                 |
| ---- | --------------------------------------- |
| 200  | Success                                 |
| 201  | Created                                 |
| 204  | No Content (successful delete)          |
| 400  | Bad Request — validation error          |
| 401  | Unauthorised — missing or invalid token |
| 403  | Forbidden — insufficient scope          |
| 404  | Not Found                               |
| 409  | Conflict — duplicate transaction        |
| 429  | Rate Limited                            |
| 500  | Internal Server Error                   |

---

## SDKs and Examples

### cURL Example

```bash
# List all portfolios
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.investalens.app/v1/portfolios

# Create a buy trade
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-06-05","type":"BUY","instrumentCode":"VAS","marketCode":"ASX","quantity":50,"price":94.50,"brokerage":9.50,"currency":"AUD"}' \
  https://api.investalens.app/v1/portfolios/pf_001/transactions
```

### TypeScript/JavaScript

```typescript
const response = await fetch("https://api.investalens.app/v1/portfolios", {
  headers: { Authorization: `Bearer ${token}` },
});
const { portfolios } = await response.json();
```

### Python

```python
import requests

headers = {"Authorization": f"Bearer {token}"}
response = requests.get("https://api.investalens.app/v1/portfolios", headers=headers)
portfolios = response.json()["portfolios"]
```

---

## Related Documentation

| Document                               | Description                                             |
| -------------------------------------- | ------------------------------------------------------- |
| [DATA_IMPORT.md](DATA_IMPORT.md)       | Import architecture, CSV field mapping, and data export |
| [ARCHITECTURE.md](ARCHITECTURE.md)     | System architecture and design decisions                |
| [TOOLS.md](TOOLS.md)                   | Reports available via API                               |
| [SHARESIGHT_API.md](SHARESIGHT_API.md) | Sharesight API as an import source                      |
