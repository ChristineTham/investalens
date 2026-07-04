import { describe, it, expect } from "vitest";
import { drawdownSeries, detectDrawdowns } from "@/lib/calculations/drawdown";

// The module works in cumulative-return space: value at point i is (1 + cumReturns[i]).
// Build a curve with a known trough.
//
//   idx:      0     1     2     3     4     5
//   cumRet: 0.00  0.20  0.00 -0.10  0.10  0.25
//   value:  1.00  1.20  1.00  0.90  1.10  1.25
//   peak:   1.00  1.20  1.20  1.20  1.20  1.25
//   dd:     0.00  0.00 -0.1667 -0.25  -0.0833 0.00 (approx)
//
// Peak = 1.20 at idx 1; trough value = 0.90 at idx 3.
// Max drawdown = (0.90 - 1.20) / 1.20 = -0.25 (i.e. -25%).

const CUM = [0.0, 0.2, 0.0, -0.1, 0.1, 0.25];
const DATES = ["d0", "d1", "d2", "d3", "d4", "d5"];

describe("drawdownSeries", () => {
  it("computes drawdown as (value - runningPeak) / runningPeak", () => {
    const dd = drawdownSeries(CUM);
    expect(dd).toHaveLength(CUM.length);
    // idx 0/1 at or making new highs => 0
    expect(dd[0]).toBeCloseTo(0, 6);
    expect(dd[1]).toBeCloseTo(0, 6);
    // idx 2: value 1.00 vs peak 1.20 => -0.16667
    expect(dd[2]).toBeCloseTo((1.0 - 1.2) / 1.2, 6);
    // idx 3: trough, value 0.90 vs peak 1.20 => -0.25
    expect(dd[3]).toBeCloseTo(-0.25, 6);
    // idx 4: value 1.10 vs peak 1.20 => -0.08333
    expect(dd[4]).toBeCloseTo((1.1 - 1.2) / 1.2, 6);
    // idx 5: new high => 0
    expect(dd[5]).toBeCloseTo(0, 6);
  });

  it("reports the maximum drawdown (most negative point) at -25%", () => {
    const dd = drawdownSeries(CUM);
    const maxDD = Math.min(...dd);
    expect(maxDD).toBeCloseTo(-0.25, 6);
  });
});

describe("detectDrawdowns", () => {
  it("captures one recovered episode with correct peak/trough/recovery dates and depth", () => {
    const episodes = detectDrawdowns(CUM, DATES, -0.05);
    expect(episodes).toHaveLength(1);
    const ep = episodes[0];
    // Episode is triggered at idx 2 (first breach of threshold); the code marks
    // `start` as the previous point (idx 1), which is the running peak.
    expect(ep.start).toBe("d1"); // peak
    expect(ep.trough).toBe("d3"); // deepest point
    expect(ep.recovery).toBe("d5"); // first point back to >= 0 drawdown
    expect(ep.depth).toBeCloseTo(-0.25, 6);
    // duration = recoveryIdx - startIdx = 5 - 1 = 4
    expect(ep.duration).toBe(4);
    // recoveryDays = recoveryIdx - troughIdx = 5 - 3 = 2
    expect(ep.recoveryDays).toBe(2);
  });

  it("reports an ongoing (unrecovered) drawdown with null recovery", () => {
    // Ends while still under water: value never returns to the prior peak.
    const cum = [0.0, 0.2, -0.1, -0.15];
    const dates = ["a", "b", "c", "d"];
    const episodes = detectDrawdowns(cum, dates, -0.05);
    expect(episodes).toHaveLength(1);
    expect(episodes[0].recovery).toBeNull();
    expect(episodes[0].recoveryDays).toBeNull();
    expect(episodes[0].trough).toBe("d"); // deepest = last point
  });

  it("returns no episodes when nothing breaches the threshold", () => {
    const cum = [0.0, 0.01, 0.02, 0.03];
    const dates = ["a", "b", "c", "d"];
    expect(detectDrawdowns(cum, dates, -0.05)).toHaveLength(0);
  });

  it("RoMaD = total return / max drawdown depth for the fixture", () => {
    // Total return over the fixture = final cumulative return = 0.25 (25%).
    const totalReturn = CUM[CUM.length - 1];
    const maxDD = Math.min(...drawdownSeries(CUM)); // -0.25
    const romad = totalReturn / Math.abs(maxDD);
    // 0.25 / 0.25 = 1.0
    expect(romad).toBeCloseTo(1.0, 6);
  });
});
