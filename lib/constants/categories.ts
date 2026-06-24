/** Default (system) cash categories seeded per user on first use. */
export interface DefaultCategory {
  name: string;
  kind: string;
  color: string;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: "Salary", kind: "income", color: "var(--rosely14)" },
  { name: "Dividends", kind: "income", color: "var(--rosely7)" },
  { name: "Interest", kind: "interest", color: "var(--rosely13)" },
  { name: "Investment", kind: "investment", color: "var(--rosely8)" },
  { name: "Transfer", kind: "transfer", color: "var(--rosely3)" },
  { name: "Bank Fees", kind: "fee", color: "var(--rosely11)" },
  { name: "Groceries", kind: "expense", color: "var(--rosely2)" },
  { name: "Utilities", kind: "expense", color: "var(--rosely9)" },
  { name: "Housing", kind: "expense", color: "var(--rosely10)" },
  { name: "Transport", kind: "expense", color: "var(--rosely12)" },
  { name: "Dining", kind: "expense", color: "var(--rosely15)" },
  { name: "Shopping", kind: "expense", color: "var(--rosely5)" },
  { name: "Health", kind: "expense", color: "var(--rosely4)" },
  { name: "Insurance", kind: "expense", color: "var(--rosely1)" },
  { name: "Other", kind: "expense", color: "var(--rosely3)" },
];
