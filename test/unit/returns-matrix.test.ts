import { describe, it, expect } from "vitest";
import {
  resolveWeights,
  collapseToReturnSeries,
  type ReturnsMatrixLike,
} from "@/lib/calculations/returns-matrix";

describe("resolveWeights", () => {
  it("normalises an ordered weight array to sum 1", () => {
    const m: ReturnsMatrixLike = {
      dates: ["d1"],
      assets: ["A", "B", "C"],
      returns: [[0, 0, 0]],
      weights: [1, 2, 1],
    };
    expect(resolveWeights(m)).toEqual([0.25, 0.5, 0.25]);
  });

  it("resolves a code->weight map aligned to asset order and normalises", () => {
    const m: ReturnsMatrixLike = {
      dates: ["d1"],
      assets: ["A", "B"],
      returns: [[0, 0]],
      weights: { A: 30, B: 10 },
    };
    expect(resolveWeights(m)).toEqual([0.75, 0.25]);
  });

  it("treats missing map entries as 0 weight", () => {
    const m: ReturnsMatrixLike = {
      dates: ["d1"],
      assets: ["A", "B", "C"],
      returns: [[0, 0, 0]],
      weights: { A: 1, C: 1 }, // B missing
    };
    expect(resolveWeights(m)).toEqual([0.5, 0, 0.5]);
  });

  it("falls back to equal weights when the total is not > 0", () => {
    const m: ReturnsMatrixLike = {
      dates: ["d1"],
      assets: ["A", "B", "C", "D"],
      returns: [[0, 0, 0, 0]],
      weights: [0, 0, 0, 0],
    };
    expect(resolveWeights(m)).toEqual([0.25, 0.25, 0.25, 0.25]);
  });

  it("falls back to equal weights when the array is short (missing entries -> 0)", () => {
    const m: ReturnsMatrixLike = {
      dates: ["d1"],
      assets: ["A", "B"],
      returns: [[0, 0]],
      weights: [], // both entries missing -> 0,0 -> total 0 -> equal weights
    };
    expect(resolveWeights(m)).toEqual([0.5, 0.5]);
  });

  it("returns empty array for zero assets", () => {
    const m: ReturnsMatrixLike = {
      dates: [],
      assets: [],
      returns: [],
      weights: [],
    };
    expect(resolveWeights(m)).toEqual([]);
  });
});

describe("collapseToReturnSeries", () => {
  it("computes the weighted daily return per row and preserves dates", () => {
    const m: ReturnsMatrixLike = {
      dates: ["d1", "d2"],
      assets: ["A", "B"],
      returns: [
        [0.10, 0.02],
        [-0.04, 0.06],
      ],
      weights: [3, 1], // normalises to 0.75, 0.25
    };
    const res = collapseToReturnSeries(m);
    expect(res.dates).toEqual(["d1", "d2"]);
    // d1: 0.75*0.10 + 0.25*0.02 = 0.075 + 0.005 = 0.08
    // d2: 0.75*-0.04 + 0.25*0.06 = -0.03 + 0.015 = -0.015
    expect(res.returns[0]).toBeCloseTo(0.08, 10);
    expect(res.returns[1]).toBeCloseTo(-0.015, 10);
  });

  it("treats missing cells in a short row as 0 return", () => {
    const m: ReturnsMatrixLike = {
      dates: ["d1"],
      assets: ["A", "B"],
      returns: [[0.10]], // B's cell missing -> treated as 0
      weights: [1, 1], // 0.5, 0.5
    };
    const res = collapseToReturnSeries(m);
    // 0.5*0.10 + 0.5*0 = 0.05
    expect(res.returns[0]).toBeCloseTo(0.05, 10);
  });

  it("with equal-weight fallback, produces the simple average return", () => {
    const m: ReturnsMatrixLike = {
      dates: ["d1"],
      assets: ["A", "B", "C", "D"],
      returns: [[0.04, 0.08, 0.12, 0.16]],
      weights: [0, 0, 0, 0], // -> equal 0.25 each
    };
    const res = collapseToReturnSeries(m);
    expect(res.returns[0]).toBeCloseTo((0.04 + 0.08 + 0.12 + 0.16) / 4, 10);
  });
});
