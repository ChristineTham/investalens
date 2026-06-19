import { yahooFinance } from "@/lib/providers/yahoo-finance";

export interface SentimentData {
  fearGreedIndex: number;
  vixLevel: number | null;
  asxSummary: {
    close: number;
    change: number;
    changePercent: number;
    volume: number;
  } | null;
  sectorPerformance: Record<string, number>;
}

// ASX sector ETFs for heatmap
const SECTOR_ETFS: Record<string, string> = {
  Financials: "XFJ.AX",
  Materials: "XMJ.AX",
  Healthcare: "XHJ.AX",
  Energy: "XEJ.AX",
  "Real Estate": "XRE.AX",
  Technology: "XTX.AX",
  Consumer: "XSJ.AX",
  Industrials: "XNJ.AX",
  Utilities: "XUJ.AX",
};

export async function getMarketSentiment(): Promise<SentimentData> {
  // Fetch ASX 200
  const asxQuote = await yahooFinance.getQuote("^AXJO", "ASX");

  // Fetch VIX
  const vixQuote = await yahooFinance.getQuote("^VIX", "US");

  // Fear & Greed approximation from VIX
  // VIX < 15 = extreme greed (90), VIX > 35 = extreme fear (10)
  let fearGreed = 50;
  if (vixQuote) {
    fearGreed = Math.max(0, Math.min(100, 100 - (vixQuote.price - 12) * (80 / 23)));
  }

  // Sector performance
  const sectorPerformance: Record<string, number> = {};
  for (const [sector, symbol] of Object.entries(SECTOR_ETFS)) {
    try {
      const quote = await yahooFinance.getQuote(
        symbol.replace(".AX", ""),
        "ASX"
      );
      if (quote) {
        sectorPerformance[sector] = quote.changePercent;
      }
    } catch {
      // Skip failed fetches
    }
  }

  return {
    fearGreedIndex: Math.round(fearGreed),
    vixLevel: vixQuote?.price ?? null,
    asxSummary: asxQuote
      ? {
          close: asxQuote.price,
          change: asxQuote.change,
          changePercent: asxQuote.changePercent,
          volume: asxQuote.volume,
        }
      : null,
    sectorPerformance,
  };
}
