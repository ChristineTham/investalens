import { describe, it, expect } from "vitest";
import {
  totalReturn,
  cagr,
  maxDrawdown,
  annualisedVol,
} from "@/lib/calculations/series-metrics";

describe("totalReturn", () => {
  it("computes v[last]/v[0] - 1 as a fraction", () => {
    expect(totalReturn([100, 150])).toBeCloseTo(0.5, 10);
    expect(totalReturn([100, 200, 120])).toBeCloseTo(0.2, 10);
  });

  it("returns 0 for series shorter than 2", () => {
    expect(totalReturn([])).toBe(0);
    expect(totalReturn([100])).toBe(0);
  });

  it("returns 0 when the first value is 0", () => {
    expect(totalReturn([0, 100])).toBe(0);
  });
});

describe("cagr", () => {
  it("computes (last/first)^(1/years) - 1", () => {
    // 100 -> 400 over 2 years -> 4^(1/2)-1 = 1.0 (100%)
    expect(cagr([100, 400], 2)).toBeCloseTo(1.0, 10);
  });

  it("for a constant series equals 0 (0% growth)", () => {
    expect(cagr([100, 100, 100], 3)).toBeCloseTo(0, 10);
  });

  it("returns 0 for non-positive years or short series", () => {
    expect(cagr([100, 200], 0)).toBe(0);
    expect(cagr([100], 1)).toBe(0);
  });

  it("returns 0 when first or last is non-positive", () => {
    expect(cagr([0, 100], 1)).toBe(0);
    expect(cagr([100, 0], 1)).toBe(0);
  });
});

describe("maxDrawdown", () => {
  it("returns the most negative peak-to-trough drawdown as a fraction <= 0", () => {
    // peak 100, trough 70 -> -0.3
    expect(maxDrawdown([100, 110, 77])).toBeCloseTo(0.77 / 1.1 - 1, 10);
    // Simpler: 100 -> 70 direct
    expect(maxDrawdown([100, 70])).toBeCloseTo(-0.3, 10);
  });

  it("is 0 for a monotonically increasing series", () => {
    expect(maxDrawdown([100, 110, 120])).toBe(0);
  });

  it("is 0 for a constant series", () => {
    expect(maxDrawdown([100, 100, 100])).toBe(0);
  });

  it("returns 0 for empty input", () => {
    expect(maxDrawdown([])).toBe(0);
  });
});

describe("annualisedVol", () => {
  it("is 0 for a constant-return (constant-price) series", () => {
    expect(annualisedVol([100, 100, 100, 100])).toBeCloseTo(0, 10);
  });

  it("is 0 for constant positive growth (identical period returns)", () => {
    // Each step +10% -> returns all equal -> sample variance 0
    expect(annualisedVol([100, 110, 121, 133.1])).toBeCloseTo(0, 10);
  });

  it("uses sample std (n-1) of simple returns * sqrt(periodsPerYear)", () => {
    // prices 100,110,99 -> returns: 0.1, -0.1
    // mean=0, sample variance = (0.1^2 + 0.1^2)/(2-1) = 0.02, std=sqrt(0.02)
    // annualised with default 252
    const std = Math.sqrt(0.02);
    expect(annualisedVol([100, 110, 99])).toBeCloseTo(std * Math.sqrt(252), 10);
  });

  it("respects a custom periodsPerYear", () => {
    const std = Math.sqrt(0.02);
    expect(annualisedVol([100, 110, 99], 12)).toBeCloseTo(std * Math.sqrt(12), 10);
  });

  it("returns 0 for series shorter than 3", () => {
    expect(annualisedVol([100, 110])).toBe(0);
  });
});
