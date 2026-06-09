import { yahooFinance } from "./yahoo-finance";
import type { InstrumentSearchResult } from "./market-data";

export async function searchInstruments(
  query: string,
  market?: string
): Promise<InstrumentSearchResult[]> {
  if (!query || query.length < 1) return [];
  return yahooFinance.searchInstruments(query, market);
}
