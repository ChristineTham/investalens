import type { TransactionData } from "./performance";

export interface Position {
  quantity: number;
  averageCost: number;
  totalCostBase: number;
  marketValue: number;
  unrealisedGain: number;
  unrealisedGainPercent: number;
}

export function calculatePosition(
  transactions: TransactionData[],
  currentPrice: number
): Position {
  let quantity = 0;
  let totalCostBase = 0;

  // Sort transactions by date
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime()
  );

  for (const tx of sorted) {
    const qty = Number(tx.quantity);
    const price = Number(tx.price);
    const broker = Number(tx.brokerage);

    switch (tx.transactionType) {
      case "BUY":
      case "TRANSFER_IN":
        totalCostBase += qty * price + broker;
        quantity += qty;
        break;
      case "SELL":
      case "TRANSFER_OUT": {
        const avgCost = quantity > 0 ? totalCostBase / quantity : 0;
        totalCostBase -= qty * avgCost;
        quantity -= qty;
        break;
      }
      case "SPLIT": {
        // qty is the split ratio (e.g. 2 for 2:1 split)
        quantity *= qty;
        // cost base remains the same, average cost adjusts
        break;
      }
      case "RETURN_OF_CAPITAL": {
        // Reduces cost base
        totalCostBase -= qty * price;
        if (totalCostBase < 0) totalCostBase = 0;
        break;
      }
      case "BONUS": {
        quantity += qty;
        // Bonus shares have zero cost
        break;
      }
    }
  }

  const averageCost = quantity > 0 ? totalCostBase / quantity : 0;
  const marketValue = quantity * currentPrice;
  const unrealisedGain = marketValue - totalCostBase;
  const unrealisedGainPercent =
    totalCostBase > 0 ? (unrealisedGain / totalCostBase) * 100 : 0;

  return {
    quantity,
    averageCost,
    totalCostBase,
    marketValue,
    unrealisedGain,
    unrealisedGainPercent,
  };
}

/** Transaction types that represent income (dividends, interest, coupons). */
export const INCOME_TYPES = ["DIVIDEND", "INTEREST", "COUPON"] as const;

/**
 * Net income from a holding's transactions.
 *
 * Income = dividends + interest + coupons received, net of accrued interest:
 * accrued interest paid on a BUY is recovered at the next coupon (so it reduces
 * income), and accrued interest received on a SELL is income.
 */
export function calculateIncome(transactions: TransactionData[]): number {
  let income = 0;
  for (const tx of transactions) {
    const accrued = Number(tx.accruedInterest ?? 0);
    switch (tx.transactionType) {
      case "DIVIDEND":
      case "INTEREST":
      case "COUPON":
        income += Number(tx.quantity) * Number(tx.price);
        break;
      case "BUY":
      case "TRANSFER_IN":
        income -= accrued;
        break;
      case "SELL":
      case "TRANSFER_OUT":
        income += accrued;
        break;
    }
  }
  return income;
}
