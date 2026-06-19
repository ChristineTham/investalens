// Common AU ETF top holdings (hardcoded — refresh monthly)
const ETF_HOLDINGS: Record<string, { name: string; weight: number; sector: string }[]> = {
  "VAS.AX": [
    { name: "CBA", weight: 0.095, sector: "Financials" },
    { name: "BHP", weight: 0.087, sector: "Materials" },
    { name: "CSL", weight: 0.063, sector: "Healthcare" },
    { name: "NAB", weight: 0.046, sector: "Financials" },
    { name: "WBC", weight: 0.043, sector: "Financials" },
    { name: "ANZ", weight: 0.038, sector: "Financials" },
    { name: "WES", weight: 0.035, sector: "Consumer" },
    { name: "MQG", weight: 0.033, sector: "Financials" },
    { name: "FMG", weight: 0.028, sector: "Materials" },
    { name: "TLS", weight: 0.025, sector: "Telecom" },
  ],
  "IOZ.AX": [
    { name: "CBA", weight: 0.095, sector: "Financials" },
    { name: "BHP", weight: 0.087, sector: "Materials" },
    { name: "CSL", weight: 0.063, sector: "Healthcare" },
    { name: "NAB", weight: 0.046, sector: "Financials" },
    { name: "WBC", weight: 0.043, sector: "Financials" },
    { name: "ANZ", weight: 0.038, sector: "Financials" },
    { name: "WES", weight: 0.035, sector: "Consumer" },
    { name: "MQG", weight: 0.033, sector: "Financials" },
    { name: "FMG", weight: 0.028, sector: "Materials" },
    { name: "TLS", weight: 0.025, sector: "Telecom" },
  ],
  "STW.AX": [
    { name: "CBA", weight: 0.095, sector: "Financials" },
    { name: "BHP", weight: 0.087, sector: "Materials" },
    { name: "CSL", weight: 0.063, sector: "Healthcare" },
    { name: "NAB", weight: 0.046, sector: "Financials" },
    { name: "WBC", weight: 0.043, sector: "Financials" },
  ],
  "VGS.AX": [
    { name: "AAPL", weight: 0.065, sector: "Technology" },
    { name: "MSFT", weight: 0.058, sector: "Technology" },
    { name: "NVDA", weight: 0.045, sector: "Technology" },
    { name: "AMZN", weight: 0.035, sector: "Consumer" },
    { name: "GOOG", weight: 0.028, sector: "Technology" },
    { name: "META", weight: 0.022, sector: "Technology" },
    { name: "TSLA", weight: 0.015, sector: "Consumer" },
    { name: "JPM", weight: 0.014, sector: "Financials" },
  ],
  "VDHG.AX": [
    { name: "VAS.AX", weight: 0.36, sector: "AU Equity" },
    { name: "VGS.AX", weight: 0.267, sector: "Intl Equity" },
    { name: "VGAD.AX", weight: 0.16, sector: "Intl Equity (Hedged)" },
    { name: "VGE.AX", weight: 0.033, sector: "EM Equity" },
    { name: "VBND.AX", weight: 0.10, sector: "Bonds" },
    { name: "VIF.AX", weight: 0.08, sector: "Intl Bonds" },
  ],
};

export interface XrayResult {
  topHoldings: { name: string; totalWeight: number; sources: string[] }[];
  sectorExposure: Record<string, number>;
  countryExposure: Record<string, number>;
  overlap: { stock: string; etfs: string[]; combinedWeight: number }[];
  concentrationAlerts: { stock: string; totalExposure: number; threshold: number }[];
}

export async function xrayPortfolio(
  holdings: { code: string; weight: number }[]
): Promise<XrayResult> {
  const CONCENTRATION_THRESHOLD = 0.08;

  // Track underlying stock exposures
  const stockExposure = new Map<string, { weight: number; sources: string[] }>();
  const sectorExposure = new Map<string, number>();

  for (const holding of holdings) {
    const etfData = ETF_HOLDINGS[holding.code] || ETF_HOLDINGS[`${holding.code}.AX`];

    if (etfData) {
      // ETF: decompose into underlying holdings
      for (const h of etfData) {
        const existing = stockExposure.get(h.name) || { weight: 0, sources: [] };
        existing.weight += h.weight * holding.weight;
        if (!existing.sources.includes(holding.code)) existing.sources.push(holding.code);
        stockExposure.set(h.name, existing);

        sectorExposure.set(
          h.sector,
          (sectorExposure.get(h.sector) || 0) + h.weight * holding.weight
        );
      }
    } else {
      // Direct holding
      const existing = stockExposure.get(holding.code) || { weight: 0, sources: [] };
      existing.weight += holding.weight;
      if (!existing.sources.includes("Direct")) existing.sources.push("Direct");
      stockExposure.set(holding.code, existing);
    }
  }

  // Build results
  const topHoldings = [...stockExposure.entries()]
    .map(([name, data]) => ({ name, totalWeight: data.weight, sources: data.sources }))
    .sort((a, b) => b.totalWeight - a.totalWeight)
    .slice(0, 20);

  const overlap = [...stockExposure.entries()]
    .filter(([, data]) => data.sources.length > 1)
    .map(([stock, data]) => ({
      stock,
      etfs: data.sources,
      combinedWeight: data.weight,
    }))
    .sort((a, b) => b.combinedWeight - a.combinedWeight);

  const concentrationAlerts = [...stockExposure.entries()]
    .filter(([, data]) => data.weight >= CONCENTRATION_THRESHOLD)
    .map(([stock, data]) => ({
      stock,
      totalExposure: data.weight,
      threshold: CONCENTRATION_THRESHOLD,
    }));

  return {
    topHoldings,
    sectorExposure: Object.fromEntries(sectorExposure),
    countryExposure: {},
    overlap,
    concentrationAlerts,
  };
}
