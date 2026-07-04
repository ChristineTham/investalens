import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { calculateFIRE, type FIREInput } from "@/lib/calculations/fire";

// Freeze current-date reads (calculateFIRE calls new Date().getFullYear()).
beforeAll(() => {
  vi.setSystemTime(new Date("2026-07-04T00:00:00Z"));
});
afterAll(() => {
  vi.useRealTimers();
});

function baseInput(overrides: Partial<FIREInput> = {}): FIREInput {
  return {
    currentAge: 30,
    retirementAge: 65,
    currentPortfolioValue: 100_000,
    annualContribution: 20_000,
    contributionGrowthRate: 0,
    expectedReturnRate: 0.07,
    inflationRate: 0.025,
    annualExpenses: 40_000,
    expenseGrowthRate: 0,
    withdrawalRate: 0.04,
    ...overrides,
  };
}

describe("calculateFIRE", () => {
  it("computes the FIRE number as expenses / withdrawal rate", () => {
    const r = calculateFIRE(baseInput({ annualExpenses: 40_000, withdrawalRate: 0.04 }));
    // 40000 / 0.04 = 1,000,000
    expect(r.fireNumber).toBeCloseTo(1_000_000, 6);
  });

  it("finds an analytically checkable years-to-FIRE for a simple accumulation path", () => {
    // No contributions, no super, low FIRE number so growth alone reaches it.
    // fireNumber = 5000 / 0.04 = 125,000. Start 100,000 @ 7% growth.
    // The loop checks `p >= fireNumber` BEFORE applying growth (guard at start of
    // iteration using the pre-growth portfolio), so:
    //   y0 age30: p=100000 (<125k)          -> then p = 100000*1.07 = 107000
    //   y1 age31: p=107000 (<125k)          -> then p = 114490
    //   y2 age32: p=114490 (<125k)          -> then p = 122504.3
    //   y3 age33: p=122504.3 (<125k)        -> then p = 131079.6
    //   y4 age34: p=131079.6 (>=125k) => fireAge = 34
    const r = calculateFIRE(
      baseInput({
        currentAge: 30,
        annualContribution: 0,
        annualExpenses: 5_000,
        withdrawalRate: 0.04, // fireNumber = 125,000
        expectedReturnRate: 0.07,
      })
    );
    expect(r.fireNumber).toBeCloseTo(125_000, 6);
    expect(r.fireAge).toBe(34);
    expect(r.yearsToFIRE).toBe(4);
  });

  it("Coast FIRE number discounts the FIRE number by the real return over years to retirement", () => {
    const input = baseInput({
      currentAge: 40,
      retirementAge: 65,
      expectedReturnRate: 0.07,
      inflationRate: 0.025,
      annualExpenses: 40_000,
      withdrawalRate: 0.04,
    });
    const r = calculateFIRE(input);
    const realReturn = (1 + 0.07) / (1 + 0.025) - 1;
    const yearsToRetirement = 65 - 40;
    const expected = r.fireNumber / Math.pow(1 + realReturn, yearsToRetirement);
    expect(r.coastFIRENumber).toBeCloseTo(expected, 4);
    // Coast FIRE number is a discounted (smaller) figure than the FIRE number.
    expect(r.coastFIRENumber).toBeLessThan(r.fireNumber);
  });

  it("Coast FIRE number equals FIRE number when already at retirement age", () => {
    const r = calculateFIRE(baseInput({ currentAge: 65, retirementAge: 65 }));
    expect(r.coastFIRENumber).toBeCloseTo(r.fireNumber, 6);
  });

  it("orders scenario fireAge: optimistic <= baseline <= pessimistic (higher return => earlier FIRE)", () => {
    const r = calculateFIRE(
      baseInput({
        currentAge: 30,
        annualContribution: 25_000,
        annualExpenses: 60_000,
        withdrawalRate: 0.04,
      })
    );
    // A higher return reaches the FIRE number no later than a lower return.
    expect(r.scenarios.optimistic.fireAge).toBeLessThanOrEqual(r.scenarios.baseline.fireAge);
    expect(r.scenarios.baseline.fireAge).toBeLessThanOrEqual(r.scenarios.pessimistic.fireAge);
  });

  it("populates a year-by-year projection starting at the current age and year", () => {
    const r = calculateFIRE(baseInput({ currentAge: 30 }));
    expect(r.yearByYearProjection.length).toBeGreaterThan(0);
    expect(r.yearByYearProjection[0].age).toBe(30);
    expect(r.yearByYearProjection[0].year).toBe(2026); // frozen system time
  });
});
