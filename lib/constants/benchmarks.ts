export const BENCHMARKS = {
  "^AXJO": { name: "S&P/ASX 200", market: "ASX", type: "equity" },
  "IOZ.AX": {
    name: "iShares Core S&P/ASX 200 ETF",
    market: "ASX",
    type: "equity-tr",
  },
  "^GSPC": { name: "S&P 500", market: "NYSE", type: "equity" },
  URTH: { name: "MSCI World ETF", market: "NYSE", type: "equity" },
  "STW.AX": { name: "SPDR S&P/ASX 200 Fund", market: "ASX", type: "equity" },
  SPY: { name: "SPDR S&P 500 ETF Trust", market: "NYSE", type: "equity" },
} as const;

export type BenchmarkCode = keyof typeof BENCHMARKS;
