import type { Decimal } from "../../generated/prisma/runtime/library";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface TransactionData {
  id: string;
  transactionType: string;
  tradeDate: Date;
  quantity: number | Decimal;
  price: number | Decimal;
  brokerage: number | Decimal;
  exchangeRate: number | Decimal;
  currency: string;
  frankedAmount?: number | Decimal | null;
  unfrankedAmount?: number | Decimal | null;
  frankingCredits?: number | Decimal | null;
}

export interface PriceData {
  date: Date;
  close: number;
}

export interface HoldingPerformance {
  holdingId: string;
  instrumentCode: string;
  capitalGain: number;
  dividendIncome: number;
  currencyGain: number;
  totalReturn: number;
  totalReturnPercent: number;
  annualisedReturn: number;
  costBase: number;
  marketValue: number;
  contribution: number;
}

export interface PortfolioPerformance {
  holdings: HoldingPerformance[];
  totalCostBase: number;
  totalMarketValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  annualisedReturn: number;
  capitalGains: number;
  dividendIncome: number;
  currencyGains: number;
}

export function calculateHoldingPerformance(
  transactions: TransactionData[],
  prices: PriceData[],
  dateRange: DateRange
): HoldingPerformance {
  let totalBought = 0;
  let totalSold = 0;
  let dividends = 0;
  let quantity = 0;
  let costBase = 0;
  let brokerage = 0;

  const filteredTx = transactions.filter(
    (tx) => tx.tradeDate >= dateRange.from && tx.tradeDate <= dateRange.to
  );

  for (const tx of filteredTx) {
    const qty = Number(tx.quantity);
    const price = Number(tx.price);
    const broker = Number(tx.brokerage);

    switch (tx.transactionType) {
      case "BUY":
        totalBought += qty * price + broker;
        quantity += qty;
        costBase += qty * price + broker;
        brokerage += broker;
        break;
      case "SELL":
        totalSold += qty * price - broker;
        quantity -= qty;
        brokerage += broker;
        break;
      case "DIVIDEND":
      case "INTEREST":
      case "COUPON":
        dividends += qty * price;
        break;
      case "SPLIT": {
        // For splits, quantity is the multiplier
        quantity = quantity * qty;
        break;
      }
    }
  }

  // Get current price (last available)
  const sortedPrices = prices
    .filter((p) => p.date <= dateRange.to)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  const currentPrice = sortedPrices[0]?.close || 0;

  const marketValue = quantity * currentPrice;
  const capitalGain = marketValue + totalSold - totalBought;
  const totalReturn = capitalGain + dividends;
  const totalReturnPercent = costBase > 0 ? (totalReturn / costBase) * 100 : 0;

  const days =
    (dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24);
  const annualisedReturn = annualiseReturn(
    totalReturnPercent / 100,
    days
  );

  return {
    holdingId: "",
    instrumentCode: "",
    capitalGain,
    dividendIncome: dividends,
    currencyGain: 0,
    totalReturn,
    totalReturnPercent,
    annualisedReturn,
    costBase,
    marketValue,
    contribution: 0,
  };
}

export function calculatePortfolioPerformance(
  holdingPerformances: HoldingPerformance[]
): PortfolioPerformance {
  const totalCostBase = holdingPerformances.reduce(
    (sum, h) => sum + h.costBase,
    0
  );
  const totalMarketValue = holdingPerformances.reduce(
    (sum, h) => sum + h.marketValue,
    0
  );
  const capitalGains = holdingPerformances.reduce(
    (sum, h) => sum + h.capitalGain,
    0
  );
  const dividendIncome = holdingPerformances.reduce(
    (sum, h) => sum + h.dividendIncome,
    0
  );
  const currencyGains = holdingPerformances.reduce(
    (sum, h) => sum + h.currencyGain,
    0
  );
  const totalReturn = capitalGains + dividendIncome + currencyGains;
  const totalReturnPercent =
    totalCostBase > 0 ? (totalReturn / totalCostBase) * 100 : 0;

  // Calculate contribution percentages
  const holdings = holdingPerformances.map((h) => ({
    ...h,
    contribution: totalReturn !== 0 ? (h.totalReturn / totalReturn) * 100 : 0,
  }));

  return {
    holdings,
    totalCostBase,
    totalMarketValue,
    totalReturn,
    totalReturnPercent,
    annualisedReturn: 0,
    capitalGains,
    dividendIncome,
    currencyGains,
  };
}

export function annualiseReturn(totalReturn: number, days: number): number {
  if (days <= 0 || totalReturn <= -1) return 0;
  return (Math.pow(1 + totalReturn, 365.25 / days) - 1) * 100;
}
