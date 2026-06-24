/** Rule-based auto-categorisation for imported cash transactions. */

interface CategoryRef {
  id: string;
  name: string;
}

interface Rule {
  category: string; // category name (matched case-insensitively)
  keywords: string[];
}

const RULES: Rule[] = [
  { category: "Groceries", keywords: ["woolworths", "coles", "aldi", "iga", "grocer", "foodland"] },
  { category: "Transport", keywords: ["uber", "didi", "taxi", "opal", "myki", "go card", "fuel", "petrol", "bp", "caltex", "shell", "ampol", "7-eleven", "linkt", "transurban"] },
  { category: "Dining", keywords: ["restaurant", "cafe", "coffee", "mcdonald", "kfc", "hungry jack", "dining", "uber eats", "doordash", "menulog", "bar "] },
  { category: "Utilities", keywords: ["electricity", "water", "gas bill", "internet", "telstra", "optus", "vodafone", "agl", "origin energy", "utility", "nbn"] },
  { category: "Housing", keywords: ["rent", "mortgage", "home loan", "real estate", "strata"] },
  { category: "Insurance", keywords: ["insurance", "nrma", "aami", "bupa", "medibank", "allianz", "qbe"] },
  { category: "Health", keywords: ["pharmacy", "chemist", "medical", "doctor", "dental", "physio", "hospital", "health"] },
  { category: "Shopping", keywords: ["amazon", "ebay", "kmart", "target", "big w", "bunnings", "jb hi-fi", "officeworks"] },
  { category: "Salary", keywords: ["salary", "payroll", "wage", "pay - "] },
  { category: "Interest", keywords: ["interest"] },
  { category: "Dividends", keywords: ["dividend"] },
  { category: "Bank Fees", keywords: ["fee", "service charge", "account keeping"] },
  { category: "Transfer", keywords: ["transfer", "osko", "payid", "bpay"] },
];

/** Type-driven category fallbacks (canonical cash type → category name). */
const TYPE_CATEGORY: Record<string, string> = {
  interest: "Interest",
  fee: "Bank Fees",
  dividend_received: "Dividends",
  transfer_in: "Transfer",
  transfer_out: "Transfer",
};

/**
 * Suggest a category id for a transaction by matching its description against
 * keyword rules, then falling back to its canonical type.
 */
export function suggestCategoryId(
  description: string,
  type: string,
  categories: CategoryRef[]
): string | null {
  const byName = (name: string) =>
    categories.find((c) => c.name.toLowerCase() === name.toLowerCase())?.id ??
    null;

  const desc = (description || "").toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => desc.includes(k))) {
      const id = byName(rule.category);
      if (id) return id;
    }
  }
  if (TYPE_CATEGORY[type]) return byName(TYPE_CATEGORY[type]);
  return null;
}
