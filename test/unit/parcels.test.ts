import { describe, it, expect } from "vitest";
import {
  buildParcels,
  allocateSale,
} from "@/lib/calculations/parcels";
import type { TransactionData } from "@/lib/calculations/performance";
import type { CpiMap } from "@/lib/calculations/indexation";

/**
 * Minimal TransactionData factory. Only the fields buildParcels/allocateSale
 * read are meaningful (transactionType, tradeDate, quantity, price, brokerage,
 * comments); the rest are filled with harmless defaults.
 */
let idSeq = 0;
function tx(
  transactionType: string,
  tradeDate: string,
  quantity: number,
  price: number,
  brokerage = 0,
  comments?: string
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
    comments: comments ?? null,
  };
}

describe("buildParcels — acquisition parcel building", () => {
  it("BUY creates a parcel with cost base including brokerage", () => {
    const parcels = buildParcels([tx("BUY", "2020-01-01", 100, 10, 30)]);
    expect(parcels).toHaveLength(1);
    expect(parcels[0].quantity).toBe(100);
    expect(parcels[0].remainingQuantity).toBe(100);
    expect(parcels[0].totalCost).toBeCloseTo(100 * 10 + 30, 6); // 1030
    expect(parcels[0].costPerUnit).toBeCloseTo(1030 / 100, 6); // 10.3
  });

  it("SPLIT multiplies remaining and total quantity and divides cost per unit", () => {
    const parcels = buildParcels([
      tx("BUY", "2020-01-01", 100, 10, 0),
      tx("SPLIT", "2020-06-01", 2, 0, 0), // 2:1 split
    ]);
    expect(parcels).toHaveLength(1);
    expect(parcels[0].quantity).toBe(200);
    expect(parcels[0].remainingQuantity).toBe(200);
    expect(parcels[0].costPerUnit).toBeCloseTo(5, 6); // 10 / 2
    expect(parcels[0].totalCost).toBeCloseTo(1000, 6); // unchanged
  });

  it("RETURN_OF_CAPITAL reduces cost base proportionally across parcels", () => {
    const parcels = buildParcels([
      tx("BUY", "2020-01-01", 100, 10, 0), // cost 1000
      tx("BUY", "2020-02-01", 100, 20, 0), // cost 2000
      tx("RETURN_OF_CAPITAL", "2020-03-01", 200, 1, 0), // returns 200 total
    ]);
    // 200 units total, each parcel holds 100 → 50% of the 200 reduction = 100 each
    expect(parcels[0].totalCost).toBeCloseTo(900, 6);
    expect(parcels[1].totalCost).toBeCloseTo(1900, 6);
  });

  it("BONUS creates a zero-cost parcel", () => {
    const parcels = buildParcels([
      tx("BUY", "2020-01-01", 100, 10, 0),
      tx("BONUS", "2020-06-01", 10, 0, 0),
    ]);
    expect(parcels).toHaveLength(2);
    expect(parcels[1].quantity).toBe(10);
    expect(parcels[1].totalCost).toBe(0);
    expect(parcels[1].costPerUnit).toBe(0);
  });

  // ── Milestone fix: RIGHTS_ISSUE and MERGER_IN create acquisition parcels ──
  it("RIGHTS_ISSUE creates an acquisition parcel (milestone fix)", () => {
    const parcels = buildParcels([
      tx("BUY", "2020-01-01", 100, 10, 0),
      tx("RIGHTS_ISSUE", "2020-06-01", 50, 8, 15),
    ]);
    expect(parcels).toHaveLength(2);
    const rights = parcels[1];
    expect(rights.quantity).toBe(50);
    expect(rights.remainingQuantity).toBe(50);
    expect(rights.totalCost).toBeCloseTo(50 * 8 + 15, 6); // 415
    expect(rights.purchaseDate.getTime()).toBe(new Date("2020-06-01").getTime());
  });

  it("MERGER_IN creates an acquisition parcel dated at the merger date by default", () => {
    const parcels = buildParcels([
      tx("MERGER_IN", "2021-03-01", 200, 5, 0),
    ]);
    expect(parcels).toHaveLength(1);
    expect(parcels[0].quantity).toBe(200);
    expect(parcels[0].totalCost).toBeCloseTo(1000, 6);
    expect(parcels[0].purchaseDate.getTime()).toBe(
      new Date("2021-03-01").getTime()
    );
  });

  it("MERGER_IN inherits the [acq:YYYY-MM-DD] date from comments (scrip-for-scrip rollover)", () => {
    const parcels = buildParcels([
      tx("MERGER_IN", "2021-03-01", 200, 5, 0, "rollover [acq:2015-03-01]"),
    ]);
    expect(parcels).toHaveLength(1);
    expect(parcels[0].purchaseDate.getTime()).toBe(
      new Date("2015-03-01").getTime()
    );
  });
});

describe("buildParcels — disposals consume parcels (regression)", () => {
  // Regression test for the double-counting bug the milestone fixed: a prior
  // SELL/TRANSFER_OUT/MERGER_OUT must drain parcels so a later sale can't
  // allocate against units already gone.
  it("prior SELL consumes parcel quantity so remaining reflects the disposal", () => {
    const parcels = buildParcels([
      tx("BUY", "2020-01-01", 100, 10, 0),
      tx("SELL", "2020-06-01", 40, 12, 0),
    ]);
    const totalRemaining = parcels.reduce((s, p) => s + p.remainingQuantity, 0);
    expect(totalRemaining).toBe(60);
  });

  it("prior TRANSFER_OUT consumes parcel quantity", () => {
    const parcels = buildParcels([
      tx("BUY", "2020-01-01", 100, 10, 0),
      tx("TRANSFER_OUT", "2020-06-01", 30, 12, 0),
    ]);
    expect(parcels.reduce((s, p) => s + p.remainingQuantity, 0)).toBe(70);
  });

  it("MERGER_OUT drains every parcel", () => {
    const parcels = buildParcels([
      tx("BUY", "2020-01-01", 100, 10, 0),
      tx("BUY", "2020-02-01", 50, 20, 0),
      tx("MERGER_OUT", "2020-06-01", 150, 0, 0),
    ]);
    expect(parcels.reduce((s, p) => s + p.remainingQuantity, 0)).toBe(0);
  });

  it("two sequential sales are NOT double-counted (FIFO consumption)", () => {
    // BUY 100. SELL 40 (drains first parcel to 60). A later allocateSale of 50
    // must only find 60 remaining, not the original 100.
    const txs = [
      tx("BUY", "2020-01-01", 100, 10, 0),
      tx("SELL", "2020-06-01", 40, 12, 0),
    ];
    const parcels = buildParcels(txs, "fifo");
    const results = allocateSale(
      parcels,
      new Date("2021-01-01"),
      50,
      15,
      0,
      "fifo"
    );
    const totalSold = results.reduce((s, r) => s + r.quantitySold, 0);
    // Only 60 units remain; the sale of 50 fits, leaving 10.
    expect(totalSold).toBe(50);
    const remainingAfter = parcels.reduce(
      (s, p) => s + p.remainingQuantity,
      0
    );
    expect(remainingAfter).toBe(60); // allocateSale does not mutate parcels
  });
});

describe("allocateSale — allocation methods pick the expected parcels", () => {
  // Three parcels, distinct cost bases and dates, all held long-term at sale.
  //   A: 2018-01-01, 100 @ $10 (cost 10)
  //   B: 2019-01-01, 100 @ $30 (cost 30, highest)
  //   C: 2020-01-01, 100 @ $20 (cost 20)
  function threeParcels() {
    return buildParcels([
      tx("BUY", "2018-01-01", 100, 10, 0),
      tx("BUY", "2019-01-01", 100, 30, 0),
      tx("BUY", "2020-01-01", 100, 20, 0),
    ]);
  }
  const saleDate = new Date("2022-01-01");

  it("FIFO picks the earliest parcel first", () => {
    const r = allocateSale(threeParcels(), saleDate, 50, 40, 0, "fifo");
    expect(r[0].parcel.costPerUnit).toBeCloseTo(10, 6); // A
  });

  it("LIFO picks the latest parcel first", () => {
    const r = allocateSale(threeParcels(), saleDate, 50, 40, 0, "lifo");
    expect(r[0].parcel.costPerUnit).toBeCloseTo(20, 6); // C (2020)
  });

  it("min_gain picks the highest-cost parcel first", () => {
    const r = allocateSale(threeParcels(), saleDate, 50, 40, 0, "min_gain");
    expect(r[0].parcel.costPerUnit).toBeCloseTo(30, 6); // B
  });

  it("max_gain picks the lowest-cost parcel first", () => {
    const r = allocateSale(threeParcels(), saleDate, 50, 40, 0, "max_gain");
    expect(r[0].parcel.costPerUnit).toBeCloseTo(10, 6); // A
  });

  it("min_tax picks the parcel with the lowest post-discount tax first", () => {
    // All long-term (50% discount for individual). Lowest taxable gain =
    // highest cost parcel B. gain*0.5 minimised by max cost.
    const r = allocateSale(
      threeParcels(),
      saleDate,
      50,
      40,
      0,
      "min_tax",
      "individual"
    );
    expect(r[0].parcel.costPerUnit).toBeCloseTo(30, 6); // B
  });
});

describe("allocateSale — discount eligibility by holding period", () => {
  it("parcel held >= 365 days is long-term and eligible for the 50% discount", () => {
    const parcels = buildParcels([tx("BUY", "2020-01-01", 100, 10, 0)]);
    // 2021-01-01 is 366 days after 2020-01-01 (2020 is a leap year).
    const r = allocateSale(
      parcels,
      new Date("2021-01-01"),
      100,
      20,
      0,
      "fifo",
      "individual"
    );
    expect(r[0].isLongTerm).toBe(true);
    // gain = 100*20 - 100*10 = 1000; discounted = 500.
    expect(r[0].gain).toBeCloseTo(1000, 6);
    expect(r[0].discountedGain).toBeCloseTo(500, 6);
    expect(r[0].assessableGain).toBeCloseTo(500, 6);
  });

  it("parcel held < 365 days is short-term and gets no discount", () => {
    const parcels = buildParcels([tx("BUY", "2020-01-01", 100, 10, 0)]);
    const r = allocateSale(
      parcels,
      new Date("2020-06-01"),
      100,
      20,
      0,
      "fifo",
      "individual"
    );
    expect(r[0].isLongTerm).toBe(false);
    expect(r[0].discountedGain).toBeCloseTo(1000, 6); // no discount
    expect(r[0].assessableGain).toBeCloseTo(1000, 6);
  });

  it.each<[string, number]>([
    ["individual", 500],
    ["trust", 500],
    ["smsf", 1000 - 1000 / 3],
    ["company", 1000],
  ])(
    "long-term discount for entity %s → assessable %d",
    (entity, expected) => {
      const parcels = buildParcels([tx("BUY", "2020-01-01", 100, 10, 0)]);
      const r = allocateSale(
        parcels,
        new Date("2021-06-01"),
        100,
        20,
        0,
        "fifo",
        entity
      );
      expect(r[0].assessableGain).toBeCloseTo(expected, 6);
    }
  );

  it("a loss is never discounted (passes through as the nominal loss)", () => {
    const parcels = buildParcels([tx("BUY", "2020-01-01", 100, 20, 0)]);
    const r = allocateSale(
      parcels,
      new Date("2022-01-01"),
      100,
      10,
      0,
      "fifo",
      "individual"
    );
    expect(r[0].gain).toBeCloseTo(-1000, 6);
    expect(r[0].discountedGain).toBeCloseTo(-1000, 6);
    expect(r[0].assessableGain).toBeCloseTo(-1000, 6);
  });
});

describe("allocateSale — CPI indexation (whichever-is-lower)", () => {
  it("uses the indexation method when it yields a lower assessable gain", () => {
    // Acquired pre-cutoff 1998-Q1; event frozen at 1999-Q3.
    const cpi: CpiMap = new Map([
      ["1998-Q1", 100],
      ["1999-Q3", 130], // factor 1.30
    ]);
    const parcels = buildParcels([tx("BUY", "1998-03-15", 100, 10, 0)]);
    // proceeds 100*30 = 3000, costBase 1000.
    // discount: gain 2000 * 0.5 = 1000.
    // indexation: indexedCB 1000*1.3 = 1300; gain 3000-1300 = 1700. 1700 > 1000
    // → discount wins here. Flip prices so indexation wins:
    const r = allocateSale(
      parcels,
      new Date("2005-01-01"),
      100,
      12, // proceeds 1200, gain 200; discount 100; indexation 1200-1300<0 => 0
      0,
      "fifo",
      "individual",
      cpi
    );
    expect(r[0].indexationFactor).toBeCloseTo(1.3, 6);
    expect(r[0].indexationGain).toBeCloseTo(0, 6);
    expect(r[0].methodUsed).toBe("indexation");
    expect(r[0].assessableGain).toBeCloseTo(0, 6);
  });

  it("keeps the discount method when it is lower than indexation", () => {
    const cpi: CpiMap = new Map([
      ["1998-Q1", 100],
      ["1999-Q3", 110], // factor 1.10
    ]);
    const parcels = buildParcels([tx("BUY", "1998-03-15", 100, 10, 0)]);
    const r = allocateSale(
      parcels,
      new Date("2005-01-01"),
      100,
      30, // proceeds 3000, gain 2000; discount 1000; indexation 3000-1100=1900
      0,
      "fifo",
      "individual",
      cpi
    );
    expect(r[0].methodUsed).toBe("discount");
    expect(r[0].assessableGain).toBeCloseTo(1000, 6);
  });
});
