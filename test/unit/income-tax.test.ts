import { describe, it, expect } from "vitest";
import {
  incomeTax,
  medicareLevy,
  totalTax,
  marginalRateOnGain,
  taxOnGain,
  RESIDENT_SCALE_2027_28,
  type TaxBracket,
} from "@/lib/calculations/income-tax";

describe("incomeTax (marginal scale)", () => {
  it("is zero at or below the tax-free threshold", () => {
    expect(incomeTax(0)).toBe(0);
    expect(incomeTax(-100)).toBe(0);
    expect(incomeTax(18_200)).toBeCloseTo(0, 6);
  });

  it("taxes only the excess just above the tax-free threshold (14% band)", () => {
    // $1 over 18,200 at 14% = $0.14
    expect(incomeTax(18_201)).toBeCloseTo(0.14, 6);
  });

  it("matches a hand-computed figure at the top of the 14% band (45,000)", () => {
    // (45,000 - 18,200) * 0.14 = 26,800 * 0.14 = 3,752
    expect(incomeTax(45_000)).toBeCloseTo(3_752, 6);
  });

  it("stacks brackets correctly at the top of the 30% band (135,000)", () => {
    // 3,752 + (135,000 - 45,000) * 0.30 = 3,752 + 27,000 = 30,752
    expect(incomeTax(135_000)).toBeCloseTo(30_752, 6);
  });

  it("stacks brackets correctly at the top of the 37% band (190,000)", () => {
    // 30,752 + (190,000 - 135,000) * 0.37 = 30,752 + 20,350 = 51,102
    expect(incomeTax(190_000)).toBeCloseTo(51_102, 6);
  });

  it("applies the top 45% rate above 190,000", () => {
    // 51,102 + (200,000 - 190,000) * 0.45 = 51,102 + 4,500 = 55,602
    expect(incomeTax(200_000)).toBeCloseTo(55_602, 6);
  });

  it("honours a custom scale (e.g. a flat 25% company-style rate)", () => {
    const flat25: TaxBracket[] = [{ threshold: 0, rate: 0.25 }];
    expect(incomeTax(100_000, flat25)).toBeCloseTo(25_000, 6);
  });

  it("exposes the expected 2027-28 bracket boundaries", () => {
    expect(RESIDENT_SCALE_2027_28.map((b) => b.threshold)).toEqual([
      0, 18_200, 45_000, 135_000, 190_000,
    ]);
  });
});

describe("medicareLevy", () => {
  it("is zero below the lower threshold", () => {
    expect(medicareLevy(27_222)).toBe(0);
    expect(medicareLevy(20_000)).toBe(0);
  });

  it("is a full 2% at or above the upper threshold", () => {
    expect(medicareLevy(34_027)).toBeCloseTo(34_027 * 0.02, 6);
    expect(medicareLevy(100_000)).toBeCloseTo(2_000, 6);
  });

  it("phases in at 10% of the excess between thresholds", () => {
    // (30,000 - 27,222) * 0.10 = 2,778 * 0.10 = 277.8
    expect(medicareLevy(30_000)).toBeCloseTo(277.8, 6);
  });
});

describe("totalTax", () => {
  it("adds Medicare by default", () => {
    expect(totalTax(100_000)).toBeCloseTo(incomeTax(100_000) + medicareLevy(100_000), 6);
  });

  it("excludes Medicare when disabled", () => {
    expect(totalTax(100_000, { medicare: false })).toBeCloseTo(incomeTax(100_000), 6);
  });
});

describe("marginalRateOnGain / taxOnGain", () => {
  it("returns 0 for a non-positive gain", () => {
    expect(marginalRateOnGain(50_000, 0)).toBe(0);
    expect(taxOnGain(50_000, -100)).toBe(0);
  });

  it("a gain fully inside the 30% band has a ~30% marginal rate (Medicare off)", () => {
    // otherIncome 60k, gain 10k, both inside 45k-135k band => flat 30%.
    expect(marginalRateOnGain(60_000, 10_000, { medicare: false })).toBeCloseTo(0.3, 6);
    expect(taxOnGain(60_000, 10_000, { medicare: false })).toBeCloseTo(3_000, 6);
  });

  it("a gain fully inside the 45% band has a ~45% marginal rate (Medicare off)", () => {
    // otherIncome 200k, gain 10k, both above 190k => flat 45%.
    expect(marginalRateOnGain(200_000, 10_000, { medicare: false })).toBeCloseTo(0.45, 6);
  });

  it("marginalRateOnGain equals taxOnGain / gain", () => {
    const rate = marginalRateOnGain(60_000, 25_000, { medicare: false });
    const tax = taxOnGain(60_000, 25_000, { medicare: false });
    expect(rate).toBeCloseTo(tax / 25_000, 6);
  });
});
