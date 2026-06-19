import { db } from "@/lib/db";

export interface CheckResult {
  duplicates: { holding1: string; holding2: string; similarity: string }[];
  concentration: { holding: string; weight: number; threshold: number }[];
  staleData: { holding: string; lastPriceDate: string; daysSinceUpdate: number }[];
  missingData: { holding: string; issue: string }[];
  anomalies: { holding: string; description: string }[];
}

export async function checkPortfolio(portfolioId: string): Promise<CheckResult> {
  const result: CheckResult = {
    duplicates: [],
    concentration: [],
    staleData: [],
    missingData: [],
    anomalies: [],
  };

  const holdings = await db.holding.findMany({
    where: { portfolioId },
    include: {
      instrument: true,
      transactions: { orderBy: { tradeDate: "desc" } },
    },
  });

  if (holdings.length === 0) return result;

  // Get latest prices
  const instrumentIds = holdings.map((h) => h.instrumentId);
  const latestPrices = await db.price.findMany({
    where: { instrumentId: { in: instrumentIds } },
    orderBy: { date: "desc" },
    distinct: ["instrumentId"],
  });

  const priceMap = new Map(latestPrices.map((p) => [p.instrumentId, p]));

  // Calculate total portfolio value
  let totalValue = 0;
  const holdingValues = new Map<string, number>();

  for (const holding of holdings) {
    let qty = 0;
    for (const tx of holding.transactions) {
      const txQty = Number(tx.quantity);
      switch (tx.transactionType) {
        case "BUY":
        case "TRANSFER_IN":
        case "BONUS":
          qty += txQty;
          break;
        case "SELL":
        case "TRANSFER_OUT":
          qty -= txQty;
          break;
        case "SPLIT":
          qty *= txQty;
          break;
      }
    }
    const price = priceMap.get(holding.instrumentId);
    const value = qty * Number(price?.close ?? 0);
    holdingValues.set(holding.id, value);
    totalValue += value;
  }

  const now = new Date();

  for (const holding of holdings) {
    const code = holding.instrument.code;
    const value = holdingValues.get(holding.id) ?? 0;

    // Concentration check (> 20%)
    if (totalValue > 0 && value / totalValue > 0.2) {
      result.concentration.push({
        holding: code,
        weight: value / totalValue,
        threshold: 0.2,
      });
    }

    // Stale price check (> 5 business days)
    const latestPrice = priceMap.get(holding.instrumentId);
    if (latestPrice) {
      const daysSince = Math.floor(
        (now.getTime() - latestPrice.date.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince > 7) {
        result.staleData.push({
          holding: code,
          lastPriceDate: latestPrice.date.toISOString().split("T")[0],
          daysSinceUpdate: daysSince,
        });
      }
    } else {
      result.missingData.push({ holding: code, issue: "No price data" });
    }

    // Missing cost base
    const buys = holding.transactions.filter((t) => t.transactionType === "BUY");
    if (buys.length === 0 && value > 0) {
      result.missingData.push({ holding: code, issue: "No buy transactions (missing cost base)" });
    }
  }

  // Duplicate check across portfolios
  const userPortfolios = await db.portfolio.findMany({
    where: { userId: holdings[0]?.instrument.createdByUserId ?? "" },
    include: { holdings: { select: { instrument: { select: { code: true } } } } },
  });

  if (userPortfolios.length > 1) {
    const instrumentPortfolios = new Map<string, string[]>();
    for (const p of userPortfolios) {
      for (const h of p.holdings) {
        const existing = instrumentPortfolios.get(h.instrument.code) || [];
        existing.push(p.name);
        instrumentPortfolios.set(h.instrument.code, existing);
      }
    }
    for (const [code, portfolioNames] of instrumentPortfolios) {
      if (portfolioNames.length > 1) {
        result.duplicates.push({
          holding1: `${code} in ${portfolioNames[0]}`,
          holding2: `${code} in ${portfolioNames[1]}`,
          similarity: "Same instrument across portfolios",
        });
      }
    }
  }

  return result;
}
