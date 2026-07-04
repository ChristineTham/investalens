# InvestaLens — Unimplemented Features & Gaps

> **📖 Part of the [InvestaLens User Manual](../USER-MANUAL.md)**

This document is a single, living index of every feature that is **documented but not yet
fully implemented**, plus features that are **partially implemented**. It is compiled from a
full sweep of the docs and is intended as a roadmap reference — nothing here is deleted from
the feature docs; each item is flagged in place and gathered here for visibility.

## Legend

| Marker | Meaning |
| ------ | ------- |
| ⏳ Planned | Not started / intended for a future release |
| 🟡 Partial | Backend or schema exists, but the user-facing UI/flow is incomplete |
| 🎯 Target | The release the work is earmarked for (R3 = Global Markets, R4 = Wrap-up), where known |

---

## Returns & Performance

| Feature | Status | 🎯 Target | Source |
| ------- | ------ | --------- | ------ |
| Time-weighted / money-weighted (IRR) returns | ⏳ Planned | — | [GETTING-STARTED](GETTING-STARTED.md#performance-calculation), [TOOLS](TOOLS.md) |

> **Current behaviour:** returns are **simple, nominal** figures (capital gain + income, net of
> fees), indexed from the start of the selected period. The per-portfolio Performance Method
> (Simple/Compound) only controls percentage compounding. Inflation-indexed (CPI) figures are
> available in the Tax reports.

## Import & Sync

| Feature | Status | 🎯 Target | Source |
| ------- | ------ | --------- | ------ |
| Save a custom column mapping as a reusable template | ⏳ Planned | — | [DATA_IMPORT](DATA_IMPORT.md), [GETTING-STARTED](GETTING-STARTED.md) |
| Bank statement import — ISO 20022 CAMT.053 / SWIFT MT940 | ⏳ Planned | — | [ACCOUNTS](ACCOUNTS.md), [DATA_IMPORT](DATA_IMPORT.md) |
| Broker API sync (direct broker integrations) | ⏳ Planned | R4 | [GETTING-STARTED](GETTING-STARTED.md), [DATA_IMPORT](DATA_IMPORT.md) |
| Sharesight API import | ⏳ Planned | R4 | [GETTING-STARTED](GETTING-STARTED.md), [DATA_IMPORT](DATA_IMPORT.md) |
| Trade-confirmation email import | ⏳ Planned | — | [GETTING-STARTED](GETTING-STARTED.md) |
| AI Importer — direct PDF / image / screenshot upload | ⏳ Planned | — | [ACCOUNT](ACCOUNT.md#ai-importer) |
| Additional broker templates (Schwab, Vanguard) | ⏳ Planned | — | [USER-MANUAL](../USER-MANUAL.md), [DATA_IMPORT](DATA_IMPORT.md) |
| Auto portfolio creation on signup | ⏳ Planned | — | [GETTING-STARTED](GETTING-STARTED.md) |

> **Implemented today:** Quick Import (recognised brokers), Guided Import (category wizard),
> Custom Import (FIIG multi-sheet), Manual entry, the AI Importer (from pasted text), and
> **bank statement import** (OFX/QFX, QIF, and CSV with AU bank templates) with fuzzy/split
> [reconciliation](ACCOUNTS.md#reconciliation).

## Dividends & Corporate Actions

| Feature | Status | 🎯 Target | Source |
| ------- | ------ | --------- | ------ |
| Automatic DRP reconciliation against the share registry | ⏳ Planned | — | [GETTING-STARTED](GETTING-STARTED.md) |
| DRP rounding options (round down/nearest/up, track residual balance) | ⏳ Planned | — | [GETTING-STARTED](GETTING-STARTED.md) |
| Dedicated DRP-recording form (recordDRP UI) | ⏳ Planned | — | [ACTIONS](ACTIONS.md) (toggle + manual BUY workaround ✅) |
| Demergers (spin-offs) | ⏳ Planned | — | [ACTIONS](ACTIONS.md) |
| IPO recording | ⏳ Planned | — | [ACTIONS](ACTIONS.md) |
| Automated corporate-action detection | ⏳ Planned | — | [ACTIONS](ACTIONS.md) |
| Name / ticker change tracking | ⏳ Planned | — | [ACTIONS](ACTIONS.md) |

> **Implemented today:** DRP recording (toggle + manual BUY), splits, bonus issues, return of
> capital, rights issues (parcels enter the CGT engine), and mergers with scrip-for-scrip
> cost-base transfer (MERGER_IN/OUT) — all recorded via the Corporate Actions page.

## Assets

| Feature | Status | 🎯 Target | Source |
| ------- | ------ | --------- | ------ |
| Net Worth & Liabilities (mortgages, loans, credit cards) | ⏳ Planned | R4 | [ASSETS](ASSETS.md), [USER-MANUAL](../USER-MANUAL.md) |
| Property tracking | ⏳ Planned | — | [ASSETS](ASSETS.md) |
| Multi-currency pricing | ⏳ Planned | R3 | [ASSETS](ASSETS.md) |

## Reports & Tools

| Feature | Status | 🎯 Target | Source |
| ------- | ------ | --------- | ------ |
| Multi-Period Report — custom/cumulative/per-FY period selection and grouping | ⏳ Planned | — | [TOOLS](TOOLS.md) (trailing 1M/3M/6M/1Y/3Y report ✅ at `/reports/multi-period`) |
| Dividend Calendar — day-grid layout with status dots | ⏳ Planned | — | [TOOLS](TOOLS.md) (monthly bar chart + table ✅ at `/reports/calendar`) |
| Future Income — multi-month horizon & custom-group filtering | ⏳ Planned | — | [TOOLS](TOOLS.md) |
| Multi-Currency Valuation | ⏳ Planned | R3 | [TOOLS](TOOLS.md) |
| Watchlist price alerts | ⏳ Planned | — | [TOOLS](TOOLS.md) |
| Multiple watchlists | ⏳ Planned | — | [TOOLS](TOOLS.md) |
| Broader ETF look-through coverage (beyond VAS/IOZ/STW/VGS/VDHG) | ⏳ Planned | — | [TOOLS](TOOLS.md) |
| Report CSV export (per report page) | ⏳ Planned | — | [TOOLS](TOOLS.md) |

## Tax

| Feature | Status | 🎯 Target | Source |
| ------- | ------ | --------- | ------ |
| AMIT components — full processing | 🟡 Partial (schema ready) | — | [TAX](TAX.md) |
| Stapled securities (dual trust/company distributions) | ⏳ Planned | — | [TAX](TAX.md) |
| Foreign-exchange rates for CGT | ⏳ Planned | R3 | [TAX](TAX.md) |
| CGT method lock-in (save method per financial year) | ⏳ Planned | — | [TAX](TAX.md) |
| CGT loss carry-forward entry (enter prior-year capital losses) | ⏳ Planned | — | [TAX](TAX.md) |
| Tax-planning strategies UI (tax-loss selling, parcel comparison) | ⏳ Planned | — | [TAX](TAX.md) |
| Division 296 (SMSF) | ⏳ Planned | — | [TAX](TAX.md) |
| Xero integration | ⏳ Planned | — | [TAX](TAX.md) |

## Advanced Analytics

| Feature | Status | 🎯 Target | Source |
| ------- | ------ | --------- | ------ |
| Capital Market Expectations (standalone tool) | ⏳ Planned | — | [ADVANCED](ADVANCED.md) |

> The full R2 analytics suite (backtesting, Monte Carlo, optimisation, efficient frontier,
> Black-Litterman, estimation methods, factor analysis, tactical allocation, stress testing,
> risk metrics) is **implemented**.

> **Model Portfolios** (weight-based target models, scaled comparison dashboard, default model
> library with validity guard, optimise/backtest integration, model source picker, frontier
> model points, Black-Litterman prior, What-If load-from-model, ETF look-through, Model
> Comparison report, Rebalancing & Drift tool, rebalance-to-model CGT estimate, dashboard
> vs-model card) is **implemented**. Deferred: auto-rebalancing / drift alerts, one-click
> "convert model → real portfolio" trade tickets, and model sharing between users.

## API

| Feature | Status | 🎯 Target | Source |
| ------- | ------ | --------- | ------ |
| Watchlist endpoints | ⏳ Planned | — | [API](API.md) |
| Webhooks | ⏳ Planned | R4 | [API](API.md) |
| SDKs | ⏳ Planned | — | [API](API.md) |

> **Implemented today:** portfolios, holdings, transactions, performance & diversity,
> import/export, market search & quote, token management (endpoints + UI), and AI import/chat.

## Export & Backup

| Feature | Status | 🎯 Target | Source |
| ------- | ------ | --------- | ------ |
| PDF export of reports | ⏳ Planned | R4 | [DATA_IMPORT](DATA_IMPORT.md), [USER-MANUAL](../USER-MANUAL.md) |
| Automated scheduled backups (email / cloud) | ⏳ Planned | R4 | [DATA_IMPORT](DATA_IMPORT.md), [USER-MANUAL](../USER-MANUAL.md) |

## Sharing & Settings

| Feature | Status | 🎯 Target | Source |
| ------- | ------ | --------- | ------ |
| Sharing — write/admin enforcement (Write and Admin levels currently grant read-only access) | ⏳ Planned | — | [ACCOUNT](ACCOUNT.md#share-your-portfolio), [USER-MANUAL](../USER-MANUAL.md) |
| Sharing — inline access-level change dropdown | ⏳ Planned | — | [ACCOUNT](ACCOUNT.md) |
| Performance Method setting (Simple/Compound) — currently unused in calculations | 🟡 Partial (setting exists, no effect) | — | [ACCOUNT](ACCOUNT.md), [GETTING-STARTED](GETTING-STARTED.md) |
| Configurable Share Checker thresholds | ⏳ Planned | — | [TOOLS](TOOLS.md) |

> **Implemented today:** read-only sharing — shared portfolios appear in the recipient's
> Portfolio list with a "Shared" badge and are viewable on the detail page; they are not
> included in the recipient's dashboard, reports, tax, or exports.

## Planning & Platform (R4)

| Feature | Status | 🎯 Target | Source |
| ------- | ------ | --------- | ------ |
| Emergency Fund tracker | ⏳ Planned | R4 | [ACCOUNT](ACCOUNT.md), [USER-MANUAL](../USER-MANUAL.md) |
| Net Worth over time | ⏳ Planned | R4 | [USER-MANUAL](../USER-MANUAL.md) |

---

## Maintenance

When a feature ships, update its source doc's status table **and** remove (or mark ✅) its row
here. When a new gap is introduced, flag it in place in the relevant doc and add a row here so
this file stays the authoritative list of outstanding work.
