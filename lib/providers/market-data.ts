export interface Quote {
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
}

export interface PricePoint {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  adjustedClose: number;
  volume: number;
}

export interface InstrumentSearchResult {
  code: string;
  name: string;
  exchange: string;
  type: string;
}

export interface MarketDataProvider {
  getQuote(code: string, market: string): Promise<Quote | null>;
  getHistoricalPrices(
    code: string,
    market: string,
    from: Date,
    to: Date
  ): Promise<PricePoint[]>;
  searchInstruments(
    query: string,
    market?: string
  ): Promise<InstrumentSearchResult[]>;
}
