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
  { category: "Interest", keywords: ["interest paid", "interest earned"] },
  { category: "Dividends", keywords: ["dividend"] },
  { category: "Distributions", keywords: ["distribution", "bsub dst", "dst "] },
  // ── SMSF contributions ──────────────────────────────────────────────────────
  { category: "Concessional Contribution", keywords: ["superchoice", "sgc", "employer contribution", " concessional"] },
  { category: "Non-Concessional Contribution", keywords: ["non concessional", "nonconcess", "non-concess", "non-concessional", "member contribution"] },
  { category: "Rollover", keywords: ["mercer", "plum superannu", "msf plum", "rollover", "mcrss"] },
  // ── Fees ────────────────────────────────────────────────────────────────────
  { category: "Accounting Fee", keywords: ["icare", "asic", "audit", "accountant", "accounting"] },
  { category: "Management Fee", keywords: ["management fee", "admin fee", "platform fee"] },
  { category: "Bank Fees", keywords: ["account keeping", "service charge"] },
  // ── Portfolio settlements ────────────────────────────────────────────────────
  { category: "Purchase", keywords: ["buy settlement", "mot cnt", "bd cnt", " buy "] },
  { category: "Sale", keywords: ["sell settlement", "sale settlement"] },
  // ── Transfers ───────────────────────────────────────────────────────────────
  { category: "Transfer In", keywords: ["transfer in", "from cwk", "from smsf"] },
  { category: "Transfer Out", keywords: ["transfer out", "to cwk", "to smsf"] },
];

/** Type-driven category fallbacks (canonical cash type → category name). */
const TYPE_CATEGORY: Record<string, string> = {
  interest: "Interest",
  fee: "Bank Fees",
  accounting_fee: "Accounting Fee",
  dividend_received: "Dividends",
  distribution: "Distributions",
  contribution: "Concessional Contribution",
  transfer_in: "Transfer In",
  transfer_out: "Transfer Out",
  buy_settlement: "Purchase",
  sell_settlement: "Sale",
};

/**
 * Normalise a transaction narrative into a stable key for carry-forward
 * categorisation: lower-cased, with digits and punctuation stripped so that
 * "WOOLWORTHS 1234 SYDNEY" and "WOOLWORTHS 5678 PERTH" collapse to one merchant.
 */
export function normaliseNarrative(description: string | null | undefined): string {
  return (description || "")
    .toLowerCase()
    .replace(/[0-9]+/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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
