import { describe, it, expect } from "vitest";
import {
  optimiseSaleAllocation,
  ALLOCATION_METHODS,
} from "@/lib/reports/tax/cgt-parcel-matcher";
import type { TransactionData } from "@/lib/calculations/performance";
import type { CpiMap } from "@/lib/calculations/indexation";

let idSeq = 0;
function tx(
  transactionType: string,
  tradeDate: string,
  quantity: number,
  price: number,
  brokerage = 0
): TransactionData {
  return {
    id: `tx-${idSeq++}`,
    transactionType,
    tradeDate: new Date(tradeDate),
    quantity,
    price,
    brokerage,
    exchangeRate: 1,
    currency: "AUD",
  };
}

describe("optimiseSaleAllocation", () => {
  // Three parcels, all long-term at the sale date:
  //   A: 2018-01-01 100 @ $10 (cheapest)
  //   B: 2019-01-01 100 @ $30 (dearest)
  //   C: 2020-01-01 100 @ $20
  function txs(): TransactionData[] {
    return [
      tx("BUY", "2018-01-01", 100, 10, 0),
      tx("BUY", "2019-01-01", 100, 30, 0),
      tx("BUY", "2020-01-01", 100, 20, 0),
    ];
  }
  const saleDate = new Date("2022-01-01");

  it("returns one result per allocation method", () => {
    const results = optimiseSaleAllocation(
      txs(),
      saleDate,
      50,
      40,
      0,
      "individual"
    );
    expect(results).toHaveLength(ALLOCATION_METHODS.length);
    const methods = results.map((r) => r.method).sort();
    expect(methods).toEqual([...ALLOCATION_METHODS].sort());
  });

  it("sorts by lowest assessable gain first (minimum-assessable ranked top)", () => {
    const results = optimiseSaleAllocation(
      txs(),
      saleDate,
      50,
      40,
      0,
      "individual"
    );
    for (let i = 1; i < results.length; i++) {
      expect(results[i].totalAssessable).toBeGreaterThanOrEqual(
        results[i - 1].totalAssessable
      );
    }
  });

  it("the top-ranked method is the minimum-gain (dearest-parcel) allocation", () => {
    // Selling 50 units. Dearest parcel B ($30) minimises the gain and thus the
    // assessable amount when all parcels share the same discount eligibility.
    const results = optimiseSaleAllocation(
      txs(),
      saleDate,
      50,
      40,
      0,
      "individual"
    );
    const best = results[0];
    // Best assessable = min over methods.
    const minAssessable = Math.min(...results.map((r) => r.totalAssessable));
    expect(best.totalAssessable).toBeCloseTo(minAssessable, 6);
    // min_gain picks the $30 parcel: gain (40-30)*50 = 500; discount 250.
    expect(best.totalAssessable).toBeCloseTo(250, 6);
    expect(["min_gain", "min_tax"]).toContain(best.method);
  });

  it("prior disposals are consumed per method so parcels aren't double-counted", () => {
    // BUY 100 @ $10, then SELL 100 (drains everything). A later sale of 50
    // must find nothing to allocate.
    const history: TransactionData[] = [
      tx("BUY", "2018-01-01", 100, 10, 0),
      tx("SELL", "2019-01-01", 100, 12, 0),
    ];
    const results = optimiseSaleAllocation(
      history,
      saleDate,
      50,
      40,
      0,
      "individual"
    );
    for (const r of results) {
      expect(r.results).toHaveLength(0);
      expect(r.totalGain).toBe(0);
      expect(r.totalAssessable).toBe(0);
    }
  });

  it("passes CPI through so indexation can lower the assessable gain", () => {
    // Pre-cutoff single parcel; indexation drives the gain to zero.
    const cpi: CpiMap = new Map([
      ["1998-Q1", 100],
      ["1999-Q3", 130],
    ]);
    const history = [tx("BUY", "1998-03-15", 100, 10, 0)];
    const results = optimiseSaleAllocation(
      history,
      new Date("2005-01-01"),
      100,
      12, // proceeds 1200; indexed CB 1300 → indexation gain 0
      0,
      "individual",
      cpi
    );
    // Every method (single parcel) should land on assessable 0 via indexation.
    for (const r of results) {
      expect(r.totalAssessable).toBeCloseTo(0, 6);
    }
  });
});
