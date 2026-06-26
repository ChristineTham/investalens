import "server-only";
import { db } from "@/lib/db";
import { generateUnrealisedCgtReport } from "@/lib/reports/tax/unrealised-cgt";

export interface RebalanceSell {
  code: string;
  currentValue: number;
  targetValue: number;
  sellValue: number;
  realisedGain: number; // proportional unrealised gain crystallised
  assessableGain: number; // after CGT discount/method, proportional
}

export interface RebalanceBuy {
  code: string;
  currentValue: number;
  targetValue: number;
  buyValue: number;
}

export interface RebalanceEstimate {
  modelName: string;
  totalValue: number;
  sells: RebalanceSell[];
  buys: RebalanceBuy[];
  totalSellValue: number;
  totalBuyValue: number;
  estimatedTaxableGain: number;
  marginalRate: number;
  estimatedTax: number;
  netProceeds: number; // sell proceeds minus estimated tax, available to reinvest
}

const DEFAULT_MARGINAL_RATE = 0.47; // top marginal + Medicare levy fallback

/**
 * Estimate the CGT impact of rebalancing a real portfolio to a model's target
 * weights. Sells are computed as the excess of each holding over its target
 * value; the crystallised gain is taken proportionally from the holding's
 * unrealised CGT figures (which already encode discount/indexation). Estimate
 * only — no parcel-level sale selection or trade tickets.
 */
export async function estimateRebalanceToModel(
  portfolioId: string,
  modelId: string
): Promise<RebalanceEstimate> {
  const portfolio = await db.portfolio.findUnique({
    where: { id: portfolioId },
    select: { marginalTaxRate: true },
  });
  if (!portfolio) throw new Error("Portfolio not found");

  const model = await db.modelPortfolio.findUnique({
    where: { id: modelId },
    include: { constituents: { include: { instrument: true } } },
  });
  if (!model) throw new Error("Model not found");

  // Unrealised CGT per holding (marketValue, unrealisedGain, assessableGain).
  // generateUnrealisedCgtReport enforces ownership via auth().
  const report = await generateUnrealisedCgtReport(portfolioId);
  const byCode = new Map(report.items.map((i) => [i.instrumentCode, i]));

  const totalValue = report.items.reduce((s, i) => s + i.marketValue, 0);

  const targetWeightByCode = new Map(
    model.constituents.map((c) => [
      c.instrument.code,
      Number(c.targetWeight),
    ])
  );

  // Union of held codes and model codes.
  const allCodes = new Set<string>([
    ...byCode.keys(),
    ...targetWeightByCode.keys(),
  ]);

  const sells: RebalanceSell[] = [];
  const buys: RebalanceBuy[] = [];

  for (const code of allCodes) {
    const item = byCode.get(code);
    const currentValue = item?.marketValue ?? 0;
    const targetValue = totalValue * (targetWeightByCode.get(code) ?? 0);

    if (currentValue > targetValue + 0.01) {
      const sellValue = currentValue - targetValue;
      const fraction = currentValue > 0 ? sellValue / currentValue : 0;
      const realisedGain = (item?.unrealisedGain ?? 0) * fraction;
      const assessableGain = (item?.assessableGain ?? 0) * fraction;
      sells.push({
        code,
        currentValue,
        targetValue,
        sellValue,
        realisedGain,
        assessableGain,
      });
    } else if (targetValue > currentValue + 0.01) {
      buys.push({
        code,
        currentValue,
        targetValue,
        buyValue: targetValue - currentValue,
      });
    }
  }

  sells.sort((a, b) => b.sellValue - a.sellValue);
  buys.sort((a, b) => b.buyValue - a.buyValue);

  const totalSellValue = sells.reduce((s, x) => s + x.sellValue, 0);
  const totalBuyValue = buys.reduce((s, x) => s + x.buyValue, 0);

  // Net assessable gain (losses offset gains). Negative ⇒ no tax.
  const estimatedTaxableGain = Math.max(
    0,
    sells.reduce((s, x) => s + x.assessableGain, 0)
  );
  const marginalRate = portfolio.marginalTaxRate
    ? Number(portfolio.marginalTaxRate)
    : DEFAULT_MARGINAL_RATE;
  const estimatedTax = estimatedTaxableGain * marginalRate;
  const netProceeds = totalSellValue - estimatedTax;

  return {
    modelName: model.name,
    totalValue,
    sells,
    buys,
    totalSellValue,
    totalBuyValue,
    estimatedTaxableGain,
    marginalRate,
    estimatedTax,
    netProceeds,
  };
}
