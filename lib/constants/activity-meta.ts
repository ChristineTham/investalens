/**
 * Shared, harmonised icon + colour taxonomy for activity rows.
 *
 * Pure data (no React) so it is safe to import from server code. Portfolio
 * transaction types and cash-account category kinds are mapped to the SAME
 * semantic colour family (and matching icons where they mean the same thing),
 * so a dividend looks the same whether it appears as a portfolio transaction or
 * a categorised cash transaction.
 *
 * Render an icon with `<ActivityIcon icon={meta.icon} />`
 * (components/ui/activity-icon.tsx), and a colour swatch with `meta.swatch`.
 */

export type ActivityIconKey =
  | "buy"
  | "sell"
  | "dividend"
  | "distribution"
  | "interest"
  | "coupon"
  | "fee"
  | "split"
  | "bonus"
  | "return-of-capital"
  | "transfer-in"
  | "transfer-out"
  | "merger-in"
  | "merger-out"
  | "rights"
  | "maturity"
  | "adjustment"
  | "deposit"
  | "withdrawal"
  | "contribution"
  | "income"
  | "expense"
  | "investment"
  | "cash";

export interface ActivityMeta {
  label: string;
  /** CSS variable reference, e.g. `var(--rosely7)`. */
  colorVar: string;
  /** Tailwind background class, e.g. `bg-[var(--rosely7)]`. */
  swatch: string;
  icon: ActivityIconKey;
}

// ── Semantic colour families (shared by transactions and categories) ──────────
const C = {
  income: "var(--rosely7)",
  interest: "var(--rosely14)",
  investment: "var(--rosely8)",
  fee: "var(--rosely11)",
  transfer: "var(--rosely2)",
  contribution: "var(--rosely5)",
  expense: "var(--rosely4)",
  corporate: "var(--rosely13)",
  neutral: "var(--rosely3)",
} as const;

const swatch = (v: string) => `bg-[${v}]`;
const meta = (
  label: string,
  colorVar: string,
  icon: ActivityIconKey
): ActivityMeta => ({ label, colorVar, swatch: swatch(colorVar), icon });

// ── Portfolio transaction types ───────────────────────────────────────────────

export const TRANSACTION_TYPE_META: Record<string, ActivityMeta> = {
  BUY: meta("Buy", C.investment, "buy"),
  SELL: meta("Sell", C.investment, "sell"),
  DIVIDEND: meta("Dividend", C.income, "dividend"),
  DISTRIBUTION: meta("Distribution", C.income, "distribution"),
  INTEREST: meta("Interest", C.interest, "interest"),
  COUPON: meta("Coupon", C.interest, "coupon"),
  MATURITY: meta("Maturity", C.corporate, "maturity"),
  FEE: meta("Fee", C.fee, "fee"),
  SPLIT: meta("Split", C.corporate, "split"),
  BONUS: meta("Bonus", C.corporate, "bonus"),
  RETURN_OF_CAPITAL: meta("Return of Capital", C.corporate, "return-of-capital"),
  TRANSFER_IN: meta("Transfer In", C.transfer, "transfer-in"),
  TRANSFER_OUT: meta("Transfer Out", C.transfer, "transfer-out"),
  MERGER_IN: meta("Merger In", C.corporate, "merger-in"),
  MERGER_OUT: meta("Merger Out", C.corporate, "merger-out"),
  RIGHTS_ISSUE: meta("Rights Issue", C.corporate, "rights"),
  ADJUSTMENT: meta("Adjustment", C.neutral, "adjustment"),
};

const FALLBACK_TX = meta("Transaction", C.neutral, "adjustment");

export function transactionMeta(type: string): ActivityMeta {
  return TRANSACTION_TYPE_META[type] ?? FALLBACK_TX;
}

// ── Cash-account category kinds (harmonised with the above) ────────────────────

export type CategoryKind =
  | "income"
  | "expense"
  | "transfer"
  | "investment"
  | "fee"
  | "interest"
  | "contribution";

export const CATEGORY_KIND_META: Record<CategoryKind, ActivityMeta> = {
  income: meta("Income", C.income, "income"),
  interest: meta("Interest", C.interest, "interest"),
  investment: meta("Investment", C.investment, "investment"),
  fee: meta("Fee", C.fee, "fee"),
  transfer: meta("Transfer", C.transfer, "transfer-in"),
  contribution: meta("Contribution", C.contribution, "contribution"),
  expense: meta("Expense", C.expense, "expense"),
};

export function categoryKindMeta(kind: string): ActivityMeta {
  return CATEGORY_KIND_META[kind as CategoryKind] ?? CATEGORY_KIND_META.expense;
}

// ── Cash transaction types (account rows) ──────────────────────────────────────

export const CASH_TYPE_META: Record<string, ActivityMeta> = {
  deposit: meta("Deposit", C.income, "deposit"),
  withdrawal: meta("Withdrawal", C.expense, "withdrawal"),
  interest: meta("Interest", C.interest, "interest"),
  fee: meta("Fee", C.fee, "fee"),
  transfer_in: meta("Transfer In", C.transfer, "transfer-in"),
  transfer_out: meta("Transfer Out", C.transfer, "transfer-out"),
  dividend_received: meta("Dividend", C.income, "dividend"),
  distribution: meta("Distribution", C.income, "distribution"),
  contribution: meta("Contribution", C.contribution, "contribution"),
  accounting_fee: meta("Accounting Fee", C.fee, "fee"),
  buy_settlement: meta("Buy Settlement", C.investment, "buy"),
  sell_settlement: meta("Sell Settlement", C.investment, "sell"),
  other: meta("Other", C.neutral, "adjustment"),
};

export function cashTypeMeta(type: string): ActivityMeta {
  return CASH_TYPE_META[type] ?? CASH_TYPE_META.other;
}
