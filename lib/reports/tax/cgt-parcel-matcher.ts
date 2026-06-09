import {
  buildParcels,
  allocateSale,
  type SaleAllocationMethod,
  type ParcelSaleResult,
} from "@/lib/calculations/parcels";
import type { TransactionData } from "@/lib/calculations/performance";

export interface ParcelMatchResult {
  method: SaleAllocationMethod;
  totalGain: number;
  totalTax: number;
  results: ParcelSaleResult[];
}

/**
 * Run all 5 allocation methods and return the one that minimises tax.
 */
export function optimiseSaleAllocation(
  transactions: TransactionData[],
  saleDate: Date,
  saleQuantity: number,
  salePrice: number,
  brokerage: number,
  taxEntityType: string
): ParcelMatchResult[] {
  const methods: SaleAllocationMethod[] = [
    "fifo",
    "lifo",
    "min_gain",
    "max_gain",
    "min_tax",
  ];

  const results: ParcelMatchResult[] = [];

  for (const method of methods) {
    const parcels = buildParcels(transactions);
    const saleResults = allocateSale(
      parcels,
      saleDate,
      saleQuantity,
      salePrice,
      brokerage,
      method,
      taxEntityType
    );

    const totalGain = saleResults.reduce((s, r) => s + r.gain, 0);
    const totalTax = saleResults.reduce((s, r) => s + r.discountedGain, 0);

    results.push({ method, totalGain, totalTax, results: saleResults });
  }

  return results.sort((a, b) => a.totalTax - b.totalTax);
}
