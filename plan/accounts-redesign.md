# Accounts Redesign — Implementation Plan

> **Status:** Planning (awaiting confirmation on open questions before execution)
> **Scope:** Promote Cash Accounts to first‑class "Accounts" (bank accounts) with their
> own navigation, pages, charts, rich bank/transaction model, multi‑format import
> (OFX/QIF/CSV), portfolio linking, and a reconciliation workflow that absorbs the
> existing dividend franking classification.

---

## 1. Current State Assessment

### What exists today

| Area | Current implementation | File(s) |
| ---- | ---------------------- | ------- |
| Model | `CashAccount` (portfolioId, name, currency, balance) and `CashTransaction` (cashAccountId, type, amount, date, description) | [prisma/schema.prisma](../prisma/schema.prisma) (≈L420–447) |
| Actions | `createCashAccount`, `addCashTransaction`, `getCashAccount(s)` | [lib/actions/cash-accounts.ts](../lib/actions/cash-accounts.ts) |
| Page | Single page nested under a portfolio: `/portfolio/[id]/cash` — list of cards + add‑transaction form | [app/(dashboard)/portfolio/[id]/cash/page.tsx](<../app/(dashboard)/portfolio/[id]/cash/page.tsx>) |
| Forms | `CreateCashAccountForm`, `AddCashTransactionForm` | [components/forms/cash-forms.tsx](../components/forms/cash-forms.tsx) |
| Import | CSV‑only via `mapCashRows` + `cashTemplates` (generic signed, generic debit/credit); persisted by `persistCashTransactions` with a `date|amount|type|description` dedup key | [lib/import/cash-mapper.ts](../lib/import/cash-mapper.ts), [lib/import/templates.ts](../lib/import/templates.ts), [lib/actions/import.ts](../lib/actions/import.ts) |
| Franking | Dividend franked/unfranked + franking‑credit classification lives inline in the holding transaction list | [components/forms/transaction-row.tsx](../components/forms/transaction-row.tsx) |

### Limitations (drives this redesign)

1. **Not first‑class** — accounts are buried under a single portfolio; no sidebar entry, no list/detail pages, no charts.
2. **Thin model** — no institution, BSB/account number, account type, interest, fees, debit cards, or categories.
3. **Portfolio coupling** — an account belongs to exactly one portfolio (`portfolioId` FK), so it cannot back multiple portfolios.
4. **Weak dedup** — text‑based key; no stable bank id, so categorisation/reconciliation can't survive re‑imports.
5. **No reconciliation** — bank transactions cannot be linked to portfolio buys/sells/income/fees; franking classification is a separate, disconnected flow.
6. **CSV‑only import** — no OFX/QIF support, no per‑bank templates.

---

## 2. Requirements → Design Mapping

| # | Requirement | Design response |
| - | ----------- | --------------- |
| 1 | Accounts are first‑class; sidebar item, `/accounts` list, detail page, charts (balances over time, recent tx) | New `Account` model (user‑scoped), `Accounts` nav item, `/accounts` + `/accounts/[id]` pages reusing the shared chart components (`ChartCard`, `RangeSelector`, area/movement) |
| 2 | Bank‑like: debits/credits, interest, fees, debit cards, managed by a bank, 6‑digit code + account number, categorised, linked to portfolio tx | Rich `Account` fields (institution, BSB, accountNumber, accountType, interestRate), `DebitCard`, `Category` (personal‑finance categorisation), signed `amount` on `AccountTransaction`, reconciliation link |
| 3 | Import bank details; templates + wizards; OFX + common formats | `ofx-js` for OFX/QFX, custom QIF parser, extended CSV mapper; per‑bank CSV templates; dedicated **Accounts** import wizard |
| 4 | Portfolio ↔ account link (many‑to‑many); portfolio buys/sells/income settle against linked account | `PortfolioAccount` join table; **auto‑post** every portfolio transaction to the portfolio's settlement account (a linked physical account, or an auto‑created **virtual** account) |

### Confirmed decisions (2026-06-24)

- **User‑scoped accounts**, **plus virtual portfolio‑cash accounts**: a portfolio with no linked
  physical account gets an auto‑maintained **virtual** account. Virtual accounts have their own
  detail page but are **read‑only** (no manual transactions, no statement import). Their **balance
  is excluded** from total portfolio value (notional cash), but **income posted to them is still
  counted** in portfolio income/returns.
- **Auto‑post is always on**: each portfolio buy/sell/income/fee posts a matching cash entry to the
  portfolio's settlement account (physical if linked, otherwise virtual). For **physical** accounts,
  these auto‑posted entries are later **reconciled** against the imported bank statement — when an
  imported row obviously matches an auto‑posted entry, the importer **suggests linking/merging**
  them (no double counting).
- System default categories **+** user‑defined.
- **Migrate** existing `CashAccount`/`CashTransaction` into the new model; retire
  `/portfolio/[id]/cash` (redirect to the account).
- Per‑account currency; dashboard cash reported in **base currency without FX** for now.
| 5 | Reconciliation links account tx ↔ portfolio tx (buys/sells/income/fees); merge franking classification; persistent across re‑imports | `Reconciliation` model; reconciliation UI that includes the franking panel; persistence guaranteed by `fitId`‑keyed idempotent import |
| 6 | Dashboard incorporates account balances | Add a "Cash & Accounts" summary + include cash in net‑worth/value where appropriate |

---

## 3. Research Findings (for execution; doc‑first)

### Import formats

| Format | Notes | Decision |
| ------ | ----- | -------- |
| **OFX** (`.ofx`) | SGML (v1.x) / XML (v2.x). Bank statement path: `OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS` → `BANKACCTFROM.{BANKID(BSB),ACCTID}`, `CURDEF`, `BANKTRANLIST.STMTTRN[]` with `DTPOSTED`, `TRNAMT` (signed), `FITID` (**stable unique id**), `NAME`, `MEMO`, `TRNTYPE` | Parse with **`ofx-js`** (zero deps, TS types, parse‑only, serverless‑safe). Use `FITID` as the idempotent dedup + reconciliation key |
| **QFX** (`.qfx`) | Intuit's OFX variant (adds `INTU.*` tags) | Same parser as OFX |
| **QIF** (`.qif`) | Line‑based: `!Type:Bank`, `D`=date, `T`=amount (signed), `P`=payee, `M`=memo, `N`=number/cheque, `L`=category, `^`=record end. No stable id | Small custom parser; dedup by content hash |
| **CSV** | Per‑bank column layouts (signed amount or debit/credit) | Extend existing `cash-mapper`; add bank templates |
| **CAMT.053 / MT940** | ISO 20022 XML / SWIFT — enterprise/business banking | ⏳ Out of scope (note in GAPS as future) |

> **Australian context:** Direct Connect (live OFX server) is rarely available from AU banks, so we support **file download → import**, not bank APIs. BSB is the Australian 6‑digit "Bank‑State‑Branch" code (`BANKID` in OFX) — this is the "6 digit code" in the requirement.

### Package to add (verify against KNOWLEDGE.md on execution)

- `ofx-js` (`pnpm add ofx-js`) — parse OFX/QFX. MIT, ~25k weekly downloads, built‑in types, no transitive deps. Record verified install + usage snippet in [docs/KNOWLEDGE.md](../docs/KNOWLEDGE.md).

### Reconciliation / matching pattern (personal‑finance apps)

- **Idempotent import**: skip rows whose `fitId` (or content hash) already exists → categorisation & reconciliation survive re‑imports (satisfies req 5 persistence).
- **Auto‑match** candidate generation: for each unreconciled account transaction, score portfolio transactions/fees by `|amount| within tolerance` + `date within ±N days` + optional instrument‑code token match in the narrative. Surface high‑confidence matches for one‑click confirm; allow manual link/unlink.
- **Carry‑forward categorisation**: when a description matches a previously‑categorised merchant (normalised narrative), pre‑fill the category.

---

## 4. Target Data Model

> **Implementation note (P1a):** Prisma already has an `Account` model (NextAuth OAuth) and a
> `CashAccount` model. To avoid a name collision and keep migration low‑risk, the new first‑class
> entity is implemented by **evolving `CashAccount`/`CashTransaction`** (adding `userId`, bank
> metadata, `isVirtual`, categories, etc.) rather than introducing a clashing `Account` model.
> The new category model is `CashCategory`, and join/links use `cashAccountId`. The field set below
> matches the implementation; only the model names differ (`Account`→`CashAccount`,
> `AccountTransaction`→`CashTransaction`, `Category`→`CashCategory`). The UI/routes still say
> "Accounts".

> All money uses Prisma `Decimal @db.Decimal(18,2)`. `AccountTransaction.amount` is **signed**
> (credit = positive / money in, debit = negative / money out) for simple running‑balance math.

```prisma
model Account {
  id             String   @id @default(cuid())
  userId         String
  name           String
  institution    String?            // bank / platform name
  bsb            String?            // AU 6-digit Bank-State-Branch (OFX BANKID)
  accountNumber  String?
  accountType    String   @default("transaction") // transaction|savings|offset|term_deposit|credit_card|cash
  isVirtual      Boolean  @default(false) // auto-maintained portfolio cash ledger; read-only; excluded from portfolio value
  currency       String   @default("AUD")
  openingBalance Decimal  @default(0) @db.Decimal(18, 2)
  currentBalance Decimal  @default(0) @db.Decimal(18, 2) // cached, recomputed on writes/imports
  interestRate   Decimal? @db.Decimal(8, 4)
  website        String?
  notes          String?
  archived       Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user           User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions   AccountTransaction[]
  cards          DebitCard[]
  portfolioLinks PortfolioAccount[]

  @@index([userId])
}

model DebitCard {
  id        String  @id @default(cuid())
  accountId String
  label     String?
  last4     String?
  network   String? // visa|mastercard|eftpos|amex
  expiry    String? // MM/YY
  createdAt DateTime @default(now())

  account Account @relation(fields: [accountId], references: [id], onDelete: Cascade)
  @@index([accountId])
}

model PortfolioAccount {
  id          String   @id @default(cuid())
  portfolioId String
  accountId   String
  isDefault   Boolean  @default(false) // default settlement account for the portfolio
  createdAt   DateTime @default(now())

  portfolio Portfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  account   Account   @relation(fields: [accountId], references: [id], onDelete: Cascade)
  @@unique([portfolioId, accountId])
  @@index([accountId])
}

model Category {
  id       String  @id @default(cuid())
  userId   String
  name     String
  kind     String  @default("expense") // income|expense|transfer|investment|fee|interest
  color    String?
  parentId String?
  isSystem Boolean @default(false)

  user     User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children Category[] @relation("CategoryTree")
  transactions AccountTransaction[]
  @@index([userId])
}

model AccountTransaction {
  id          String   @id @default(cuid())
  accountId   String
  date        DateTime           // posted date
  amount      Decimal  @db.Decimal(18, 2) // SIGNED: + credit / - debit
  type        String   @default("other") // deposit|withdrawal|interest|fee|transfer|dividend|...
  description String?
  categoryId  String?
  source      String   @default("manual") // manual|import|portfolio|interest
  balance     Decimal? @db.Decimal(18, 2) // running balance from statement, if provided
  fitId       String?            // OFX FITID — stable id for idempotent import + reconciliation
  importHash  String?            // dedup key for QIF/CSV (date|amount|desc)
  importJobId String?
  reconciled  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  account         Account          @relation(fields: [accountId], references: [id], onDelete: Cascade)
  category        Category?        @relation(fields: [categoryId], references: [id])
  reconciliations Reconciliation[]

  @@unique([accountId, fitId])   // idempotent OFX import (null fitId allowed many)
  @@index([accountId, date])
  @@index([accountId, importHash])
}

model Reconciliation {
  id                   String  @id @default(cuid())
  accountTransactionId String
  transactionId        String? // portfolio Transaction (buy/sell/dividend/interest/...)
  feeId                String? // portfolio custody Fee
  matchType            String  @default("manual") // auto|manual
  confidence           Float?
  createdAt            DateTime @default(now())

  accountTransaction AccountTransaction @relation(fields: [accountTransactionId], references: [id], onDelete: Cascade)
  transaction        Transaction?       @relation(fields: [transactionId], references: [id], onDelete: SetNull)
  fee                Fee?               @relation(fields: [feeId], references: [id], onDelete: SetNull)

  @@index([accountTransactionId])
  @@index([transactionId])
}
```

Back‑relations to add: `User.accounts`, `User.categories`, `Portfolio.accountLinks`,
`Transaction.reconciliations`, `Fee.reconciliations`.

> **Franking note (req 5):** franking fields already live on `Transaction`
> (`frankedAmount`, `unfrankedAmount`, `frankingCredits`, `taxDeferred`, `foreignTax`). We do
> **not** move them — we surface the same classification panel inside the reconciliation step
> and keep writing them via `updateTransaction`. "Merge" = unify the workflow, not the storage.

---

## 5. Reconciliation Design (req 5)

1. **Idempotent import** establishes persistence: an `AccountTransaction` is uniquely keyed by
   `(accountId, fitId)` (OFX) or `(accountId, importHash)` (QIF/CSV). Re‑importing a statement
   skips existing rows, so their `categoryId`, `reconciled` flag, and `Reconciliation` links are
   never recreated or lost.
2. **Auto‑match engine** (`lib/services/reconciliation.ts`): for each unreconciled account tx,
   propose portfolio `Transaction`/`Fee` candidates scored on amount tolerance, date window, and
   narrative token match; auto‑link confidence ≥ threshold (flagged `matchType="auto"`).
3. **Reconciliation UI** (`/accounts/[id]/reconcile`): two‑column matcher (bank tx ↔ portfolio
   tx); confirm/reject/manual‑link; "create portfolio transaction from this bank row" shortcut.
4. **Franking merge:** when the linked portfolio tx is a `DIVIDEND`, the reconciliation drawer
   shows the franked/unfranked/credits panel (extracted from `transaction-row.tsx` into a shared
   `components/forms/franking-fields.tsx`), with the 30%/25% gross‑up helper. Saving writes
   franking onto the `Transaction`. The standalone franking entry point in the holdings list is
   kept but now also points users to reconciliation.
5. **Unreconcile** removes the `Reconciliation` row but leaves both transactions intact.

---

## 6. Import Design (req 3)

- **Format detection** by extension/content: `.ofx/.qfx` → OFX; `.qif` → QIF; `.csv/.txt` → CSV.
- **Parsers** (`lib/import/`):
  - `ofx-parser.ts` — wrap `ofx-js`; normalise `STMTTRN[]` → `AccountParsedTransaction` (date, signed amount, description = NAME+MEMO, type from TRNTYPE, `fitId`); read `BANKID`→bsb, `ACCTID`→accountNumber, `CURDEF`→currency for account auto‑fill.
  - `qif-parser.ts` — small line parser → normalise (no fitId; hash dedup).
  - extend `cash-mapper.ts` → signed `amount`, category column, `importHash`.
- **Templates** (`lib/import/templates.ts`): add AU bank CSV templates — CommBank, NAB, ANZ, Westpac, ING, Macquarie, plus the existing generic signed / debit‑credit.
- **Auto‑categorisation** (`lib/import/categorise.ts`): rule list (narrative keyword → category) + carry‑forward from previously categorised matching narratives.
- **Accounts import wizard** (`/accounts/[id]/import` and a generic `/accounts/import`): Upload → Detect/Configure → (CSV) Map → Review (with dedup + proposed categories) → Import. Dedup by `fitId`/`importHash`.

---

## 7. UI / Navigation (req 1)

- **Sidebar:** add `Accounts` (Wallet/Landmark icon) between Portfolio and Reports → [components/layout/sidebar.tsx](../components/layout/sidebar.tsx).
- **Breadcrumbs:** register `accounts` label + dynamic account name (reuse `BreadcrumbLabel`).
- **`/accounts`** (list): per‑account cards (institution, masked account number, type badge, balance, mini balance sparkline) + a **total cash** summary; "New Account" and "Import" actions.
- **`/accounts/[id]`** (detail): header (institution · BSB · masked number · type), KPI cards (current balance, money in/out this period, interest YTD, fees YTD), then a responsive **chart grid** (reusing `ChartCard` + universal `RangeSelector`):
  - **Balance over time** (area/line of running balance)
  - **Cash flow** (monthly money‑in vs money‑out bars)
  - **Spending by category** (pie) and **Income by category**
  - **Recent transactions** table (date, description, category, amount signed, reconciled badge), with inline categorise + reconcile actions
  - Cards & linked portfolios panels
- **Account settings dialog:** edit institution, BSB, account number, type, interest rate, website (mirrors the portfolio edit dialog pattern).

---

## 8. Portfolio ↔ Account Linking & Auto‑Post (req 4)

- Portfolio detail page gains a **Linked accounts** section (link/unlink, set default).
- Every portfolio has a **settlement account**: the default linked **physical** account, or an
  auto‑created **virtual** account when none is linked.
- **Auto‑post (always on):** creating/editing/deleting a portfolio `Transaction` (or `Fee`)
  posts/updates a matching `AccountTransaction` (`source="portfolio"`) in the settlement account,
  linked via `Reconciliation`.
  - **Virtual settlement:** the posted entries _are_ the (read‑only) ledger.
  - **Physical settlement:** the posted entry is an "expected" movement; when the real bank
    statement is imported, the importer **suggests linking** the imported row to the auto‑posted
    entry (amount/date/narrative match) and **merges** them on confirm — the bank row becomes the
    source of truth, the portfolio link is preserved, no duplicate cash entry remains.
- **Virtual accounts** are excluded from total portfolio value and cash/net‑worth totals; the
  income they record is already counted via the underlying portfolio `Transaction`s.

---

## 9. Dashboard Integration (req 6)

- New **Cash & Accounts** summary card: total cash across non‑archived accounts (base currency),
  and a **Net worth** figure = portfolio market value + cash.
- Extend the consolidated dashboard data ([app/api/v1/dashboard/detail](<../app/api/v1/dashboard/detail/route.ts>)) so the value‑over‑time area can optionally include a **Cash** series; movement can include account cash flow.
- Account balances appear in the existing responsive grid using the shared chart components.

---

## 10. Migration Strategy

1. Add new tables (`Account`, `DebitCard`, `PortfolioAccount`, `Category`, `AccountTransaction`,
   `Reconciliation`) via a Prisma migration.
2. **Backfill** (raw SQL in the migration):
   - For each `CashAccount` → create `Account` (`userId` = its portfolio's `userId`; copy name,
     currency, balance→`currentBalance`) and a `PortfolioAccount` link (`isDefault = true`).
   - For each `CashTransaction` → `AccountTransaction` with **signed** amount
     (`CASH_CREDIT_TYPES` → +, else −), copy type/date/description, set `importHash`.
3. Keep `CashAccount`/`CashTransaction` for one release (read‑nothing) then drop in a follow‑up
   migration once verified. Update `csv-export.ts`, `portfolio.ts` merge action, and import paths
   to the new models.
4. Seed a small set of **system categories** per user on first use.

---

## 11. Phased Execution (P1 = code on Windows, P2 = validate in Codespaces)

| Phase | Deliverables |
| ----- | ------------ |
| **P1a — Data layer** | Schema + migration + SQL backfill; `lib/services/accounts.ts` (CRUD, balance recompute, time‑series); `lib/validators/account.ts`; update merge/export to new models; add `ofx-js` + KNOWLEDGE.md entry |
| **P1b — Accounts UI** | Sidebar item; `/accounts` list; `/accounts/[id]` detail with chart grid (reusing shared components); account + card + category CRUD; breadcrumbs |
| **P1c — Import** | OFX/QIF parsers, extended CSV mapper, AU bank templates, auto‑categorisation, Accounts import wizard, `fitId`/hash dedup |
| **P1d — Reconciliation** | `reconciliation.ts` auto‑match; reconcile UI; shared `franking-fields.tsx`; merge franking into reconciliation; unreconcile |
| **P1e — Linking + Dashboard + Docs** | Portfolio↔account linking + settlement/auto‑post; dashboard cash/net‑worth + chart series; docs (new `docs/ACCOUNTS.md`, update USER‑MANUAL/ACCOUNT/DATA_IMPORT/GAPS, help pages) |
| **P2 — Validation** | `prisma migrate`/`generate`, `pnpm lint`, `pnpm build`, manual smoke tests in Codespaces |

---

## 12. Open Questions — RESOLVED (2026-06-24)

1. **Account scope:** user‑scoped ✅ — plus **virtual** portfolio‑cash accounts (read‑only,
   excluded from portfolio value, income still counted).
2. **Settlement:** **auto‑post always on** to the settlement account (physical or virtual);
   physical accounts reconcile against imported bank statements with **match suggestions**.
3. **Categories:** system defaults **+** user‑defined ✅.
4. **Legacy data:** auto‑migrate `CashAccount`/`CashTransaction`; retire `/portfolio/[id]/cash` ✅.
5. **Multi‑currency:** per‑account currency; dashboard cash in base currency without FX for now ✅.

**Execution:** start with **P1a** (schema + migration + data layer), then review.

---

## 13. Risks & Mitigations

| Risk | Mitigation |
| ---- | ---------- |
| OFX dialect variance (SGML headers, AU bank quirks) | `ofx-js` mechanically coerces SGML→XML; wrap in try/catch, fall back to CSV; collect failing samples |
| Balance drift between cached `currentBalance` and transactions | Recompute from transactions on every import/edit; provide a "recalculate balance" action |
| Reconciliation mis‑matches | Confidence threshold + always user‑confirmable; never auto‑link below threshold |
| Migration data loss | Backfill in a transaction; keep legacy tables for one release before dropping |
| Scope creep on dashboard | Phase dashboard work last (P1e); keep existing charts intact |

---

## 14. Net‑new / Changed Files (indicative)

**New:** `prisma/migrations/<ts>_accounts_redesign/`, `lib/services/accounts.ts`,
`lib/services/reconciliation.ts`, `lib/validators/account.ts`, `lib/import/ofx-parser.ts`,
`lib/import/qif-parser.ts`, `lib/import/categorise.ts`, `app/(dashboard)/accounts/page.tsx`,
`app/(dashboard)/accounts/[id]/page.tsx`, `app/(dashboard)/accounts/[id]/import/page.tsx`,
`app/(dashboard)/accounts/[id]/reconcile/page.tsx`, `components/accounts/*`,
`components/forms/franking-fields.tsx`, `components/charts/account-balance-chart.tsx`,
`app/api/v1/accounts/[id]/detail/route.ts`, `docs/ACCOUNTS.md`.

**Changed:** `prisma/schema.prisma`, `components/layout/sidebar.tsx`,
`components/layout/breadcrumbs.tsx`, `lib/actions/import.ts`, `lib/import/templates.ts`,
`lib/import/cash-mapper.ts`, `lib/export/csv-export.ts`, `lib/actions/portfolio.ts`,
`app/(dashboard)/portfolio/[id]/page.tsx` (linked accounts), dashboard page + detail API,
`components/forms/transaction-row.tsx` (use shared franking fields), docs + help pages,
`docs/KNOWLEDGE.md` (ofx-js).

---

## 15. Execution Log

### P1a — Data layer ✅ (coded 2026-06-24; pending Codespaces validation)

Delivered:

- **Schema** ([prisma/schema.prisma](../prisma/schema.prisma)) — evolved `CashAccount`
  (user‑scoped + bank metadata + `isVirtual` + nullable `portfolioId`) and `CashTransaction`
  (`categoryId`, `source`, `fitId`, `importHash`, `runningBalance`, `reconciled`, `updatedAt`);
  added `DebitCard`, `PortfolioAccount`, `CashCategory`, `Reconciliation`; back‑relations on
  `User`, `Portfolio`, `Transaction`, `Fee`. Prisma language server reports the schema valid.
- **Migration** ([prisma/migrations/20260624010000_accounts_redesign/migration.sql](../prisma/migrations/20260624010000_accounts_redesign/migration.sql))
  — DDL + backfill (`CashAccount.userId` from owning portfolio; `PortfolioAccount` links from the
  existing `portfolioId`).
- **Validators** ([lib/validators/account.ts](../lib/validators/account.ts)).
- **Service** ([lib/services/accounts.ts](../lib/services/accounts.ts)) — overview, detail,
  balance series, `recomputeAccountBalance`, `ensureVirtualAccount`, `getUserCashTotal`.

**Codespaces validation (P2 for this phase):**

```bash
pnpm prisma migrate deploy        # apply 20260624010000_accounts_redesign
#   (or: pnpm prisma migrate dev — reconcile any drift it reports)
pnpm prisma generate              # REQUIRED before the service type-checks
pnpm exec tsc --noEmit
pnpm lint
```

> Until `prisma generate` runs, the generated client lacks the new models, so editors/CI may flag
> `db.portfolioAccount`, `db.cashCategory`, and the new `CashAccount`/`CashTransaction` fields.

### Deferred to later phases

- `ofx-js` dependency + [docs/KNOWLEDGE.md](../docs/KNOWLEDGE.md) entry → **P1c** (import), when the
  OFX parser is built.
- Default `CashCategory` seeding → **P1b** (UI) via a `seedDefaultCategories(userId)` helper.
- Auto‑post hooks in portfolio transaction create/update/delete → **P1d/P1e**.

### Next: P1b — Accounts UI (awaiting go‑ahead)

Sidebar `Accounts` item, `/accounts` list, `/accounts/[id]` detail with the shared chart grid,
account/card/category CRUD actions, breadcrumbs, and retire `/portfolio/[id]/cash` (redirect).
