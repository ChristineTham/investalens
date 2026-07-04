import { describe, it, expect } from "vitest";
import {
  importTemplates,
  getTemplate,
  listBrokerTemplates,
  brokerTemplates,
} from "@/lib/import/templates";

// Known broker (transaction/bond) templates that must stay registered.
const KNOWN_BROKERS = [
  "commsec",
  "selfwealth",
  "stake",
  "cmc_markets",
  "cmc_invest",
  "bell_direct",
  "nabtrade",
  "interactive_brokers",
  "fiig",
] as const;

describe("importTemplates registry — broker coverage", () => {
  it("includes every known broker id", () => {
    const ids = new Set(importTemplates.map((t) => t.id));
    for (const broker of KNOWN_BROKERS) {
      expect(ids.has(broker)).toBe(true);
    }
  });

  it("registers cmc_markets specifically (milestone registration fix)", () => {
    expect(importTemplates.some((t) => t.id === "cmc_markets")).toBe(true);
  });

  it("registers cmc_invest specifically", () => {
    expect(importTemplates.some((t) => t.id === "cmc_invest")).toBe(true);
  });
});

describe("getTemplate", () => {
  it("resolves cmc_markets via getTemplate", () => {
    const t = getTemplate("cmc_markets");
    expect(t).not.toBeNull();
    expect(t?.id).toBe("cmc_markets");
    expect(t?.name).toBe("CMC Markets");
    expect(t?.category).toBe("transactions");
    expect(t?.config).toBe(brokerTemplates.cmc_markets);
  });

  it("resolves cmc_invest via getTemplate", () => {
    const t = getTemplate("cmc_invest");
    expect(t?.id).toBe("cmc_invest");
    expect(t?.config).toBe(brokerTemplates.cmc_invest);
  });

  it("returns null for an unknown id", () => {
    expect(getTemplate("does_not_exist")).toBeNull();
  });
});

describe("listBrokerTemplates", () => {
  it("returns all known brokers and excludes cash templates", () => {
    const list = listBrokerTemplates();
    const ids = new Set(list.map((t) => t.id));
    for (const broker of KNOWN_BROKERS) {
      expect(ids.has(broker)).toBe(true);
    }
    // Cash templates must NOT be in the broker list.
    expect(ids.has("commbank")).toBe(false);
    expect(ids.has("generic_bank")).toBe(false);
  });

  it("returns {id, name} entries", () => {
    const list = listBrokerTemplates();
    for (const entry of list) {
      expect(typeof entry.id).toBe("string");
      expect(typeof entry.name).toBe("string");
    }
  });
});

describe("registered template shape", () => {
  it("every template has a stable base shape", () => {
    for (const t of importTemplates) {
      expect(typeof t.id).toBe("string");
      expect(t.id.length).toBeGreaterThan(0);
      expect(typeof t.name).toBe("string");
      expect(["transactions", "bonds", "cash"]).toContain(t.category);
      // Non-cash templates carry a transaction ImportConfig; cash carry cashConfig.
      if (t.category === "cash") {
        expect(t.cashConfig).toBeDefined();
      } else {
        expect(t.config).toBeDefined();
        expect(t.config?.mapping).toBeDefined();
        expect(typeof t.config?.dateFormat).toBe("string");
        expect(typeof t.config?.decimalSeparator).toBe("string");
      }
    }
  });

  it("each known broker template has the required transaction mapping fields", () => {
    for (const broker of KNOWN_BROKERS) {
      const cfg = brokerTemplates[broker];
      expect(cfg, `${broker} config`).toBeDefined();
      expect(cfg.mapping.tradeDate, `${broker}.tradeDate`).toBeTruthy();
      expect(cfg.mapping.instrumentCode, `${broker}.instrumentCode`).toBeTruthy();
      expect(cfg.mapping.quantity, `${broker}.quantity`).toBeTruthy();
      expect(cfg.mapping.price, `${broker}.price`).toBeTruthy();
      expect(cfg.mapping.transactionType, `${broker}.transactionType`).toBeTruthy();
    }
  });
});
