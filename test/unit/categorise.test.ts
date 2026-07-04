import { describe, it, expect } from "vitest";
import {
  suggestCategoryId,
  normaliseNarrative,
} from "@/lib/import/categorise";

// A category catalogue keyed by the names the rules reference. Each id is
// arbitrary but stable so we can assert the resolved id.
const categories = [
  { id: "cat-groceries", name: "Groceries" },
  { id: "cat-transport", name: "Transport" },
  { id: "cat-dining", name: "Dining" },
  { id: "cat-utilities", name: "Utilities" },
  { id: "cat-housing", name: "Housing" },
  { id: "cat-insurance", name: "Insurance" },
  { id: "cat-health", name: "Health" },
  { id: "cat-shopping", name: "Shopping" },
  { id: "cat-salary", name: "Salary" },
  { id: "cat-interest", name: "Interest" },
  { id: "cat-dividends", name: "Dividends" },
  { id: "cat-distributions", name: "Distributions" },
  { id: "cat-bank-fees", name: "Bank Fees" },
  { id: "cat-transfer-in", name: "Transfer In" },
  { id: "cat-transfer-out", name: "Transfer Out" },
  { id: "cat-purchase", name: "Purchase" },
  { id: "cat-sale", name: "Sale" },
];

describe("suggestCategoryId — keyword rules", () => {
  it("matches groceries by merchant keyword (Woolworths)", () => {
    expect(suggestCategoryId("WOOLWORTHS 1234 SYDNEY", "", categories)).toBe(
      "cat-groceries"
    );
  });

  it("matches transport by keyword (uber)", () => {
    expect(suggestCategoryId("Uber trip", "", categories)).toBe("cat-transport");
  });

  it("matches dividends by keyword", () => {
    expect(suggestCategoryId("BHP dividend payment", "", categories)).toBe(
      "cat-dividends"
    );
  });

  it("is case-insensitive on the description", () => {
    expect(suggestCategoryId("coles express", "", categories)).toBe(
      "cat-groceries"
    );
  });

  it("returns the first matching rule when multiple could apply", () => {
    // "woolworths" (Groceries) appears before Transport rules in RULES order.
    expect(suggestCategoryId("woolworths petrol", "", categories)).toBe(
      "cat-groceries"
    );
  });
});

describe("suggestCategoryId — type fallback", () => {
  it("falls back to TYPE_CATEGORY when no keyword matches", () => {
    expect(suggestCategoryId("mystery narrative", "interest", categories)).toBe(
      "cat-interest"
    );
  });

  it("maps fee type to Bank Fees", () => {
    expect(suggestCategoryId("some charge", "fee", categories)).toBe(
      "cat-bank-fees"
    );
  });

  it("maps buy_settlement type to Purchase", () => {
    expect(suggestCategoryId("xyz", "buy_settlement", categories)).toBe(
      "cat-purchase"
    );
  });

  it("prefers keyword match over type fallback", () => {
    // description matches Dividends, type would map to Interest — keyword wins.
    expect(
      suggestCategoryId("franked dividend", "interest", categories)
    ).toBe("cat-dividends");
  });
});

describe("suggestCategoryId — no match", () => {
  it("returns null when nothing matches", () => {
    expect(suggestCategoryId("random text", "", categories)).toBeNull();
  });

  it("returns null when the matched category is absent from the catalogue", () => {
    // Keyword matches "Groceries" but that category isn't provided.
    expect(suggestCategoryId("woolworths", "", [{ id: "x", name: "Other" }])).toBe(
      null
    );
  });

  it("returns null for an unknown type with no keyword match", () => {
    expect(suggestCategoryId("nothing", "unknown_type", categories)).toBeNull();
  });
});

describe("normaliseNarrative", () => {
  it("lower-cases, strips digits and punctuation, collapses whitespace", () => {
    expect(normaliseNarrative("WOOLWORTHS 1234 SYDNEY")).toBe(
      "woolworths sydney"
    );
  });

  it("collapses two differing store references to one merchant key", () => {
    expect(normaliseNarrative("WOOLWORTHS 1234 SYDNEY")).toBe(
      normaliseNarrative("WOOLWORTHS 5678 PERTH").replace("perth", "sydney")
    );
    // More direct: strip the store/city and they share the merchant token.
    expect(normaliseNarrative("WOOLWORTHS 1234")).toBe("woolworths");
    expect(normaliseNarrative("WOOLWORTHS 5678")).toBe("woolworths");
  });

  it("handles null / undefined safely", () => {
    expect(normaliseNarrative(null)).toBe("");
    expect(normaliseNarrative(undefined)).toBe("");
  });

  it("strips punctuation like hyphens and ampersands", () => {
    expect(normaliseNarrative("Uber-Eats & Co.")).toBe("uber eats co");
  });
});
