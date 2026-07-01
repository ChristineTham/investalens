import type { PricePoint } from "./market-data";

export function toEodhdSymbol(code: string, market: string): string {
  if (code.startsWith("^")) {
    return `${code.slice(1).toUpperCase()}.INDX`;
  }
  const baseCode = code.split(".")[0].toUpperCase();
  const exchangeMap: Record<string, string> = {
    ASX: "AU",
    NYSE: "US",
    NASDAQ: "US",
    LSE: "LSE",
    TSX: "TO",
    HKG: "HK",
    SGX: "SG",
    NZX: "NZ",
  };
  const exchange = exchangeMap[market.toUpperCase()] || market.toUpperCase();
  return `${baseCode}.${exchange}`;
}

interface EodhdPriceRecord {
  date: string;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  adjusted_close?: number;
  volume?: number;
  warning?: string;
}

export const eodhd = {
  async getHistoricalPrices(
    code: string,
    market: string,
    from: Date,
    to: Date
  ): Promise<PricePoint[]> {
    const apiKey = process.env.EODHD_API_KEY;
    if (!apiKey) {
      console.warn("EODHD_API_KEY is not defined in the environment.");
      return [];
    }

    const symbol = toEodhdSymbol(code, market);
    const fromStr = from.toISOString().split("T")[0];
    const toStr = to.toISOString().split("T")[0];

    async function doFetch(sym: string): Promise<PricePoint[]> {
      const url = `https://eodhd.com/api/eod/${encodeURIComponent(sym)}?from=${fromStr}&to=${toStr}&api_token=${apiKey}&fmt=json`;
      const res = await fetch(url, {
        headers: { "User-Agent": "InvestaLens/1.0" },
        signal: AbortSignal.timeout(30000),
      });
      if (res.status === 404) {
        return [];
      }
      if (!res.ok) {
        throw new Error(`EODHD API error: ${res.status} ${res.statusText}`);
      }
      const data = (await res.json()) as EodhdPriceRecord[];
      if (!Array.isArray(data)) {
        return [];
      }
      return data
        .filter((p): p is EodhdPriceRecord => Boolean(p && p.date && p.close !== undefined && !p.warning))
        .map((p) => ({
          date: new Date(p.date),
          open: Number(p.open) || 0,
          high: Number(p.high) || 0,
          low: Number(p.low) || 0,
          close: Number(p.close),
          adjustedClose: Number(p.adjusted_close) || Number(p.close),
          volume: Number(p.volume) || 0,
        }));
    }

    try {
      let prices = await doFetch(symbol);
      if (prices.length === 0 && !symbol.includes("_old")) {
        const parts = symbol.split(".");
        const delistedSymbol = `${parts[0]}_old.${parts[1] || "US"}`;
        console.log(`  [EODHD] Primary fetch returned no prices. Retrying with delisted suffix: ${delistedSymbol}`);
        try {
          const fallbackPrices = await doFetch(delistedSymbol);
          if (fallbackPrices.length > 0) {
            prices = fallbackPrices;
          }
        } catch (e) {
          console.warn(`  [EODHD] Delisted fallback retry failed for ${delistedSymbol}:`, e);
        }
      }
      return prices;
    } catch (error) {
      console.error(`Failed to fetch historical prices from EODHD for ${symbol}:`, error);
      return [];
    }
  }
};
