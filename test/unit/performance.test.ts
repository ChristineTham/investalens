import { describe, it, expect } from "vitest";
import {
  annualiseReturn,
  calculateHoldingPerformance,
  calculatePortfolioPerformance,
  type TransactionData,
  type PriceData,
  type HoldingPerformance,
} from "@/lib/calculations/performance";

function tx(overrides: Partial<TransactionData>): TransactionData {
  return {
    id: "t",
    transactionType: "BUY",
    tradeDate: new Date("2024-01-01"),
    quantity: 0,
    price: 0,
    brokerage: 0,
    exchangeRate: 1,
    currency: "AUD",
    ...overrides,
  };
}

describe("annualiseReturn", () => {
  it("returns the input unchanged for periods <= 366 days", () => {
    expect(annualiseReturn(20, 200)).toBe(20);
    expect(annualiseReturn(20, 366)).toBe(20);
  });

  it("returns the input unchanged for a total loss (<= -100%)", () => {
    expect(annualiseReturn(-100, 730)).toBe(-100);
  });

  it("annualises a multi-year total return (CAGR-style)", () => {
    // 2 years (730 days -> years = 730/365 = 2). Total 100% -> (1+1)^(1/2)-1 = sqrt(2)-1
    const expected = (Math.pow(2, 1 / 2) - 1) * 100;
    expect(annualiseReturn(100, 730)).toBeCloseTo(expected, 10);
  });
});

describe("calculateHoldingPerformance", () => {
  const range = { from: new Date("2024-01-01"), to: new Date("2024-12-31") };

  it("computes capital gain = marketValue + sold - (opening + bought)", () => {
    // Buy 100 @ $10 (+$5 brokerage) inside period, no opening position.
    // End price $12 (priced on 2024-06-01, <= to).
    const transactions = [
      tx({ transactionType: "BUY", quantity: 100, price: 10, brokerage: 5, tradeDate: new Date("2024-02-01") }),
    ];
    const prices: PriceData[] = [{ date: new Date("2024-06-01"), close: 12 }];

    const r = calculateHoldingPerformance(transactions, prices, range);
    // openingValue=0, totalBought=100*10+5=1005, marketValue=100*12=1200
    // capitalGain = 1200 + 0 - (0 + 1005) = 195
    expect(r.capitalGain).toBeCloseTo(195, 10);
    expect(r.marketValue).toBeCloseTo(1200, 10);
    expect(r.costBase).toBeCloseTo(1005, 10);
    expect(r.dividendIncome).toBeCloseTo(0, 10);
    expect(r.totalReturn).toBeCloseTo(195, 10);
  });

  it("dividend income nets accrued interest: BUY subtracts accrued, SELL adds accrued", () => {
    // BUY: dividends -= accrued; DIVIDEND: dividends += qty*price
    const transactions = [
      tx({ transactionType: "BUY", quantity: 100, price: 10, brokerage: 0, accruedInterest: 7, tradeDate: new Date("2024-02-01") }),
      tx({ transactionType: "DIVIDEND", quantity: 100, price: 0.5, tradeDate: new Date("2024-05-01") }),
      tx({ transactionType: "SELL", quantity: 40, price: 11, brokerage: 0, accruedInterest: 3, tradeDate: new Date("2024-08-01") }),
    ];
    const prices: PriceData[] = [{ date: new Date("2024-06-01"), close: 12 }];

    const r = calculateHoldingPerformance(transactions, prices, range);
    // dividends: -7 (buy accrued) + 100*0.5=50 (dividend) + 3 (sell accrued) = 46
    expect(r.dividendIncome).toBeCloseTo(46, 10);
  });

  it("total return = capital gain + dividend income", () => {
    const transactions = [
      tx({ transactionType: "BUY", quantity: 10, price: 100, brokerage: 0, tradeDate: new Date("2024-02-01") }),
      tx({ transactionType: "DIVIDEND", quantity: 10, price: 2, tradeDate: new Date("2024-05-01") }),
    ];
    const prices: PriceData[] = [{ date: new Date("2024-06-01"), close: 110 }];

    const r = calculateHoldingPerformance(transactions, prices, range);
    // bought=1000, marketValue=10*110=1100, capitalGain=1100-1000=100, dividends=20
    expect(r.capitalGain).toBeCloseTo(100, 10);
    expect(r.dividendIncome).toBeCloseTo(20, 10);
    expect(r.totalReturn).toBeCloseTo(120, 10);
    expect(r.totalReturnPercent).toBeCloseTo((120 / 1000) * 100, 10);
  });

  it("uses opening position priced before the range start", () => {
    // Buy 50 @ $8 before the period start -> opening position.
    const transactions = [
      tx({ transactionType: "BUY", quantity: 50, price: 8, brokerage: 0, tradeDate: new Date("2023-11-01") }),
    ];
    const prices: PriceData[] = [
      { date: new Date("2023-12-15"), close: 9 }, // priceAtStart (< from)
      { date: new Date("2024-12-01"), close: 15 }, // priceAtEnd (<= to)
    ];
    const r = calculateHoldingPerformance(transactions, prices, range);
    // qtyAtStart=50, priceAtStart=9 -> openingValue=450
    // qtyAtEnd=50, priceAtEnd=15 -> marketValue=750
    // totalBought=0 (no in-range buys), capitalGain = 750 + 0 - (450 + 0) = 300
    expect(r.costBase).toBeCloseTo(450, 10);
    expect(r.marketValue).toBeCloseTo(750, 10);
    expect(r.capitalGain).toBeCloseTo(300, 10);
  });

  it("returns 0% totalReturnPercent when cost base is zero", () => {
    const r = calculateHoldingPerformance([], [], range);
    expect(r.costBase).toBe(0);
    expect(r.totalReturnPercent).toBe(0);
  });
});

describe("calculatePortfolioPerformance", () => {
  function hp(overrides: Partial<HoldingPerformance>): HoldingPerformance {
    return {
      holdingId: "",
      instrumentCode: "",
      capitalGain: 0,
      dividendIncome: 0,
      currencyGain: 0,
      totalReturn: 0,
      totalReturnPercent: 0,
      annualisedReturn: 0,
      costBase: 0,
      marketValue: 0,
      contribution: 0,
      ...overrides,
    };
  }

  it("aggregates totals and computes contribution percentages", () => {
    const holdings = [
      hp({ capitalGain: 100, dividendIncome: 20, currencyGain: 5, costBase: 1000, marketValue: 1120, totalReturn: 125 }),
      hp({ capitalGain: -30, dividendIncome: 10, currencyGain: 0, costBase: 500, marketValue: 480, totalReturn: -20 }),
    ];
    const p = calculatePortfolioPerformance(holdings);
    expect(p.totalCostBase).toBeCloseTo(1500, 10);
    expect(p.totalMarketValue).toBeCloseTo(1600, 10);
    expect(p.capitalGains).toBeCloseTo(70, 10);
    expect(p.dividendIncome).toBeCloseTo(30, 10);
    expect(p.currencyGains).toBeCloseTo(5, 10);
    // totalReturn = 70 + 30 + 5 = 105
    expect(p.totalReturn).toBeCloseTo(105, 10);
    expect(p.totalReturnPercent).toBeCloseTo((105 / 1500) * 100, 10);
    // contributions use each holding's totalReturn / portfolio totalReturn
    expect(p.holdings[0].contribution).toBeCloseTo((125 / 105) * 100, 10);
    expect(p.holdings[1].contribution).toBeCloseTo((-20 / 105) * 100, 10);
  });

  it("sets contribution to 0 when portfolio totalReturn is 0", () => {
    const holdings = [hp({ capitalGain: 0, dividendIncome: 0, currencyGain: 0, totalReturn: 50 })];
    const p = calculatePortfolioPerformance(holdings);
    expect(p.totalReturn).toBe(0);
    expect(p.holdings[0].contribution).toBe(0);
  });
});
