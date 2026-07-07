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

export interface DividendPoint {
  date: Date;
  amount: number;
}

export interface SplitPoint {
  date: Date;
  numerator: number;
  denominator: number;
  /** Split factor (numerator / denominator), e.g. 2 for a 2-for-1 split. */
  ratio: number;
}

export interface InstrumentSearchResult {
  code: string;
  name: string;
  exchange: string;
  type: string;
  isDelisted?: boolean;
}

export interface MarketDataProvider {
  getQuote(code: string, market: string): Promise<Quote | null>;
  getHistoricalPrices(
    code: string,
    market: string,
    from: Date,
    to: Date
  ): Promise<PricePoint[]>;
  getHistoricalDividends(
    code: string,
    market: string,
    from: Date,
    to: Date
  ): Promise<DividendPoint[]>;
  getHistoricalSplits(
    code: string,
    market: string,
    from: Date,
    to: Date
  ): Promise<SplitPoint[]>;
  searchInstruments(
    query: string,
    market?: string
  ): Promise<InstrumentSearchResult[]>;
}
