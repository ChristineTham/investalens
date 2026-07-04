import { describe, it, expect } from "vitest";
import {
  classifyTaxTreatment,
  isCgtAsset,
  isIncomeAsset,
} from "@/lib/calculations/asset-tax-class";

describe("classifyTaxTreatment — default by instrument type", () => {
  it("traditional bonds default to income treatment", () => {
    expect(classifyTaxTreatment({ instrumentType: "bond" })).toBe("income");
    expect(classifyTaxTreatment({ instrumentType: "BOND" })).toBe("income");
  });

  it.each<[string]>([["share"], ["etf"], ["hybrid"], ["stock"]])(
    "non-bond instrument %s defaults to CGT",
    (type) => {
      expect(classifyTaxTreatment({ instrumentType: type })).toBe("cgt");
    }
  );
});

describe("classifyTaxTreatment — per-instrument override", () => {
  it("explicit taxClass override wins over the instrument type", () => {
    // A bond explicitly marked cgt (e.g. a listed/exchange-traded note).
    expect(
      classifyTaxTreatment({ instrumentType: "bond", taxClass: "cgt" })
    ).toBe("cgt");
    // A share explicitly marked income.
    expect(
      classifyTaxTreatment({ instrumentType: "share", taxClass: "income" })
    ).toBe("income");
  });

  it("override is case-insensitive", () => {
    expect(
      classifyTaxTreatment({ instrumentType: "bond", taxClass: "CGT" })
    ).toBe("cgt");
  });

  it("null/blank override falls through to the type default", () => {
    expect(
      classifyTaxTreatment({ instrumentType: "bond", taxClass: null })
    ).toBe("income");
    expect(
      classifyTaxTreatment({ instrumentType: "share", taxClass: "" })
    ).toBe("cgt");
  });

  it("an unrecognised override value falls through to the type default", () => {
    expect(
      classifyTaxTreatment({ instrumentType: "bond", taxClass: "weird" })
    ).toBe("income");
  });
});

describe("isCgtAsset / isIncomeAsset", () => {
  it("listed shares are CGT assets", () => {
    expect(isCgtAsset({ instrumentType: "share" })).toBe(true);
    expect(isIncomeAsset({ instrumentType: "share" })).toBe(false);
  });

  it("traditional bonds are income assets", () => {
    expect(isIncomeAsset({ instrumentType: "bond" })).toBe(true);
    expect(isCgtAsset({ instrumentType: "bond" })).toBe(false);
  });
});
