/** Shared types and helpers for bank-statement (OFX / QIF / CSV) imports. */

export interface BankStatementTransaction {
  date: Date;
  /** Signed: positive = money in, negative = money out. */
  amount: number;
  /** Canonical cash transaction type. */
  type: string;
  description: string;
  /** OFX Financial Institution Transaction ID (stable, for idempotent dedup). */
  fitId?: string;
}

export interface BankStatementParseResult {
  transactions: BankStatementTransaction[];
  account?: { bankId?: string; acctId?: string; currency?: string };
}

/**
 * Canonical types that increase the balance. Keep in sync with
 * {@link import("@/lib/services/accounts").CREDIT_TYPES}.
 */
export const CREDIT_TYPES = new Set([
  "deposit",
  "interest",
  "dividend_received",
  "transfer_in",
  "sell_settlement",
]);

/** Stable content hash for non-OFX rows (no FITID). */
export function importHash(
  date: Date,
  amount: number,
  type: string,
  description: string
): string {
  const d = date.toISOString().split("T")[0];
  return `${d}|${amount.toFixed(2)}|${type}|${description.trim().toLowerCase()}`;
}

/** Map an OFX TRNTYPE (+ signed amount) to a canonical cash type. */
export function canonicalOfxType(
  trnType: string | undefined,
  signed: number
): string {
  const t = (trnType || "").toUpperCase();
  if (t === "INT") return "interest";
  if (t === "DIV") return "dividend_received";
  if (t === "FEE" || t === "SRVCHG") return "fee";
  if (t === "XFER") return signed >= 0 ? "transfer_in" : "transfer_out";
  if (["DEP", "DIRECTDEP", "CREDIT"].includes(t)) return "deposit";
  if (["DEBIT", "PAYMENT", "POS", "ATM", "CHECK", "DIRECTDEBIT"].includes(t))
    return "withdrawal";
  return signed >= 0 ? "deposit" : "withdrawal";
}
