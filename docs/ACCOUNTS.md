# InvestaLens Accounts

> **📖 Part of the [InvestaLens User Manual](../USER-MANUAL.md)** | Related: [Account & Portfolio Management](ACCOUNT.md) | [Data Import](DATA_IMPORT.md)

> **Implementation Status**
>
> | Feature                                            | Status         |
> | -------------------------------------------------- | -------------- |
> | First-class, user-scoped accounts (`/accounts`)    | ✅ Implemented |
> | Bank metadata (institution, BSB, account number)   | ✅ Implemented |
> | Account types, interest rate, debit cards          | ✅ Implemented |
> | Virtual portfolio cash ledgers (auto-posted)       | ✅ Implemented |
> | Transaction categorisation (system + custom)       | ✅ Implemented |
> | Balance / cash-flow / category charts              | ✅ Implemented |
> | Statement import — OFX / QFX, QIF, CSV             | ✅ Implemented |
> | AU bank CSV templates (CommBank, NAB, ANZ, …)      | ✅ Implemented |
> | Portfolio ↔ account linking                        | ✅ Implemented |
> | Reconciliation (fuzzy + split matching)            | ✅ Implemented |
> | Inline edit / add of account transactions          | ✅ Implemented |
> | Running-balance column                             | ✅ Implemented |
> | Spending-by-category bar chart                     | ✅ Implemented |
> | Per-user category management (add/edit/delete/merge/reset) | ✅ Implemented |
> | Auto-categorised virtual ledgers                   | ✅ Implemented |
> | Convert virtual ledger → real account              | ✅ Implemented |
> | Transfer mirroring + import dedup against mirrors   | ✅ Implemented |
> | Dashboard cash & net worth                         | ✅ Implemented |
> | Mapping template save/load (custom CSV)            | ⏳ To be Implemented |
> | CAMT.053 / MT940 import                            | ⏳ To be Implemented |

## Overview

**Accounts** are first-class, user-scoped bank and cash accounts — comparable to portfolios. Open
**Accounts** in the sidebar to see every account, the total cash held, and to create or import.

There are two kinds:

- **Real accounts** — bank/cash accounts you create or import statements into. They have a
  balance, debit/credit transactions, categories, and optional cards.
- **Virtual accounts** — an auto-maintained cash ledger for a portfolio that has no real account
  linked. They are **read-only** (no manual entry or import) and their balance is **excluded** from
  total cash and portfolio value (the underlying income is still counted in portfolio returns). Their
  transactions are **auto-categorised** from the originating portfolio activity, and a virtual ledger
  can be **converted into a real, editable account** from its page (the **Convert to real account**
  button) when you want to manage it directly.

## The Accounts list (`/accounts`)

A **Total cash** card (real accounts only) plus a card per account showing the institution, type,
masked account number, balance, a *Virtual* badge where applicable, and linked portfolios. Use
**New Account** to add one.

## Account detail (`/accounts/[id]`)

- **Header** — name, institution · type · BSB · masked number, with **Edit**, **Import** and
  **Reconcile** actions (real accounts only).
- **Panels** — current balance (and interest rate), linked portfolios, and cards.
- **Charts** (zoomable, driven by the app-wide universal timescale selector) — **balance over time**, **monthly cash
  flow** (money in vs out), and **spending by category** (a bar chart where each category uses its
  harmonised category colour).
- **Transactions table** — date, description, a **type** with its harmonised icon and colour,
  category, signed amount, a **running balance**
  column, and a reconciled / auto-posted status. On real accounts you can **add a transaction
  inline** (the row at the top of the table), **edit** any row in place (date, type, amount,
  description), set its category, and delete it. Virtual ledgers are read-only and show their
  auto-assigned category as plain text.

### Account fields

| Field          | Notes                                                       |
| -------------- | ----------------------------------------------------------- |
| Name           | Display name                                                |
| Institution    | Bank / platform                                             |
| BSB            | Australian 6-digit Bank-State-Branch code                   |
| Account number | Stored in full; shown masked (•••• 1234)                    |
| Type           | Transaction, savings, offset, term deposit, credit card, cash |
| Interest rate  | Annual %                                                    |
| Debit cards    | Label, network (Visa/Mastercard/EFTPOS/Amex), last 4, expiry |

### Categories

Transactions can be categorised like a personal-finance manager. A default set (Dividends,
Distributions, Interest, Salary, Purchase, Sale, Management Fee, Transfer In/Out, Insurance, …) is
seeded on first use. Imports auto-suggest a category from the narrative (e.g. *Woolworths →
Groceries*) and from the transaction type, and **virtual ledger** rows are auto-categorised from the
portfolio activity that posted them.

Categories are a **per-user** setting managed at **Settings → Categories**, where you can:

- **Add, edit and delete** categories (name, kind, colour);
- **Reassign on delete** — if a category is in use, nominate another category (or leave
  uncategorised) and its transactions are reclassified before it is removed;
- **Merge** a category into another — its transactions (and child categories) move to the target and
  the source is deleted;
- **Reset to defaults** — restore the seeded set.

## Importing statements

Open an account → **Import**. Supported formats:

| Format       | Notes                                                                       |
| ------------ | --------------------------------------------------------------------------- |
| **OFX / QFX**| Richest format — de-duplicated by the bank's stable transaction id (FITID)  |
| **QIF**      | Quicken format                                                              |
| **CSV**      | Pick a bank template (CommBank, NAB, ANZ, Westpac, ING, Macquarie) or a generic signed / debit-credit layout |

The wizard parses the file, flags **duplicates** (so re-importing the same statement is safe),
suggests categories, and lets you choose which rows to import. See [DATA_IMPORT.md](DATA_IMPORT.md).

> **⏳ Not yet:** saving a custom CSV column mapping as a reusable template; ISO 20022 CAMT.053 and
> SWIFT MT940. See [GAPS.md](GAPS.md).

## Linking accounts to portfolios

On a portfolio's detail page, the **Linked accounts** panel links real accounts to the portfolio
(many-to-many) and sets a **default** settlement account. A portfolio always has a **virtual cash
ledger** too — auto-posted from its buys, sells, income and fees — which you can open from the panel.
The portfolio header's **Cash** button opens the default linked account, or the virtual ledger when
no real account is linked.

- **Auto-post (virtual):** the virtual ledger is rebuilt from the portfolio's transactions, so it
  always reflects the cash impact of portfolio activity. **Editing a portfolio transaction**
  (including assigning dividend franking) rebuilds the ledger and re-reconciles linked real accounts.
- **Real accounts:** import the actual bank statement and **reconcile** it against the portfolio's
  transactions (below) rather than auto-posting, to avoid double-counting. **Linking a new account**
  immediately runs reconciliation against the portfolio's transactions.

## Reconciliation

Open a real account → **Reconcile** to match bank transactions to portfolio buys, sells, income and
fees. The matcher uses **fuzzy logic**:

- **Settlement-aware dates** — a bank movement usually posts on the settlement date, a few days
  after the trade (≈T+2/T+3), so a small positive date offset is treated as a full match.
- **Amount tolerance** — small rounding differences are accepted.
- **Split matching (1 → many)** — a single bank amount can match a **combination** of portfolio
  transactions (e.g. one debit covering several buys settled together, or one deposit summing
  multiple same-day dividends). The matcher suggests splits and tracks a *partial* status with the
  remaining amount until fully matched.
- **Narrative hints** — an instrument code appearing in the bank description boosts confidence.

Confirm a suggestion or pick matches manually (multi-select for splits). When a linked transaction
is a **dividend**, classify its **franking** (franked/unfranked split, franking credits, gross-up)
right in the reconcile step — the same classifier used on the holdings page.

Because imports are idempotent (FITID / content hash), **reconciliations persist** across future
statement re-imports.

### Transfers between your own accounts

Recording a transfer between two of your accounts automatically creates a **mirror** transaction in
the counterparty account, linked one-to-one so the pair stays consistent. Editing or deleting one
side updates (or removes) its mirror, and changing the counterparty moves the mirror to the new
account — referential integrity is preserved throughout. When you later import a statement into the
other account, the import **reconciles each row against an existing transfer mirror instead of
creating a duplicate** (within ±$0.01 and ±3 days), keeping the more descriptive narrative.

## Dashboard

The Dashboard shows **Cash** (total across real accounts) and **Net Worth** (investments + cash),
alongside the consolidated portfolio charts.
