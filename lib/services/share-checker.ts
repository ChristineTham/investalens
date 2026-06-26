import { db } from "@/lib/db";
import { getModelCoverage } from "@/lib/services/model-portfolio";

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

// ─── Model checks ─────────────────────────────────────────────────────────────

export type ModelHealth = "green" | "amber" | "red";

export interface ModelCheckResult {
  concentration: { holding: string; weight: number; threshold: number }[];
  missingData: { holding: string; issue: string }[];
  invalidConstituents: { holding: string; reason: string }[];
  coverageValid: boolean;
  health: ModelHealth;
  healthReasons: string[];
}

/**
 * Run portfolio-style health checks over a model's TARGET weights, plus the
 * model-specific time-period validity check (delisted/stale/short-history).
 */
export async function checkModel(modelId: string): Promise<ModelCheckResult> {
  const model = await db.modelPortfolio.findUnique({
    where: { id: modelId },
    include: { constituents: { include: { instrument: true } } },
  });
  if (!model) throw new Error("Model not found");

  const concentration: ModelCheckResult["concentration"] = [];
  const missingData: ModelCheckResult["missingData"] = [];

  for (const c of model.constituents) {
    const w = Number(c.targetWeight);
    if (w > 0.2) {
      concentration.push({
        holding: c.instrument.code,
        weight: w,
        threshold: 0.2,
      });
    }
    const priceCount = await db.price.count({
      where: { instrumentId: c.instrumentId },
    });
    if (priceCount === 0) {
      missingData.push({ holding: c.instrument.code, issue: "No price data" });
    }
  }

  const coverage = await getModelCoverage(modelId);
  const invalidConstituents = coverage.constituents
    .filter((cc) => !cc.valid)
    .map((cc) => ({
      holding: cc.code,
      reason: !cc.coversStart
        ? "Price history shorter than lookback period"
        : "No recent prices (delisted/suspended)",
    }));

  const reasons: string[] = [];
  let health: ModelHealth = "green";

  if (!coverage.valid) {
    health = "red";
    reasons.push(`Delisted/invalid: ${coverage.invalidCodes.join(", ")}`);
  }

  const maxWeight = Math.max(
    0,
    ...model.constituents.map((c) => Number(c.targetWeight))
  );
  if (maxWeight > 0.4) {
    health = "red";
    reasons.push("Severe concentration (>40% in a single holding)");
  } else if (concentration.length > 0 && health !== "red") {
    health = "amber";
    reasons.push("Concentration above 20% in one or more holdings");
  }

  if (missingData.length > 0 && health === "green") {
    health = "amber";
    reasons.push("Missing price data for some constituents");
  }

  if (reasons.length === 0) reasons.push("No issues detected");

  return {
    concentration,
    missingData,
    invalidConstituents,
    coverageValid: coverage.valid,
    health,
    healthReasons: reasons,
  };
}

/** Compact health summary for a model — for badges on cards/detail. */
export async function getModelHealth(
  modelId: string
): Promise<{ level: ModelHealth; reasons: string[] }> {
  const r = await checkModel(modelId);
  return { level: r.health, reasons: r.healthReasons };
}