import type { TransactionData } from "./performance";
import { currentLawIndexationFactor, type CpiMap } from "./indexation";

export interface Parcel {
  purchaseDate: Date;
  quantity: number;
  remainingQuantity: number;
  costPerUnit: number;
  totalCost: number;
  holdingPeriodDays: number;
  isLongTerm: boolean; // >= 365 days
}

export interface ParcelSaleResult {
  parcel: Parcel;
  quantitySold: number;
  proceeds: number;
  costBase: number;
  gain: number;
  isLongTerm: boolean;
  discountedGain: number;
  /** Cost base after CPI indexation (= costBase when indexation isn't applied). */
  indexedCostBase: number;
  /** Indexation factor applied (1 when not applied). */
  indexationFactor: number;
  /** Assessable gain under the indexation method (no discount). */
  indexationGain: number;
  /** Method giving the lower assessable gain for this parcel. */
  methodUsed: "discount" | "indexation";
  /** Assessable gain after the chosen method (or the nominal loss). */
  assessableGain: number;
}

export type SaleAllocationMethod =
  | "fifo"
  | "lifo"
  | "min_gain"
  | "max_gain"
  | "min_tax";

export function buildParcels(transactions: TransactionData[]): Parcel[] {
  const parcels: Parcel[] = [];

  const sorted = [...transactions].sort(
    (a, b) => new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime()
  );

  for (const tx of sorted) {
    const qty = Number(tx.quantity);
    const price = Number(tx.price);
    const broker = Number(tx.brokerage);

    switch (tx.transactionType) {
      case "BUY":
      case "TRANSFER_IN": {
        const totalCost = qty * price + broker;
        parcels.push({
          purchaseDate: new Date(tx.tradeDate),
          quantity: qty,
          remainingQuantity: qty,
          costPerUnit: totalCost / qty,
          totalCost,
          holdingPeriodDays: 0,
          isLongTerm: false,
        });
        break;
      }
      case "SPLIT": {
        // Multiply all remaining parcels
        for (const parcel of parcels) {
          if (parcel.remainingQuantity > 0) {
            parcel.remainingQuantity *= qty;
            parcel.quantity *= qty;
            parcel.costPerUnit /= qty;
          }
        }
        break;
      }
      case "RETURN_OF_CAPITAL": {
        // Reduce cost base across parcels proportionally
        const totalRemaining = parcels.reduce(
          (sum, p) => sum + p.remainingQuantity,
          0
        );
        if (totalRemaining > 0) {
          const reduction = qty * price;
          for (const parcel of parcels) {
            if (parcel.remainingQuantity > 0) {
              const proportion = parcel.remainingQuantity / totalRemaining;
              const parcelReduction = reduction * proportion;
              parcel.totalCost -= parcelReduction;
              if (parcel.totalCost < 0) parcel.totalCost = 0;
              parcel.costPerUnit =
                parcel.remainingQuantity > 0
                  ? parcel.totalCost / parcel.remainingQuantity
                  : 0;
            }
          }
        }
        break;
      }
      case "BONUS": {
        // Zero cost parcel
        parcels.push({
          purchaseDate: new Date(tx.tradeDate),
          quantity: qty,
          remainingQuantity: qty,
          costPerUnit: 0,
          totalCost: 0,
          holdingPeriodDays: 0,
          isLongTerm: false,
        });
        break;
      }
    }
  }

  return parcels;
}

export function allocateSale(
  parcels: Parcel[],
  saleDate: Date,
  saleQuantity: number,
  salePrice: number,
  brokerage: number,
  method: SaleAllocationMethod,
  taxEntityType: string = "individual",
  cpi?: CpiMap
): ParcelSaleResult[] {
  // Update holding periods
  const available = parcels
    .filter((p) => p.remainingQuantity > 0)
    .map((p) => {
      const days = Math.floor(
        (saleDate.getTime() - p.purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return { ...p, holdingPeriodDays: days, isLongTerm: days >= 365 };
    });

  // Sort according to method
  const sorted = sortParcels(available, method, salePrice, taxEntityType);

  const results: ParcelSaleResult[] = [];
  let remaining = saleQuantity;
  const totalProceeds = saleQuantity * salePrice - brokerage;

  for (const parcel of sorted) {
    if (remaining <= 0) break;

    const quantitySold = Math.min(remaining, parcel.remainingQuantity);
    const costBase = quantitySold * parcel.costPerUnit;
    const proceeds = (quantitySold / saleQuantity) * totalProceeds;
    const gain = proceeds - costBase;

    const discountRate = getDiscountRate(taxEntityType, parcel.isLongTerm);
    const discountedGain = gain > 0 ? gain * (1 - discountRate) : gain;

    // Current-law CPI indexation method (assets acquired before 21 Sep 1999):
    // index the cost base, compute the gain with no discount, and use whichever
    // method gives the lower assessable gain. Indexation cannot create a loss.
    let indexedCostBase = costBase;
    let indexationFactor = 1;
    let indexationGain = gain;
    let methodUsed: "discount" | "indexation" = "discount";
    let assessableGain = discountedGain;

    if (cpi && gain > 0) {
      const factor = currentLawIndexationFactor(
        parcel.purchaseDate,
        saleDate,
        cpi
      );
      if (factor != null && factor > 1) {
        indexationFactor = factor;
        indexedCostBase = costBase * factor;
        indexationGain = Math.max(0, proceeds - indexedCostBase);
        if (indexationGain < discountedGain) {
          methodUsed = "indexation";
          assessableGain = indexationGain;
        }
      }
    }

    results.push({
      parcel,
      quantitySold,
      proceeds,
      costBase,
      gain,
      isLongTerm: parcel.isLongTerm,
      discountedGain,
      indexedCostBase,
      indexationFactor,
      indexationGain,
      methodUsed,
      assessableGain,
    });

    remaining -= quantitySold;
  }

  return results;
}

function sortParcels(
  parcels: Parcel[],
  method: SaleAllocationMethod,
  salePrice: number,
  taxEntityType: string
): Parcel[] {
  const sorted = [...parcels];

  switch (method) {
    case "fifo":
      sorted.sort(
        (a, b) => a.purchaseDate.getTime() - b.purchaseDate.getTime()
      );
      break;
    case "lifo":
      sorted.sort(
        (a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime()
      );
      break;
    case "min_gain":
      // Highest cost first = minimum gain
      sorted.sort((a, b) => b.costPerUnit - a.costPerUnit);
      break;
    case "max_gain":
      // Lowest cost first = maximum gain
      sorted.sort((a, b) => a.costPerUnit - b.costPerUnit);
      break;
    case "min_tax":
      // Complex: considers both cost base and discount eligibility
      sorted.sort((a, b) => {
        const gainA = salePrice - a.costPerUnit;
        const gainB = salePrice - b.costPerUnit;
        const discountA = getDiscountRate(taxEntityType, a.isLongTerm);
        const discountB = getDiscountRate(taxEntityType, b.isLongTerm);
        const taxA = gainA > 0 ? gainA * (1 - discountA) : gainA;
        const taxB = gainB > 0 ? gainB * (1 - discountB) : gainB;
        return taxA - taxB;
      });
      break;
  }

  return sorted;
}

function getDiscountRate(taxEntityType: string, isLongTerm: boolean): number {
  if (!isLongTerm) return 0;
  switch (taxEntityType) {
    case "individual":
    case "trust":
      return 0.5;
    case "smsf":
      return 1 / 3;
    case "company":
      return 0;
    default:
      return 0;
  }
}
