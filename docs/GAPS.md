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
| Broker API sync (direct broker integrations) | ⏳ Planned | R4 | [GETTING-STARTED](GETTING-STARTED.md), [DATA_IMPORT](DATA_IMPORT.md) |
| Sharesight API import | ⏳ Planned | R4 | [GETTING-STARTED](GETTING-STARTED.md), [DATA_IMPORT](DATA_IMPORT.md) |
| Trade-confirmation email import | ⏳ Planned | — | [GETTING-STARTED](GETTING-STARTED.md) |
| AI Importer — direct PDF / image / screenshot upload | ⏳ Planned | — | [ACCOUNT](ACCOUNT.md#ai-importer) |
| Additional broker templates (Schwab, Vanguard) | ⏳ Planned | — | [USER-MANUAL](../USER-MANUAL.md), [DATA_IMPORT](DATA_IMPORT.md) |
| Auto portfolio creation on signup | ⏳ Planned | — | [GETTING-STARTED](GETTING-STARTED.md) |

> **Implemented today:** Quick Import (recognised brokers), Guided Import (category wizard),
> Custom Import (FIIG multi-sheet), Manual entry, and the AI Importer (from pasted text).

## Dividends & Corporate Actions

| Feature | Status | 🎯 Target | Source |
| ------- | ------ | --------- | ------ |
| Automatic DRP reconciliation against the share registry | ⏳ Planned | — | [GETTING-STARTED](GETTING-STARTED.md) |
| Demergers (spin-offs) | ⏳ Planned | — | [ACTIONS](ACTIONS.md) |
| IPO recording | ⏳ Planned | — | [ACTIONS](ACTIONS.md) |
| Automated corporate-action detection | ⏳ Planned | — | [ACTIONS](ACTIONS.md) |
| Name / ticker change tracking | ⏳ Planned | — | [ACTIONS](ACTIONS.md) |

> **Implemented today:** manual DRP recording, splits, bonus issues, return of capital, rights
> issues, and mergers (MERGER_IN/OUT).

## Assets

| Feature | Status | 🎯 Target | Source |
| ------- | ------ | --------- | ------ |
| Net Worth & Liabilities (mortgages, loans, credit cards) | ⏳ Planned | R4 | [ASSETS](ASSETS.md), [USER-MANUAL](../USER-MANUAL.md) |
| Property tracking | ⏳ Planned | — | [ASSETS](ASSETS.md) |
| Multi-currency pricing | ⏳ Planned | R3 | [ASSETS](ASSETS.md) |

## Reports & Tools

| Feature | Status | 🎯 Target | Source |
| ------- | ------ | --------- | ------ |
| Multi-Period Report — full UI | 🟡 Partial (server action, stub UI) | — | [TOOLS](TOOLS.md) |
| Dividend Calendar — full UI | 🟡 Partial (server action, stub UI) | — | [TOOLS](TOOLS.md) |
| Drawdown Risk Report — full UI | 🟡 Partial (server action, stub UI) | — | [TOOLS](TOOLS.md) |
| Historical Cost Report — full UI | 🟡 Partial (server action, stub UI) | — | [TOOLS](TOOLS.md) |
| Multi-Currency Valuation | ⏳ Planned | R3 | [TOOLS](TOOLS.md) |

## Tax

| Feature | Status | 🎯 Target | Source |
| ------- | ------ | --------- | ------ |
| AMIT components — full processing | 🟡 Partial (schema ready) | — | [TAX](TAX.md) |
| Stapled securities (dual trust/company distributions) | ⏳ Planned | — | [TAX](TAX.md) |
| Foreign-exchange rates for CGT | ⏳ Planned | R3 | [TAX](TAX.md) |
| CGT method lock-in (save method per financial year) | ⏳ Planned | — | [TAX](TAX.md) |
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
