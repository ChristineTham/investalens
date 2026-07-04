export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * Convert a cumulative total return (%) over `days` into an annualised
 * (CAGR-style) return (%). Periods of a year or less are returned unchanged
 * (a 1-year total return already equals its annualised value). Guards against
 * a total loss producing NaN.
 */
export function annualiseReturn(totalPercent: number, days: number): number {
  if (days <= 366 || totalPercent <= -100) return totalPercent;
  const years = days / 365;
  return (Math.pow(1 + totalPercent / 100, 1 / years) - 1) * 100;
}

export interface TransactionData {
  id: string;
  transactionType: string;
  tradeDate: Date;
  quantity: number | { toNumber(): number };
  price: number | { toNumber(): number };
  brokerage: number | { toNumber(): number };
  exchangeRate: number | { toNumber(): number };
  currency: string;
  comments?: string | null;
  accruedInterest?: number | { toNumber(): number } | null;
  frankedAmount?: number | { toNumber(): number } | null;
  unfrankedAmount?: number | { toNumber(): number } | null;
  frankingCredits?: number | { toNumber(): number } | null;
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
  const sortedTx = [...transactions].sort((a, b) => a.tradeDate.getTime() - b.tradeDate.getTime());

  // 1. Calculate qtyAtStart and qtyAtEnd
  let qtyAtStart = 0;
  let qtyAtEnd = 0;
  for (const tx of sortedTx) {
    const qty = Number(tx.quantity);
    if (tx.tradeDate < dateRange.from) {
      if (tx.transactionType === "BUY") {
        qtyAtStart += qty;
      } else if (tx.transactionType === "SELL") {
        qtyAtStart -= qty;
      } else if (tx.transactionType === "SPLIT") {
        qtyAtStart *= qty;
      }
    }
    if (tx.tradeDate <= dateRange.to) {
      if (tx.transactionType === "BUY") {
        qtyAtEnd += qty;
      } else if (tx.transactionType === "SELL") {
        qtyAtEnd -= qty;
      } else if (tx.transactionType === "SPLIT") {
        qtyAtEnd *= qty;
      }
    }
  }

  // 2. Find priceAtStart and priceAtEnd
  const sortedPricesDesc = [...prices].sort((a, b) => b.date.getTime() - a.date.getTime());
  
  const priceAtStart = sortedPricesDesc.find((p) => p.date < dateRange.from)?.close || 0;
  const priceAtEnd = sortedPricesDesc.find((p) => p.date <= dateRange.to)?.close || 0;

  // 3. Opening value and Closing value
  const openingValue = qtyAtStart * priceAtStart;
  const marketValue = qtyAtEnd * priceAtEnd;

  // 4. In-period transactions
  let totalBought = 0;
  let totalSold = 0;
  let dividends = 0;

  const filteredTx = transactions.filter(
    (tx) => tx.tradeDate >= dateRange.from && tx.tradeDate <= dateRange.to
  );

  for (const tx of filteredTx) {
    const qty = Number(tx.quantity);
    const price = Number(tx.price);
    const broker = Number(tx.brokerage);
    const accrued = Number(tx.accruedInterest ?? 0);

    switch (tx.transactionType) {
      case "BUY":
        totalBought += qty * price + broker;
        // Accrued interest paid on purchase is recovered at the next coupon,
        // so it offsets (reduces) income rather than being capitalised.
        dividends -= accrued;
        break;
      case "SELL":
        totalSold += qty * price - broker;
        // Accrued interest received on sale is income.
        dividends += accrued;
        break;
      case "DIVIDEND":
      case "INTEREST":
      case "COUPON":
        dividends += qty * price;
        break;
    }
  }

  // 5. Capital Gain & Return calculations
  const capitalGain = marketValue + totalSold - (openingValue + totalBought);
  const totalReturn = capitalGain + dividends;
  
  const costBase = openingValue + totalBought;
  const totalReturnPercent = costBase > 0 ? (totalReturn / costBase) * 100 : 0;

  const days = (dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24);
  const annualisedReturn = annualiseReturn(totalReturnPercent, days);

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
