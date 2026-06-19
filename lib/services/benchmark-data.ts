import { db } from "@/lib/db";

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

// AUD cash rate (RBA) — updated periodically
const RISK_FREE_RATE_ANNUAL = 0.0435;

export async function getRiskFreeRate(): Promise<number> {
  return RISK_FREE_RATE_ANNUAL;
}

export async function getBenchmarkReturns(
  code: string,
  startDate: Date,
  endDate: Date
): Promise<{ dates: string[]; returns: number[] }> {
  const instrument = await db.instrument.findFirst({
    where: { code },
  });

  if (!instrument) {
    throw new Error(`Benchmark instrument not found: ${code}`);
  }

  const prices = await db.price.findMany({
    where: {
      instrumentId: instrument.id,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: "asc" },
  });

  const dates: string[] = [];
  const returns: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    dates.push(prices[i].date.toISOString().split("T")[0]);
    if (i === 0) {
      returns.push(0);
    } else {
      const prev = Number(prices[i - 1].close);
      const curr = Number(prices[i].close);
      returns.push(prev !== 0 ? (curr - prev) / prev : 0);
    }
  }

  return { dates, returns };
}

export async function getAvailableBenchmarks(): Promise<
  { code: string; name: string; priceCount: number }[]
> {
  const instruments = await db.instrument.findMany({
    where: { instrumentType: { in: ["INDEX", "ETF"] } },
    select: { id: true, code: true, name: true, _count: { select: { prices: true } } },
  });

  return instruments.map((i) => ({
    code: i.code,
    name: i.name,
    priceCount: i._count.prices,
  }));
}
