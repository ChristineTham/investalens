import { describe, it, expect } from "vitest";
import { calculatePosition } from "@/lib/calculations/position";
import type { TransactionData } from "@/lib/calculations/performance";

let idSeq = 0;
function tx(
  transactionType: string,
  tradeDate: string,
  quantity: number,
  price: number,
  brokerage = 0
): TransactionData {
  return {
    id: `tx-${idSeq++}`,
    transactionType,
    tradeDate: new Date(tradeDate),
    quantity,
    price,
    brokerage,
    exchangeRate: 1,
    currency: "AUD",
  };
}

describe("calculatePosition — quantity by transaction type", () => {
  it.each<[string]>([["BUY"], ["TRANSFER_IN"], ["RIGHTS_ISSUE"], ["MERGER_IN"]])(
    "%s adds to quantity",
    (type) => {
      const p = calculatePosition([tx(type, "2020-01-01", 100, 10)], 15);
      expect(p.quantity).toBe(100);
    }
  );

  it.each<[string]>([["SELL"], ["TRANSFER_OUT"], ["MERGER_OUT"]])(
    "%s removes from quantity",
    (type) => {
      const p = calculatePosition(
        [tx("BUY", "2020-01-01", 100, 10), tx(type, "2020-06-01", 40, 12)],
        15
      );
      expect(p.quantity).toBe(60);
    }
  );

  it("SPLIT multiplies quantity but keeps cost base", () => {
    const p = calculatePosition(
      [tx("BUY", "2020-01-01", 100, 10), tx("SPLIT", "2020-06-01", 2, 0)],
      15
    );
    expect(p.quantity).toBe(200);
    expect(p.totalCostBase).toBeCloseTo(1000, 6);
    expect(p.averageCost).toBeCloseTo(5, 6);
  });

  it("BONUS adds quantity at zero cost", () => {
    const p = calculatePosition(
      [tx("BUY", "2020-01-01", 100, 10), tx("BONUS", "2020-06-01", 10, 0)],
      15
    );
    expect(p.quantity).toBe(110);
    expect(p.totalCostBase).toBeCloseTo(1000, 6);
  });
});

describe("calculatePosition — cost base math", () => {
  it("BUY cost base includes brokerage", () => {
    const p = calculatePosition([tx("BUY", "2020-01-01", 100, 10, 30)], 10);
    expect(p.totalCostBase).toBeCloseTo(1030, 6);
    expect(p.averageCost).toBeCloseTo(10.3, 6);
  });

  it("RIGHTS_ISSUE and MERGER_IN add cost base (qty*price + brokerage)", () => {
    const p = calculatePosition(
      [
        tx("BUY", "2020-01-01", 100, 10, 0), // 1000
        tx("RIGHTS_ISSUE", "2020-06-01", 50, 8, 15), // 415
        tx("MERGER_IN", "2020-07-01", 20, 5, 0), // 100
      ],
      10
    );
    expect(p.quantity).toBe(170);
    expect(p.totalCostBase).toBeCloseTo(1000 + 415 + 100, 6); // 1515
  });

  it("SELL removes cost base at the running average cost", () => {
    const p = calculatePosition(
      [
        tx("BUY", "2020-01-01", 100, 10, 0), // avg 10
        tx("BUY", "2020-02-01", 100, 20, 0), // avg 15
        tx("SELL", "2020-06-01", 100, 25, 0), // removes 100*15 = 1500
      ],
      25
    );
    expect(p.quantity).toBe(100);
    expect(p.totalCostBase).toBeCloseTo(1500, 6); // 3000 - 1500
    expect(p.averageCost).toBeCloseTo(15, 6);
  });

  it("RETURN_OF_CAPITAL reduces cost base and floors it at zero", () => {
    const p = calculatePosition(
      [
        tx("BUY", "2020-01-01", 100, 10, 0), // 1000
        tx("RETURN_OF_CAPITAL", "2020-06-01", 100, 2, 0), // -200
      ],
      10
    );
    expect(p.totalCostBase).toBeCloseTo(800, 6);
  });

  it("computes market value and unrealised gain", () => {
    const p = calculatePosition([tx("BUY", "2020-01-01", 100, 10, 0)], 15);
    expect(p.marketValue).toBeCloseTo(1500, 6);
    expect(p.unrealisedGain).toBeCloseTo(500, 6);
    expect(p.unrealisedGainPercent).toBeCloseTo(50, 6);
  });

  it("returns zeroed averages when fully sold out", () => {
    const p = calculatePosition(
      [tx("BUY", "2020-01-01", 100, 10, 0), tx("SELL", "2020-06-01", 100, 12, 0)],
      12
    );
    expect(p.quantity).toBe(0);
    expect(p.averageCost).toBe(0);
    expect(p.unrealisedGainPercent).toBe(0);
  });
});
