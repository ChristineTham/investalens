# Transactions, Icons, Colors & Portfolio Identity — Implementation Plan

**Environment:** Windows (coding only — no execution). Schema migration + lint/build run in
Codespaces. Covers the 9 requested items, grouped into executable phases.

## Goals (requested items)

1. Assign a suitable **icon** to each portfolio transaction type and account category.
2. **Harmonise** icons and colors between portfolio transaction types and account categories.
3. Ensure icons/colors are used appropriately across **all existing charts**.
4. Let a user **pick an icon + color per portfolio** (default if unset; editable in settings).
5. Implement portfolio icon/color **consistently across all pages and charts**.
6. Dashboard + portfolio pages: returns over ≥ 1yr shown as **annualised** (CAGR), not outright.
7. Dashboard recent activity: also include **account activity** + a **source** column (portfolio/account).
8. Portfolio detail transactions: add an **Amount** column; allow **new transaction** creation (like accounts).
9. **Add holding** should create a portfolio transaction, prompting for date/type/qty/price/etc.

---

## Phase A — Shared icon/color taxonomy (items 1, 2, 3)

**New `lib/constants/activity-meta.ts`** (pure data — no React, safe for server code):

- `ActivityIconKey` union (e.g. `"buy" | "sell" | "dividend" | "interest" | "fee" | "transfer-in" | "transfer-out" | "split" | "bonus" | "return-of-capital" | "coupon" | "maturity" | "merge-in" | "merge-out" | "rights" | "adjustment" | "deposit" | "withdrawal" | "contribution" | "income" | "expense" | "investment" | "cash"`).
- `TRANSACTION_TYPE_META: Record<string, { label; colorVar; swatch; icon: ActivityIconKey }>` for every portfolio transaction type.
- `CATEGORY_KIND_META: Record<CategoryKind, { label; colorVar; swatch; icon }>` for cash-category kinds — **harmonised** colors/icons with the matching portfolio types (dividend↔Dividends, buy↔Purchase, interest↔Interest, fee↔Fees, transfer↔Transfer).

**New `components/ui/activity-icon.tsx`** (client): resolves `ActivityIconKey` → lucide component; props `{ icon; className }`. A central icon map keeps lucide out of server bundles.

**Apply:** transaction rows (portfolio detail), account transaction rows, dashboard recent activity, and any chart legends/tooltips that show a type → use the shared meta for icon + swatch. Update `lib/constants/categories.ts` default colors to match `CATEGORY_KIND_META`.

## Phase B — Annualised returns (item 6)

- Add `annualiseReturn(totalPct, days)` to `lib/calculations/performance.ts` (CAGR: `((1+r)^(365/days) − 1)`).
- In `lib/services/portfolio-cards.ts` and `lib/services/portfolio-detail.ts`, annualise the `y1/y3/y5/y10` period returns (1Y annualised ≡ total). Keep `m1/m6` as outright.
- UI: label long-period returns with **“p.a.”** on the dashboard, portfolio cards, and detail trailing returns.

## Phase C — Portfolio icon & color (items 4, 5)

- **Schema:** add `Portfolio.icon String?` and `Portfolio.color String?` (migration in Codespaces).
- **Defaults:** `lib/constants/portfolio-identity.ts` — `PORTFOLIO_ICONS` (curated lucide keys), `PORTFOLIO_COLORS` (Rosely swatches), `portfolioIdentity(p, index)` returning `{ icon, colorVar, swatch }` with a stable fallback when unset.
- **Validators:** extend `updatePortfolioSchema` with `icon`, `color`.
- **Edit UI:** icon grid + color swatch picker in the portfolio edit-details form (`components/forms/portfolio-actions.tsx` or its edit dialog).
- **Apply across pages/charts:** portfolio summary cards, consolidated card, dashboard per-portfolio series (performance/value/movement charts + treemap), portfolio summary table, and the recent-activity source — all keyed off the portfolio’s chosen color/icon instead of positional `holdingColor(index)` for the *portfolio* dimension.

## Phase D — Dashboard recent activity + source (item 7)

- Extend the dashboard feed to also load recent **cash account** transactions.
- Add a **Where** column (portfolio name w/ icon+color, or account name) to the recent-activity table; unify sort by date.

## Phase E — Portfolio transactions: Amount column + create (item 8)

- Add an **Amount** column (signed cash effect: −cost for buys, +proceeds for sells, +income, etc.) to the portfolio detail transactions list.
- Add a **New Transaction** creator mirroring the accounts UX (inline form / dialog) using `createTransaction`, with a holding/instrument selector.

## Phase F — Add holding → transaction with prompts (item 9)

- Convert the “Add holding” action into a flow that, after resolving the instrument, **prompts for the initial transaction** (date, type=BUY default, quantity, price, brokerage) and creates both the holding and its first transaction atomically.

---

## Sequencing & validation

Execute A → B → C → D → E → F. After each phase run `get_errors` on touched files. Schema/migration,
`prisma generate`, lint, and build run in Codespaces. No package installs expected.

## Out of scope / deferred

- Per-category custom icon override UI (kinds carry icons; per-row category icon optional later).
- Historical backfill of colors for existing data (defaults apply immediately).
- Treemap retains its own HSL hue scheme (mapping CSS-var colors → hues is out of scope).

---

## Status — COMPLETE

All phases A–F implemented and validated with `get_errors` (no errors):

- **A** — `lib/constants/activity-meta.ts`, `components/ui/activity-icon.tsx`; harmonised icons applied
  to portfolio transaction rows (`components/forms/transaction-row.tsx`) and account transaction rows
  (`components/accounts/account-detail-client.tsx`).
- **B** — `annualiseReturn()` in `lib/calculations/performance.ts`; y1/y3/y5/y10/max annualised in
  `portfolio-cards.ts` / `portfolio-detail.ts`; "p.a." labels in cards + detail page.
- **C** — `Portfolio.icon`/`Portfolio.color` (schema, **needs Codespaces migration**),
  `lib/constants/portfolio-identity.ts`, `components/ui/portfolio-icon.tsx`, edit picker in
  `portfolio-actions.tsx`, applied across summary card, detail header, dashboard per-portfolio series.
- **D** — dashboard recent activity now merges cash account transactions + "Where" source column.
- **E** — Amount column on portfolio detail + holding pages; `AddPortfolioTransaction` creator wired
  into the detail transactions section.
- **F** — `addHoldingWithTransaction()` action + rewritten add-holding page prompting for the opening
  transaction (type/date/qty/price/brokerage).

**Codespaces follow-up:** run `prisma migrate dev` + `prisma generate` for `Portfolio.icon`/`color`
(and the previously-added `User.dashboardModelId`), then `pnpm lint` + `pnpm build`.
