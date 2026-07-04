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

/**
 * Machine-readable acquisition-date marker embedded in a MERGER_IN
 * transaction's comments by `recordMerger` (scrip-for-scrip rollover), e.g.
 * `[acq:2015-03-01]`. When present, the merged-in parcel inherits that
 * acquisition date so the CGT discount / indexation clock is not reset.
 */
const ACQUISITION_DATE_MARKER = /\[acq:(\d{4}-\d{2}-\d{2})\]/;

/**
 * Build CGT parcels from a holding's transaction history.
 *
 * Acquisitions (BUY, TRANSFER_IN, RIGHTS_ISSUE, MERGER_IN, BONUS) create
 * parcels; disposals (SELL, TRANSFER_OUT, MERGER_OUT) consume parcel
 * quantities in the order given by `disposalMethod` (the portfolio's
 * sale-allocation method), so that later disposals only see the parcels
 * that actually remain.
 */
export function buildParcels(
  transactions: TransactionData[],
  disposalMethod: SaleAllocationMethod = "fifo",
  taxEntityType: string = "individual"
): Parcel[] {
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
      case "TRANSFER_IN":
      case "RIGHTS_ISSUE": {
        // Rights issues are ordinary acquisitions: cost base is the amount
        // paid to exercise (quantity × issue price + fees), acquired at the
        // transaction date.
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
      case "MERGER_IN": {
        // Units received in a merger. The recorded price carries the per-unit
        // cost base transferred from the source holding (scrip-for-scrip
        // rollover — see recordMerger). If the transaction comments carry an
        // `[acq:YYYY-MM-DD]` marker, the parcel inherits that original
        // acquisition date; otherwise the merger date is used.
        const totalCost = qty * price + broker;
        const acqMatch = tx.comments?.match(ACQUISITION_DATE_MARKER);
        parcels.push({
          purchaseDate: acqMatch
            ? new Date(acqMatch[1])
            : new Date(tx.tradeDate),
          quantity: qty,
          remainingQuantity: qty,
          costPerUnit: totalCost / qty,
          totalCost,
          holdingPeriodDays: 0,
          isLongTerm: false,
        });
        break;
      }
      case "SELL":
      case "TRANSFER_OUT":
      case "MERGER_OUT": {
        // Disposals consume parcel quantities so later events (and the
        // unrealised CGT report) only see what actually remains. A merger-out
        // is recorded for all units held, so it drains every parcel.
        consumeParcels(
          parcels,
          new Date(tx.tradeDate),
          qty,
          price,
          disposalMethod,
          taxEntityType
        );
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

/**
 * Consume `quantity` units from the given parcels (mutating
 * `remainingQuantity`/`totalCost` in place), in the order implied by the
 * sale-allocation method. Mirrors the ordering used by `allocateSale` so
 * disposals recorded in the transaction history reduce the same parcels the
 * CGT report would have allocated the sale against.
 */
function consumeParcels(
  parcels: Parcel[],
  disposalDate: Date,
  quantity: number,
  price: number,
  method: SaleAllocationMethod,
  taxEntityType: string
): void {
  const available = parcels.filter((p) => p.remainingQuantity > 0);
  for (const p of available) {
    const days = Math.floor(
      (disposalDate.getTime() - p.purchaseDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    p.holdingPeriodDays = days;
    p.isLongTerm = days >= 365;
  }

  const ordered = sortParcels(available, method, price, taxEntityType);

  let remaining = quantity;
  for (const parcel of ordered) {
    if (remaining <= 0) break;
    const consumed = Math.min(remaining, parcel.remainingQuantity);
    parcel.remainingQuantity -= consumed;
    parcel.totalCost -= consumed * parcel.costPerUnit;
    if (parcel.totalCost < 0) parcel.totalCost = 0;
    remaining -= consumed;
  }
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
