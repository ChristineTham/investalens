import {
  buildParcels,
  allocateSale,
  type SaleAllocationMethod,
  type ParcelSaleResult,
} from "@/lib/calculations/parcels";
import type { CpiMap } from "@/lib/calculations/indexation";
import type { TransactionData } from "@/lib/calculations/performance";

export const ALLOCATION_METHODS: SaleAllocationMethod[] = [
  "fifo",
  "lifo",
  "min_gain",
  "max_gain",
  "min_tax",
];

export interface ParcelMatchResult {
  method: SaleAllocationMethod;
  /** Nominal gain (proceeds less cost base) across allocated parcels. */
  totalGain: number;
  /** Assessable gain after the discount/indexation method per parcel. */
  totalAssessable: number;
  results: ParcelSaleResult[];
}

/**
 * Run all 5 sale-allocation methods over a single sale and return each
 * method's outcome, sorted by lowest assessable gain first. Prior disposals
 * in the transaction history are consumed with the same method being
 * evaluated, so each result reflects "what if the portfolio used this method
 * throughout".
 */
export function optimiseSaleAllocation(
  transactions: TransactionData[],
  saleDate: Date,
  saleQuantity: number,
  salePrice: number,
  brokerage: number,
  taxEntityType: string,
  cpi?: CpiMap
): ParcelMatchResult[] {
  const results: ParcelMatchResult[] = [];

  for (const method of ALLOCATION_METHODS) {
    const parcels = buildParcels(transactions, method, taxEntityType);
    const saleResults = allocateSale(
      parcels,
      saleDate,
      saleQuantity,
      salePrice,
      brokerage,
      method,
      taxEntityType,
      cpi
    );

    const totalGain = saleResults.reduce((s, r) => s + r.gain, 0);
    const totalAssessable = saleResults.reduce(
      (s, r) => s + r.assessableGain,
      0
    );

    results.push({ method, totalGain, totalAssessable, results: saleResults });
  }

  return results.sort((a, b) => a.totalAssessable - b.totalAssessable);
}
