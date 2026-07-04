import { describe, it, expect } from "vitest";
import {
  indexationFactor,
  currentLawIndexationFactor,
  proposedIndexationFactor,
  cpiQuarterKey,
  type CpiMap,
} from "@/lib/calculations/indexation";

describe("indexationFactor", () => {
  it("rounds the CPI ratio to 3 decimals", () => {
    expect(indexationFactor(100, 130)).toBeCloseTo(1.3, 6);
    expect(indexationFactor(68.7, 123.4)).toBeCloseTo(
      Math.round((123.4 / 68.7) * 1000) / 1000,
      6
    );
  });

  it("never returns less than 1 (indexation can't create a loss)", () => {
    expect(indexationFactor(130, 100)).toBe(1);
  });

  it("returns 1 for invalid CPI inputs", () => {
    expect(indexationFactor(0, 100)).toBe(1);
    expect(indexationFactor(100, 0)).toBe(1);
  });
});

describe("cpiQuarterKey", () => {
  it.each<[string, string]>([
    ["1999-02-15", "1999-Q1"],
    ["1999-05-15", "1999-Q2"],
    ["1999-09-15", "1999-Q3"],
    ["1999-11-15", "1999-Q4"],
  ])("maps %s → %s", (date, key) => {
    expect(cpiQuarterKey(new Date(date))).toBe(key);
  });
});

describe("currentLawIndexationFactor — pre-21-Sep-1999 cutoff", () => {
  const cpi: CpiMap = new Map([
    ["1998-Q1", 100],
    ["1999-Q3", 123],
  ]);

  it("indexes an asset acquired before the 21 Sep 1999 cutoff", () => {
    const factor = currentLawIndexationFactor(
      new Date("1998-03-15"),
      new Date("2005-01-01"),
      cpi
    );
    expect(factor).not.toBeNull();
    // Event quarter frozen at 1999-Q3 (123) / acq 1998-Q1 (100) = 1.23.
    expect(factor!).toBeCloseTo(1.23, 6);
  });

  it("returns null for an asset acquired on/after the cutoff", () => {
    const factor = currentLawIndexationFactor(
      new Date("1999-10-01"),
      new Date("2005-01-01"),
      cpi
    );
    expect(factor).toBeNull();
  });

  it("freezes the event quarter at September 1999 even for a much later disposal", () => {
    // A 2020 disposal still uses the 1999-Q3 CPI value, not a 2020 value.
    const cpiWithLater: CpiMap = new Map([
      ["1998-Q1", 100],
      ["1999-Q3", 123],
      ["2020-Q1", 300], // must be ignored
    ]);
    const factor = currentLawIndexationFactor(
      new Date("1998-03-15"),
      new Date("2020-01-15"),
      cpiWithLater
    );
    expect(factor!).toBeCloseTo(1.23, 6);
  });

  it("returns null when CPI data is missing for a quarter", () => {
    const factor = currentLawIndexationFactor(
      new Date("1997-03-15"), // 1997-Q1 not in map
      new Date("2005-01-01"),
      cpi
    );
    expect(factor).toBeNull();
  });
});

describe("proposedIndexationFactor — no freeze", () => {
  it("uses CPI at disposal ÷ CPI at the base date with no freeze", () => {
    const cpi: CpiMap = new Map([
      ["2027-Q3", 200],
      ["2035-Q1", 260],
    ]);
    const factor = proposedIndexationFactor(
      new Date("2027-07-01"),
      new Date("2035-02-15"),
      cpi
    );
    expect(factor!).toBeCloseTo(1.3, 6);
  });

  it("returns null when CPI is missing", () => {
    const cpi: CpiMap = new Map([["2027-Q3", 200]]);
    const factor = proposedIndexationFactor(
      new Date("2027-07-01"),
      new Date("2035-02-15"),
      cpi
    );
    expect(factor).toBeNull();
  });
});
