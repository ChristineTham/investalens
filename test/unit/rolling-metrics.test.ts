import { describe, it, expect } from "vitest";
import { rollingMetric } from "@/lib/calculations/rolling-metrics";

const TRADING_DAYS = 252;

function mean(a: number[]) {
  return a.reduce((s, v) => s + v, 0) / a.length;
}
function sampleStd(a: number[]) {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
}

describe("rollingMetric windowing", () => {
  it("emits one value per full window, tagged with the window-end date", () => {
    const returns = [0.01, -0.02, 0.03, 0.0, 0.01];
    const bench = [0.01, -0.01, 0.02, 0.0, 0.005];
    const dates = ["d1", "d2", "d3", "d4", "d5"];
    const res = rollingMetric(returns, bench, 3, "sharpe", dates);
    // windows end at index 2,3,4 -> 3 results, dates d3,d4,d5
    expect(res.values).toHaveLength(3);
    expect(res.dates).toEqual(["d3", "d4", "d5"]);
  });
});

describe("rolling sharpe", () => {
  it("matches (mean/std of excess) * sqrt(252) over the window", () => {
    const rf = 0.0435;
    const dailyRf = rf / TRADING_DAYS;
    const returns = [0.02, -0.01, 0.03];
    const bench = [0, 0, 0];
    const dates = ["d1", "d2", "d3"];
    const res = rollingMetric(returns, bench, 3, "sharpe", dates, rf);

    const excess = returns.map((r) => r - dailyRf);
    const expected = (mean(excess) / sampleStd(excess)) * Math.sqrt(TRADING_DAYS);
    expect(res.values[0]).toBeCloseTo(expected, 10);
  });
});

describe("rolling sortino", () => {
  it("uses downside sample std (n-1) of excess < 0 returns", () => {
    const rf = 0.0435;
    const dailyRf = rf / TRADING_DAYS;
    // Make several downside days so downside.length > 1.
    const returns = [0.03, -0.02, 0.01, -0.03];
    const bench = [0, 0, 0, 0];
    const dates = ["d1", "d2", "d3", "d4"];
    const res = rollingMetric(returns, bench, 4, "sortino", dates, rf);

    const excess = returns.map((r) => r - dailyRf);
    const m = mean(excess);
    const downside = excess.filter((r) => r < 0);
    const downsideStd = Math.sqrt(
      downside.reduce((s, v) => s + v ** 2, 0) / (downside.length - 1)
    );
    const expected = (m / downsideStd) * Math.sqrt(TRADING_DAYS);
    expect(res.values[0]).toBeCloseTo(expected, 10);
  });
});

describe("rolling beta", () => {
  it("computes Cov/Var; port = 2x bench gives beta 2", () => {
    const bench = [0.01, -0.02, 0.03, -0.01];
    const returns = bench.map((b) => 2 * b);
    const dates = ["d1", "d2", "d3", "d4"];
    const res = rollingMetric(returns, bench, 4, "beta", dates);
    expect(res.values[0]).toBeCloseTo(2, 10);
  });
});

describe("rolling alpha", () => {
  it("computes annPortfolio - (rf + beta*(annBench - rf))", () => {
    const rf = 0.0435;
    const bench = [0.01, -0.02, 0.03, -0.01];
    const returns = bench.map((b) => 2 * b);
    const dates = ["d1", "d2", "d3", "d4"];
    const res = rollingMetric(returns, bench, 4, "alpha", dates, rf);

    // beta = 2 (perfect 2x). annPortfolio = mean(returns)*252, annBench = mean(bench)*252
    const beta = 2;
    const annPort = mean(returns) * TRADING_DAYS;
    const annBench = mean(bench) * TRADING_DAYS;
    const expected = annPort - (rf + beta * (annBench - rf));
    expect(res.values[0]).toBeCloseTo(expected, 8);
  });
});

describe("rolling tracking_error", () => {
  it("annualised sample std of (port - bench) diffs", () => {
    const returns = [0.05, 0.01, 0.04];
    const bench = [0.03, 0.03, 0.03];
    const dates = ["d1", "d2", "d3"];
    const res = rollingMetric(returns, bench, 3, "tracking_error", dates);

    const diffs = returns.map((r, i) => r - bench[i]);
    const expected = sampleStd(diffs) * Math.sqrt(TRADING_DAYS);
    expect(res.values[0]).toBeCloseTo(expected, 10);
  });
});
