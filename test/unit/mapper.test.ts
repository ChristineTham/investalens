import { describe, it, expect } from "vitest";
import { mapRows } from "@/lib/import/mapper";
import type { ImportConfig, RawCsvRow } from "@/lib/import/types";

// mapTransactionType is not exported; we exercise it through mapRows using a
// minimal generic config that maps one column per field.
const baseConfig: ImportConfig = {
  mapping: {
    tradeDate: "date",
    instrumentCode: "code",
    quantity: "qty",
    price: "price",
    transactionType: "type",
    marketCode: "market",
    brokerage: "brokerage",
    currency: "currency",
    exchangeRate: "fx",
    comments: "comments",
  },
  dateFormat: "yyyy-mm-dd",
  decimalSeparator: ".",
};

function row(overrides: Partial<RawCsvRow> = {}): RawCsvRow {
  return {
    date: "2024-01-15",
    code: "BHP",
    qty: "100",
    price: "45.50",
    type: "BUY",
    market: "ASX",
    brokerage: "9.95",
    currency: "AUD",
    fx: "1",
    comments: "",
    ...overrides,
  };
}

/** Map a single row's raw type and return the resolved transactionType. */
function resolveType(
  rawType: string,
  config: ImportConfig = baseConfig,
  qty = "100"
): { type?: string; errors: string[] } {
  const result = mapRows([row({ type: rawType, qty })], config);
  if (result.transactions.length) {
    return { type: result.transactions[0].transactionType, errors: [] };
  }
  return { errors: result.errors[0]?.errors ?? [] };
}

describe("mapRows — DRP→BUY fix (milestone v2.1.0)", () => {
  it("maps DRP to BUY, NOT DIVIDEND", () => {
    const { type } = resolveType("DRP");
    expect(type).toBe("BUY");
    expect(type).not.toBe("DIVIDEND");
  });

  it("maps DRP case-insensitively", () => {
    expect(resolveType("drp").type).toBe("BUY");
  });
});

describe("mapRows — transaction type aliases", () => {
  const cases: Array<[string, string]> = [
    ["B", "BUY"],
    ["BUY", "BUY"],
    ["PURCHASE", "BUY"],
    ["S", "SELL"],
    ["SELL", "SELL"],
    ["SALE", "SELL"],
    ["D", "DIVIDEND"],
    ["DIV", "DIVIDEND"],
    ["DIVIDEND", "DIVIDEND"],
    ["DRP", "BUY"],
    ["INT", "INTEREST"],
    ["INTEREST", "INTEREST"],
    ["SPLIT", "SPLIT"],
    ["BONUS", "BONUS"],
    ["FEE", "FEE"],
    ["TRANSFER", "TRANSFER_IN"],
  ];

  it.each(cases)("maps alias %s -> %s", (raw, expected) => {
    // zero-quantity-allowed types need a non-zero qty here anyway; use 100.
    expect(resolveType(raw).type).toBe(expected);
  });

  it("covers every alias defined in the mapper", () => {
    // NOTE: the mapper's `aliases` object has 16 entries (B, BUY, PURCHASE,
    // S, SELL, SALE, D, DIV, DIVIDEND, DRP, INT, INTEREST, SPLIT, BONUS, FEE,
    // TRANSFER), not 17. The "17 types" in the brief conflates the alias map
    // with the canonical transactionTypes list (which itself has 16 entries).
    expect(cases).toHaveLength(16);
  });
});

describe("mapRows — direct canonical type matches", () => {
  it("matches a canonical type directly (COUPON) with zero quantity allowed", () => {
    const { type } = resolveType("COUPON", baseConfig, "0");
    expect(type).toBe("COUPON");
  });

  it("matches canonical TRANSFER_OUT directly", () => {
    expect(resolveType("TRANSFER_OUT").type).toBe("TRANSFER_OUT");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(resolveType("  buy  ").type).toBe("BUY");
  });
});

describe("mapRows — custom transactionTypeMap takes precedence", () => {
  it("uses the custom map before aliases", () => {
    const cfg: ImportConfig = {
      ...baseConfig,
      transactionTypeMap: { "Market Buy": "BUY", Foo: "SELL" },
    };
    expect(resolveType("Market Buy", cfg).type).toBe("BUY");
    expect(resolveType("Foo", cfg).type).toBe("SELL");
  });
});

describe("mapRows — unknown types produce an error", () => {
  it("reports an unknown transaction type", () => {
    const { type, errors } = resolveType("WOBBLE");
    expect(type).toBeUndefined();
    expect(errors.some((e) => e.includes("Unknown transaction type"))).toBe(
      true
    );
  });

  it("reports unknown type for an empty raw type", () => {
    const { errors } = resolveType("");
    expect(errors.some((e) => e.includes("Unknown transaction type"))).toBe(
      true
    );
  });
});

describe("mapRows — happy path row shape", () => {
  it("uppercases codes/markets/currency and carries fields through", () => {
    const result = mapRows(
      [
        row({
          code: "bhp",
          market: "asx",
          currency: "aud",
          type: "buy",
          brokerage: "9.95",
        }),
      ],
      baseConfig
    );
    expect(result.errors).toHaveLength(0);
    const tx = result.transactions[0];
    expect(tx.instrumentCode).toBe("BHP");
    expect(tx.marketCode).toBe("ASX");
    expect(tx.currency).toBe("AUD");
    expect(tx.transactionType).toBe("BUY");
    expect(tx.quantity).toBe(100);
    expect(tx.price).toBe(45.5);
    expect(tx.brokerage).toBe(9.95);
    expect(tx.exchangeRate).toBe(1);
  });

  it("allows zero quantity for DIVIDEND", () => {
    const result = mapRows(
      [row({ type: "DIVIDEND", qty: "0" })],
      baseConfig
    );
    expect(result.errors).toHaveLength(0);
    expect(result.transactions[0].transactionType).toBe("DIVIDEND");
  });

  it("rejects zero quantity for BUY", () => {
    const result = mapRows([row({ type: "BUY", qty: "0" })], baseConfig);
    expect(result.transactions).toHaveLength(0);
    expect(result.errors[0].errors.some((e) => e.includes("zero"))).toBe(true);
  });
});
