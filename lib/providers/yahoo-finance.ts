import type {
  MarketDataProvider,
  Quote,
  PricePoint,
  InstrumentSearchResult,
} from "./market-data";

function toYahooSymbol(code: string, market: string): string {
  const marketSuffix: Record<string, string> = {
    ASX: ".AX",
    LSE: ".L",
    TSX: ".TO",
    HKG: ".HK",
    SGX: ".SI",
    NZX: ".NZ",
  };
  const suffix = marketSuffix[market.toUpperCase()] || "";
  return `${code}${suffix}`;
}

async function fetchWithRetry(
  url: string,
  retries = 2,
  delay = 1000
): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(url, {
      headers: { "User-Agent": "InvestaLens/1.0" },
    });
    if (res.ok) return res;
    if (res.status === 429 && i < retries) {
      await new Promise((r) => setTimeout(r, delay * (i + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`Yahoo Finance API error: ${res.status}`);
  }
  throw new Error("Max retries exceeded");
}

export const yahooFinance: MarketDataProvider = {
  async getQuote(code: string, market: string): Promise<Quote | null> {
    const symbol = toYahooSymbol(code, market);
    try {
      const res = await fetchWithRetry(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`
      );
      const data = await res.json();
      const result = data.chart?.result?.[0];
      if (!result) return null;

      const meta = result.meta;
      const previousClose = meta.chartPreviousClose || meta.previousClose || 0;
      const price = meta.regularMarketPrice || 0;

      return {
        price,
        change: price - previousClose,
        changePercent:
          previousClose > 0
            ? ((price - previousClose) / previousClose) * 100
            : 0,
        volume: meta.regularMarketVolume || 0,
        timestamp: new Date(meta.regularMarketTime * 1000),
      };
    } catch {
      return null;
    }
  },

  async getHistoricalPrices(
    code: string,
    market: string,
    from: Date,
    to: Date
  ): Promise<PricePoint[]> {
    const symbol = toYahooSymbol(code, market);
    const period1 = Math.floor(from.getTime() / 1000);
    const period2 = Math.floor(to.getTime() / 1000);

    try {
      const res = await fetchWithRetry(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d`
      );
      const data = await res.json();
      const result = data.chart?.result?.[0];
      if (!result) return [];

      const timestamps = result.timestamp || [];
      const quotes = result.indicators?.quote?.[0] || {};
      const adjClose = result.indicators?.adjclose?.[0]?.adjclose || [];

      const prices: PricePoint[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        if (quotes.close?.[i] == null) continue;
        prices.push({
          date: new Date(timestamps[i] * 1000),
          open: quotes.open?.[i] || 0,
          high: quotes.high?.[i] || 0,
          low: quotes.low?.[i] || 0,
          close: quotes.close[i],
          adjustedClose: adjClose[i] || quotes.close[i],
          volume: quotes.volume?.[i] || 0,
        });
      }

      return prices;
    } catch {
      return [];
    }
  },

  async searchInstruments(
    query: string,
    market?: string
  ): Promise<InstrumentSearchResult[]> {
    try {
      const res = await fetchWithRetry(
        `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`
      );
      const data = await res.json();
      const quotes = data.quotes || [];

      let results: InstrumentSearchResult[] = quotes.map(
        (q: { symbol: string; shortname?: string; longname?: string; exchange: string; quoteType: string }) => ({
          code: q.symbol.replace(/\..+$/, ""),
          name: q.shortname || q.longname || q.symbol,
          exchange: q.exchange,
          type: q.quoteType?.toLowerCase() || "equity",
        })
      );

      if (market) {
        const exchangeMap: Record<string, string[]> = {
          ASX: ["ASX", "AX"],
          NYSE: ["NYQ", "NYSE"],
          NASDAQ: ["NMS", "NGM", "NASDAQ"],
          LSE: ["LSE", "LON"],
        };
        const validExchanges = exchangeMap[market.toUpperCase()] || [market];
        results = results.filter((r) =>
          validExchanges.some((e) =>
            r.exchange.toUpperCase().includes(e.toUpperCase())
          )
        );
      }

      return results;
    } catch {
      return [];
    }
  },
};
