import { describe, it, expect } from "vitest";
import {
  cgtDiscountRate,
  assessableUnder2027,
  minimumTaxTopUp,
  applyLossOrdering,
  type Cgt2027Input,
} from "@/lib/calculations/cgt-2027";
import type { CpiMap } from "@/lib/calculations/indexation";

describe("cgtDiscountRate — the three entity rates", () => {
  it.each<[string, number]>([
    ["individual", 0.5],
    ["trust", 0.5],
    ["smsf", 1 / 3],
    ["company", 0],
    ["other", 0],
  ])("entity %s → %d", (entity, rate) => {
    expect(cgtDiscountRate(entity, false)).toBeCloseTo(rate, 6);
  });

  it("foreign residents get no discount regardless of entity", () => {
    expect(cgtDiscountRate("individual", true)).toBe(0);
    expect(cgtDiscountRate("smsf", true)).toBe(0);
  });
});

describe("assessableUnder2027 — projection cases", () => {
  it("fully post-2027 asset indexes the cost base, no discount", () => {
    // Acquired 2028, disposed 2035. Base date = acquisition (2028-Q3).
    const cpi: CpiMap = new Map([
      ["2028-Q3", 200],
      ["2035-Q1", 260], // factor 1.30
    ]);
    const input: Cgt2027Input = {
      acquisitionDate: new Date("2028-08-01"),
      disposalDate: new Date("2035-02-15"),
      costBase: 1000,
      proceeds: 3000,
      taxEntityType: "individual",
      cpi,
    };
    const r = assessableUnder2027(input);
    expect(r.isStraddle).toBe(false);
    expect(r.methodUsed).toBe("none");
    expect(r.postIndexationFactor).toBeCloseTo(1.3, 6);
    // indexed CB = 1000 * 1.3 = 1300; assessable = 3000 - 1300 = 1700.
    expect(r.postIndexedCostBase).toBeCloseTo(1300, 6);
    expect(r.postAssessable).toBeCloseTo(1700, 6);
    expect(r.totalAssessable).toBeCloseTo(1700, 6);
    expect(r.preAssessable).toBe(0);
  });

  it("straddle asset via apportionment splits the gain by days held", () => {
    // Acquired 1 Jul 2017, disposed 1 Jul 2037 → 10y pre, 10y post (roughly).
    // Use round dates: 2017-07-01 to 2027-07-01 = 3652 days; total to
    // 2037-07-01 = 7305 days. preFraction ≈ 0.4999.
    const cpi: CpiMap = new Map([
      ["2027-Q3", 100],
      ["2037-Q3", 100], // no indexation growth → factor 1
    ]);
    const input: Cgt2027Input = {
      acquisitionDate: new Date("2017-07-01"),
      disposalDate: new Date("2037-07-01"),
      costBase: 1000,
      proceeds: 3000, // total gain 2000
      taxEntityType: "individual",
      transitionMethod: "apportionment",
      cpi,
    };
    const r = assessableUnder2027(input);
    expect(r.isStraddle).toBe(true);
    expect(r.methodUsed).toBe("apportionment");
    // ~half the 2000 gain assigned pre; pre is held >12m at 2027 so 50% discount.
    expect(r.preGrossGain).toBeGreaterThan(900);
    expect(r.preGrossGain).toBeLessThan(1100);
    expect(r.preAssessable).toBeCloseTo(r.preGrossGain * 0.5, 6);
    // post base = costBase + preGrossGain; post gross = proceeds - postBase.
    expect(r.postBaseCostBase).toBeCloseTo(1000 + r.preGrossGain, 6);
    expect(r.totalAssessable).toBeCloseTo(r.preAssessable + r.postAssessable, 6);
  });

  it("straddle asset via market_value sets the pre-gain to MV minus cost base", () => {
    const cpi: CpiMap = new Map([
      ["2027-Q3", 100],
      ["2035-Q1", 100],
    ]);
    const input: Cgt2027Input = {
      acquisitionDate: new Date("2015-01-01"),
      disposalDate: new Date("2035-02-15"),
      costBase: 1000,
      proceeds: 4000,
      taxEntityType: "individual",
      marketValueAt2027: 2500,
      transitionMethod: "market_value",
      cpi,
    };
    const r = assessableUnder2027(input);
    expect(r.methodUsed).toBe("market_value");
    expect(r.preGrossGain).toBeCloseTo(1500, 6); // 2500 - 1000
    expect(r.preAssessable).toBeCloseTo(750, 6); // 50% discount, held >12m
    expect(r.postBaseCostBase).toBeCloseTo(2500, 6);
    expect(r.postGrossGain).toBeCloseTo(1500, 6); // 4000 - 2500
    expect(r.postAssessable).toBeCloseTo(1500, 6); // factor 1
    expect(r.totalAssessable).toBeCloseTo(2250, 6);
  });

  it("pre-CGT asset (pre 20 Sep 1985) exempts pre-2027 growth, resets base to MV", () => {
    const cpi: CpiMap = new Map([
      ["2027-Q3", 100],
      ["2035-Q1", 100],
    ]);
    const input: Cgt2027Input = {
      acquisitionDate: new Date("1980-01-01"),
      disposalDate: new Date("2035-02-15"),
      costBase: 500,
      proceeds: 5000,
      taxEntityType: "individual",
      marketValueAt2027: 3000,
      cpi,
    };
    const r = assessableUnder2027(input);
    expect(r.isPreCgt).toBe(true);
    expect(r.preGrossGain).toBe(0);
    expect(r.preAssessable).toBe(0);
    expect(r.postBaseCostBase).toBeCloseTo(3000, 6);
    expect(r.postAssessable).toBeCloseTo(2000, 6); // 5000 - 3000
    expect(r.totalAssessable).toBeCloseTo(2000, 6);
  });
});

describe("minimumTaxTopUp — 30% minimum tax", () => {
  it("tops up when the marginal rate is below 30%", () => {
    // gain 1000, marginal 20% → top-up (0.3 - 0.2) * 1000 = 100.
    expect(minimumTaxTopUp(1000, 0.2)).toBeCloseTo(100, 6);
  });

  it("no top-up when marginal rate is at/above 30%", () => {
    expect(minimumTaxTopUp(1000, 0.3)).toBe(0);
    expect(minimumTaxTopUp(1000, 0.45)).toBe(0);
  });

  it("income support recipients are exempt", () => {
    expect(minimumTaxTopUp(1000, 0.1, true)).toBe(0);
  });

  it("no top-up on a nil/negative gain", () => {
    expect(minimumTaxTopUp(0, 0.1)).toBe(0);
    expect(minimumTaxTopUp(-500, 0.1)).toBe(0);
  });
});

describe("applyLossOrdering — prescribed loss ordering", () => {
  it("absorbs losses against discount gains first, then non-discount, then indexed", () => {
    const r = applyLossOrdering({
      discountGains: 1000,
      nonDiscountGains: 500,
      indexedGains: 800,
      losses: 1200,
      discountRate: 0.5,
    });
    // 1200 loss: 1000 kills discount pool, 200 kills part of non-discount.
    // remainingDiscount 0; remainingNonDiscount 300; remainingIndexed 800.
    expect(r.preAssessable).toBeCloseTo(300, 6); // 0*0.5 + 300
    expect(r.postAssessable).toBeCloseTo(800, 6);
    expect(r.totalAssessable).toBeCloseTo(1100, 6);
    expect(r.lossesApplied).toBeCloseTo(1200, 6);
    expect(r.carryForwardLoss).toBe(0);
  });

  it("carries forward unused losses", () => {
    const r = applyLossOrdering({
      discountGains: 100,
      nonDiscountGains: 0,
      indexedGains: 0,
      losses: 500,
      discountRate: 0.5,
    });
    expect(r.totalAssessable).toBe(0);
    expect(r.lossesApplied).toBeCloseTo(100, 6);
    expect(r.carryForwardLoss).toBeCloseTo(400, 6);
  });
});
