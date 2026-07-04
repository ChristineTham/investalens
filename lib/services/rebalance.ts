import "server-only";
import { db } from "@/lib/db";
import { getLatestPrices } from "@/lib/services/latest-prices";

export interface DriftRow {
  code: string;
  name: string;
  actualValue: number;
  targetValue: number;
  actualWeight: number;
  targetWeight: number;
  drift: number; // actualWeight − targetWeight
  deltaValue: number; // targetValue − actualValue (positive ⇒ buy)
  price: number;
  deltaUnits: number; // deltaValue / price (positive ⇒ buy, negative ⇒ sell)
}

export interface DriftResult {
  modelName: string;
  totalValue: number;
  rows: DriftRow[];
  totalBuyValue: number;
  totalSellValue: number;
}

function positionQuantity(
  transactions: { transactionType: string; quantity: unknown }[]
): number {
  let qty = 0;
  for (const tx of transactions) {
    const q = Number(tx.quantity);
    switch (tx.transactionType) {
      case "BUY":
      case "TRANSFER_IN":
      case "BONUS":
        qty += q;
        break;
      case "SELL":
      case "TRANSFER_OUT":
        qty -= q;
        break;
      case "SPLIT":
        qty *= q;
        break;
    }
  }
  return qty;
}

/**
 * Compute drift between a real portfolio's actual weights and a model's target
 * weights, plus the buy/sell deltas (value and whole-ish units) to realign.
 */
export async function computeDrift(
  portfolioId: string,
  modelId: string
): Promise<DriftResult> {
  const [holdings, model] = await Promise.all([
    db.holding.findMany({
      where: { portfolioId },
      include: {
        instrument: true,
        transactions: { orderBy: { tradeDate: "asc" } },
      },
    }),
    db.modelPortfolio.findUnique({
      where: { id: modelId },
      include: { constituents: { include: { instrument: true } } },
    }),
  ]);
  if (!model) throw new Error("Model not found");

  // Actual values + latest prices per instrument code.
  const actual = new Map<
    string,
    { name: string; value: number; price: number }
  >();
  const latestPrices = await getLatestPrices(
    holdings.map((h) => h.instrumentId)
  );
  for (const h of holdings) {
    const qty = positionQuantity(h.transactions);
    const price = latestPrices.get(h.instrumentId)?.close ?? 0;
    const value = qty * price;
    if (value <= 0 && price <= 0) continue;
    const code = h.instrument.code;
    const existing = actual.get(code);
    if (existing) {
      existing.value += value;
    } else {
      actual.set(code, { name: h.instrument.name, value, price });
    }
  }

  const totalValue = [...actual.values()].reduce((s, a) => s + a.value, 0);

  const target = new Map(
    model.constituents.map((c) => [
      c.instrument.code,
      { name: c.instrument.name, weight: Number(c.targetWeight) },
    ])
  );

  const codes = new Set<string>([...actual.keys(), ...target.keys()]);
  const rows: DriftRow[] = [];

  for (const code of codes) {
    const a = actual.get(code);
    const t = target.get(code);
    const actualValue = a?.value ?? 0;
    const targetWeight = t?.weight ?? 0;
    const targetValue = totalValue * targetWeight;
    const actualWeight = totalValue > 0 ? actualValue / totalValue : 0;
    const price = a?.price ?? 0;
    const deltaValue = targetValue - actualValue;

    rows.push({
      code,
      name: a?.name ?? t?.name ?? code,
      actualValue,
      targetValue,
      actualWeight,
      targetWeight,
      drift: actualWeight - targetWeight,
      deltaValue,
      price,
      deltaUnits: price > 0 ? deltaValue / price : 0,
    });
  }

  rows.sort((x, y) => Math.abs(y.drift) - Math.abs(x.drift));

  const totalBuyValue = rows
    .filter((r) => r.deltaValue > 0)
    .reduce((s, r) => s + r.deltaValue, 0);
  const totalSellValue = rows
    .filter((r) => r.deltaValue < 0)
    .reduce((s, r) => s - r.deltaValue, 0);

  return {
    modelName: model.name,
    totalValue,
    rows,
    totalBuyValue,
    totalSellValue,
  };
}
