import { describe, it, expect } from "vitest";
import {
  calculateDailyReturns,
  annualisedReturn,
  annualisedVolatility,
  downsideVolatility,
  sharpeRatio,
  sortinoRatio,
  calculateBeta,
  calculateAlpha,
  maxDrawdown,
  trackingError,
  informationRatio,
  calmarRatio,
  treynorRatio,
  omegaRatio,
  valueAtRisk,
  conditionalVaR,
  captureRatio,
  rSquared,
  skewness,
  kurtosis,
} from "@/lib/calculations/risk-metrics";

const TRADING_DAYS = 252;

describe("calculateDailyReturns", () => {
  it("computes simple period returns, skipping non-positive predecessors", () => {
    expect(calculateDailyReturns([100, 110, 99])).toEqual([0.1, -0.1]);
  });
  it("skips a return when the previous price is <= 0", () => {
    expect(calculateDailyReturns([0, 100, 110])).toEqual([0.1]);
  });
});

describe("annualisedReturn", () => {
  it("compounds returns then annualises by n/252 years", () => {
    // Two returns of +10% each -> total = 1.1*1.1 - 1 = 0.21
    // years = 2/252 -> (1.21)^(252/2) - 1
    const expected = Math.pow(1.21, TRADING_DAYS / 2) - 1;
    // Value is astronomically large (~2.7e10); assert relative closeness.
    expect(annualisedReturn([0.1, 0.1]) / expected).toBeCloseTo(1, 10);
  });
  it("returns 0 for empty input", () => {
    expect(annualisedReturn([])).toBe(0);
  });
});

describe("annualisedVolatility", () => {
  it("is 0 for a constant-return series", () => {
    expect(annualisedVolatility([0.01, 0.01, 0.01, 0.01])).toBeCloseTo(0, 12);
  });
  it("uses sample std (n-1) * sqrt(252)", () => {
    // returns 0.1, -0.1 -> mean 0, var = (0.01+0.01)/(2-1)=0.02
    const expected = Math.sqrt(0.02) * Math.sqrt(TRADING_DAYS);
    expect(annualisedVolatility([0.1, -0.1])).toBeCloseTo(expected, 10);
  });
  it("returns 0 for fewer than 2 returns", () => {
    expect(annualisedVolatility([0.1])).toBe(0);
  });
});

describe("downsideVolatility", () => {
  it("uses only sub-target returns but divides by the FULL count", () => {
    // returns: 0.1, -0.2, 0.05, -0.1 ; target 0
    // downside: -0.2, -0.1 ; sum of squares = 0.04 + 0.01 = 0.05
    // variance = 0.05 / 4 (full count) = 0.0125
    const expected = Math.sqrt(0.05 / 4) * Math.sqrt(TRADING_DAYS);
    expect(downsideVolatility([0.1, -0.2, 0.05, -0.1])).toBeCloseTo(expected, 10);
  });
  it("returns 0 when there are no downside returns", () => {
    expect(downsideVolatility([0.1, 0.2, 0.3])).toBe(0);
  });
});

describe("sharpeRatio", () => {
  it("computes (annReturn - rf) / volatility", () => {
    expect(sharpeRatio(0.14, 0.2, 0.04)).toBeCloseTo((0.14 - 0.04) / 0.2, 10);
  });
  it("defaults rf to 0.04", () => {
    expect(sharpeRatio(0.1, 0.2)).toBeCloseTo((0.1 - 0.04) / 0.2, 10);
  });
  it("returns 0 when volatility is 0", () => {
    expect(sharpeRatio(0.1, 0)).toBe(0);
  });
});

describe("sortinoRatio", () => {
  it("computes (annReturn - rf) / downsideVol", () => {
    expect(sortinoRatio(0.1, 0.08, 0.04)).toBeCloseTo((0.1 - 0.04) / 0.08, 10);
  });
  it("returns 0 when downside vol is 0", () => {
    expect(sortinoRatio(0.1, 0)).toBe(0);
  });
});

describe("calculateBeta", () => {
  it("computes Cov(p,b)/Var(b); perfectly correlated 2x gives beta 2", () => {
    const bench = [0.01, -0.02, 0.03, -0.01];
    const port = bench.map((b) => 2 * b);
    expect(calculateBeta(port, bench)).toBeCloseTo(2, 10);
  });
  it("returns 1 when benchmark variance is 0", () => {
    expect(calculateBeta([0.1, 0.2], [0.05, 0.05])).toBe(1);
  });
  it("returns 1 for fewer than 2 points", () => {
    expect(calculateBeta([0.1], [0.1])).toBe(1);
  });
});

describe("calculateAlpha (Jensen)", () => {
  it("computes Rp - [rf + beta*(Rb - rf)]", () => {
    // Rp=0.12, Rb=0.10, beta=1.2, rf=0.04
    const expected = 0.12 - (0.04 + 1.2 * (0.1 - 0.04));
    expect(calculateAlpha(0.12, 0.1, 1.2, 0.04)).toBeCloseTo(expected, 10);
  });
});

describe("maxDrawdown (from prices, positive fraction)", () => {
  it("returns a positive fraction (peak-price)/peak", () => {
    expect(maxDrawdown([100, 120, 90])).toBeCloseTo((120 - 90) / 120, 10);
  });
  it("is 0 for a rising series", () => {
    expect(maxDrawdown([100, 110, 120])).toBe(0);
  });
  it("returns 0 for fewer than 2 prices", () => {
    expect(maxDrawdown([100])).toBe(0);
  });
});

describe("trackingError", () => {
  it("annualised sample std of excess returns", () => {
    // excess: 0.02, -0.02 -> mean 0, var = (0.0004+0.0004)/1 = 0.0008
    const p = [0.05, 0.01];
    const b = [0.03, 0.03];
    const expected = Math.sqrt(0.0008) * Math.sqrt(TRADING_DAYS);
    expect(trackingError(p, b)).toBeCloseTo(expected, 10);
  });
  it("returns 0 for fewer than 2 points", () => {
    expect(trackingError([0.1], [0.1])).toBe(0);
  });
});

describe("informationRatio", () => {
  it("computes (Rp - Rb) / trackingError", () => {
    expect(informationRatio(0.12, 0.1, 0.05)).toBeCloseTo(0.02 / 0.05, 10);
  });
  it("returns 0 when tracking error is 0", () => {
    expect(informationRatio(0.12, 0.1, 0)).toBe(0);
  });
});

describe("calmarRatio", () => {
  it("computes annReturn / maxDrawdown", () => {
    expect(calmarRatio(0.2, 0.1)).toBeCloseTo(2, 10);
  });
  it("returns 0 when mdd is 0", () => {
    expect(calmarRatio(0.2, 0)).toBe(0);
  });
});

describe("treynorRatio", () => {
  it("computes (annReturn - rf) / beta", () => {
    expect(treynorRatio(0.14, 2, 0.04)).toBeCloseTo((0.14 - 0.04) / 2, 10);
  });
  it("returns 0 when beta is 0", () => {
    expect(treynorRatio(0.1, 0)).toBe(0);
  });
});

describe("omegaRatio", () => {
  it("computes gains-over-threshold / losses-under-threshold", () => {
    // returns: 0.1, -0.05, 0.2, -0.1 ; threshold 0
    // gains = 0.1 + 0.2 = 0.3 ; losses = 0.05 + 0.1 = 0.15 -> 2
    expect(omegaRatio([0.1, -0.05, 0.2, -0.1])).toBeCloseTo(2, 10);
  });
  it("returns Infinity when there are only gains", () => {
    expect(omegaRatio([0.1, 0.2])).toBe(Infinity);
  });
});

describe("valueAtRisk (historical, sign-flipped)", () => {
  it("returns -sorted[floor(confidence*n)]", () => {
    // 20 returns; confidence 0.05 -> idx = floor(0.05*20)=1 -> second-smallest
    const returns = Array.from({ length: 20 }, (_, i) => (i - 10) / 100); // -0.10 .. 0.09
    const sorted = [...returns].sort((a, b) => a - b);
    expect(valueAtRisk(returns, 0.05)).toBeCloseTo(-sorted[1], 10);
  });
  it("returns 0 for empty input", () => {
    expect(valueAtRisk([], 0.05)).toBe(0);
  });
});

describe("conditionalVaR (mean of the tail, sign-flipped)", () => {
  it("averages the tail below the cutoff index", () => {
    // 20 returns, confidence 0.25 -> cutoffIdx = floor(0.25*20)=5
    // tail = 5 smallest returns; CVaR = -(mean of those)
    const returns = Array.from({ length: 20 }, (_, i) => (i - 10) / 100);
    const sorted = [...returns].sort((a, b) => a - b);
    const tail = sorted.slice(0, 5);
    const expected = -(tail.reduce((s, v) => s + v, 0) / tail.length);
    expect(conditionalVaR(returns, 0.25)).toBeCloseTo(expected, 10);
  });
  it("falls back to -sorted[0] when cutoff index is 0", () => {
    // small sample where floor(0.05*4)=0
    const returns = [-0.1, 0.02, 0.03, 0.04];
    expect(conditionalVaR(returns, 0.05)).toBeCloseTo(0.1, 10);
  });
});

describe("captureRatio", () => {
  it("up-capture: avg port / avg bench over up-benchmark days", () => {
    // bench up days: 0.02, 0.04 (port 0.03, 0.05); down day ignored
    const port = [0.03, -0.01, 0.05];
    const bench = [0.02, -0.02, 0.04];
    // avg port over up = (0.03+0.05)/2 = 0.04 ; avg bench = (0.02+0.04)/2 = 0.03
    expect(captureRatio(port, bench, "up")).toBeCloseTo(0.04 / 0.03, 10);
  });
  it("returns 0 when no matching days", () => {
    expect(captureRatio([0.01], [0.01], "down")).toBe(0);
  });
});

describe("rSquared", () => {
  it("is 1 for a perfect linear relationship", () => {
    const bench = [0.01, -0.02, 0.03, -0.01, 0.02];
    const port = bench.map((b) => 2 * b + 0.001);
    expect(rSquared(port, bench)).toBeCloseTo(1, 8);
  });
  it("returns 0 for fewer than 2 points", () => {
    expect(rSquared([0.1], [0.1])).toBe(0);
  });
});

describe("skewness", () => {
  it("is ~0 for a symmetric sample", () => {
    expect(skewness([-2, -1, 0, 1, 2])).toBeCloseTo(0, 10);
  });
  it("returns 0 for fewer than 3 points", () => {
    expect(skewness([1, 2])).toBe(0);
  });
});

describe("kurtosis (excess)", () => {
  it("returns m4 - 3", () => {
    // Hand-compute for [-2,-1,0,1,2] using sample std (n-1)
    const data = [-2, -1, 0, 1, 2];
    const n = data.length;
    const mean = 0;
    const std = Math.sqrt(data.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1));
    const m4 = data.reduce((s, r) => s + ((r - mean) / std) ** 4, 0) / n;
    expect(kurtosis(data)).toBeCloseTo(m4 - 3, 10);
  });
  it("returns 0 for fewer than 4 points", () => {
    expect(kurtosis([1, 2, 3])).toBe(0);
  });
});
