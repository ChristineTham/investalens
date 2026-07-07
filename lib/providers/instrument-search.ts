import { yahooFinance } from "./yahoo-finance";
import { searchDelistedSecurities } from "./delisted";
import type { InstrumentSearchResult } from "./market-data";

export async function searchInstruments(
  query: string,
  market?: string
): Promise<InstrumentSearchResult[]> {
  if (!query || query.length < 1) return [];
  
  const results = await yahooFinance.searchInstruments(query, market);
  if (results.length > 0) {
    return results;
  }

  // Fallback to delisted.com.au if market is ASX (or undefined/all markets)
  if (!market || market.toUpperCase() === "ASX") {
    return searchDelistedSecurities(query);
  }

  return [];
}
