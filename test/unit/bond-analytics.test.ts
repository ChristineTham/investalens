import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  calculateYTM,
  calculateModifiedDuration,
  generateCouponSchedule,
  getMaturityLadder,
} from "@/lib/calculations/bond-analytics";

beforeAll(() => {
  vi.setSystemTime(new Date("2026-07-04T00:00:00Z"));
});
afterAll(() => {
  vi.useRealTimers();
});

describe("calculateYTM", () => {
  // A par bond (price == face) yields its coupon rate; a discount bond
  // (price < face) yields above coupon; a premium bond (price > face) yields
  // below coupon but stays positive. These pin the corrected Newton-Raphson
  // solver (the earlier price/frequency scaling bug converged on negative yields).
  it("returns ~coupon rate for a par bond", () => {
    const ytm = calculateYTM(1000, 0.05, 1000, 10, 2);
    expect(ytm).toBeCloseTo(0.05, 4);
  });

  it("yields above the coupon rate for a discount bond", () => {
    const ytm = calculateYTM(1000, 0.05, 900, 10, 2);
    expect(ytm).toBeGreaterThan(0.05);
    expect(ytm).toBeLessThan(0.08);
  });

  it("yields below the coupon rate but positive for a premium bond", () => {
    const ytm = calculateYTM(1000, 0.05, 1100, 10, 2);
    expect(ytm).toBeGreaterThan(0);
    expect(ytm).toBeLessThan(0.05);
  });

  it("guards against non-positive maturity or price", () => {
    expect(calculateYTM(1000, 0.05, 1000, 0, 2)).toBe(0);
    expect(calculateYTM(1000, 0.05, 0, 10, 2)).toBe(0);
  });
});

describe("calculateModifiedDuration", () => {
  it("is positive for a coupon-bearing bond", () => {
    const dur = calculateModifiedDuration(0.05, 0.05, 10, 2);
    expect(dur).toBeGreaterThan(0);
  });

  it("increases with maturity (longer bonds are more rate-sensitive)", () => {
    const short = calculateModifiedDuration(0.05, 0.05, 2, 2);
    const long = calculateModifiedDuration(0.05, 0.05, 20, 2);
    expect(long).toBeGreaterThan(short);
  });

  it("is shorter than the time to maturity for a coupon bond", () => {
    const dur = calculateModifiedDuration(0.05, 0.05, 10, 2);
    expect(dur).toBeLessThan(10);
  });

  it("returns 0 for non-positive maturity", () => {
    expect(calculateModifiedDuration(0.05, 0.05, 0, 2)).toBe(0);
  });
});

describe("generateCouponSchedule", () => {
  it("produces frequency x years payments over the life of the bond", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const maturity = new Date("2031-01-01T00:00:00Z"); // 5 years
    const schedule = generateCouponSchedule(1000, 0.06, maturity, 2, start);
    // 2 payments/year * 5 years = 10.
    expect(schedule).toHaveLength(10);
  });

  it("computes each coupon as faceValue * rate / frequency", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const maturity = new Date("2028-01-01T00:00:00Z");
    const schedule = generateCouponSchedule(1000, 0.06, maturity, 2, start);
    // 1000 * 0.06 / 2 = 30
    expect(schedule[0].amount).toBeCloseTo(30, 6);
  });

  it("respects annual frequency", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const maturity = new Date("2029-01-01T00:00:00Z"); // 3 years
    const schedule = generateCouponSchedule(1000, 0.06, maturity, 1, start);
    expect(schedule).toHaveLength(3);
    expect(schedule[0].amount).toBeCloseTo(60, 6);
  });
});

describe("getMaturityLadder", () => {
  const holding = (code: string, maturityDate: Date | null, faceValue: number | null) => ({
    instrument: { code, maturityDate, faceValue },
  });

  it("sorts by ascending days-to-maturity", () => {
    const ladder = getMaturityLadder([
      holding("LONG", new Date("2030-07-04T00:00:00Z"), 1000),
      holding("SHORT", new Date("2027-07-04T00:00:00Z"), 1000),
      holding("MID", new Date("2028-07-04T00:00:00Z"), 1000),
    ]);
    expect(ladder.map((i) => i.instrumentCode)).toEqual(["SHORT", "MID", "LONG"]);
    expect(ladder[0].daysToMaturity).toBeLessThan(ladder[1].daysToMaturity);
    expect(ladder[1].daysToMaturity).toBeLessThan(ladder[2].daysToMaturity);
  });

  it("excludes holdings without a maturity date", () => {
    const ladder = getMaturityLadder([
      holding("BOND", new Date("2028-07-04T00:00:00Z"), 1000),
      holding("EQUITY", null, null),
    ]);
    expect(ladder).toHaveLength(1);
    expect(ladder[0].instrumentCode).toBe("BOND");
  });

  it("coerces null face value to 0", () => {
    const ladder = getMaturityLadder([holding("BOND", new Date("2028-07-04T00:00:00Z"), null)]);
    expect(ladder[0].faceValue).toBe(0);
  });
});
