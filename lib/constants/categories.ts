/** Default (system) cash categories seeded per user on first use. */
export interface DefaultCategory {
  name: string;
  kind: string;
  color: string;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // ── Income ──────────────────────────────────────────────────────────────────
  { name: "Dividends", kind: "income", color: "var(--rosely7)" },
  { name: "Distributions", kind: "income", color: "var(--rosely13)" },
  { name: "Interest", kind: "interest", color: "var(--rosely14)" },
  { name: "Salary", kind: "income", color: "var(--rosely6)" },

  // ── Portfolio / Investment ───────────────────────────────────────────────────
  { name: "Purchase", kind: "investment", color: "var(--rosely8)" },
  { name: "Sale", kind: "investment", color: "var(--rosely8)" },
  { name: "Dividend Reinvestment", kind: "investment", color: "var(--rosely7)" },

  // ── Contributions (SMSF) ─────────────────────────────────────────────────────
  { name: "Concessional Contribution", kind: "contribution", color: "var(--rosely5)" },
  { name: "Non-Concessional Contribution", kind: "contribution", color: "var(--rosely5)" },
  { name: "Rollover", kind: "contribution", color: "var(--rosely3)" },

  // ── Fees & Charges ───────────────────────────────────────────────────────────
  { name: "Accounting Fee", kind: "fee", color: "var(--rosely11)" },
  { name: "Audit Fee", kind: "fee", color: "var(--rosely11)" },
  { name: "ASIC Fee", kind: "fee", color: "var(--rosely11)" },
  { name: "Bank Fees", kind: "fee", color: "var(--rosely11)" },
  { name: "Management Fee", kind: "fee", color: "var(--rosely11)" },

  // ── Transfers ────────────────────────────────────────────────────────────────
  { name: "Transfer In", kind: "transfer", color: "var(--rosely2)" },
  { name: "Transfer Out", kind: "transfer", color: "var(--rosely2)" },

  // ── General Expenses ─────────────────────────────────────────────────────────
  { name: "Insurance", kind: "expense", color: "var(--rosely1)" },
  { name: "Other", kind: "expense", color: "var(--rosely4)" },
];
