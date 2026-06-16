import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PortfolioSelector } from "@/components/reports/portfolio-selector";
import { ExposureTreemap } from "@/components/charts/exposure-treemap";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { Suspense } from "react";

export default async function ExposurePage({
  searchParams,
}: {
  searchParams: Promise<{ portfolio?: string; groupBy?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;

  const portfolios = await db.portfolio.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
  });

  if (portfolios.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-bold">Exposure Report</h1>
        <p className="text-muted-foreground">Create a portfolio first.</p>
      </div>
    );
  }

  const selectedPortfolioId = params.portfolio || null;
  const groupBy = params.groupBy || "sector";

  // Get holdings with instruments
  const whereClause = selectedPortfolioId
    ? { portfolioId: selectedPortfolioId, portfolio: { userId: session.user.id } }
    : { portfolio: { userId: session.user.id } };

  const holdings = await db.holding.findMany({
    where: whereClause,
    include: {
      instrument: true,
      transactions: { orderBy: { tradeDate: "asc" } },
    },
  });

  // Calculate current value for each holding (simplified: sum buys - sells * latest price)
  const holdingValues: Array<{
    code: string;
    name: string;
    sector: string;
    country: string;
    type: string;
    market: string;
    value: number;
  }> = [];

  for (const h of holdings) {
    let qty = 0;
    for (const tx of h.transactions) {
      const q = Number(tx.quantity);
      if (["BUY", "TRANSFER_IN", "BONUS"].includes(tx.transactionType)) qty += q;
      if (["SELL", "TRANSFER_OUT"].includes(tx.transactionType)) qty -= q;
      if (tx.transactionType === "SPLIT") qty *= q;
    }
    if (qty <= 0) continue;

    // Get latest price
    const latestPrice = await db.price.findFirst({
      where: { instrumentId: h.instrumentId },
      orderBy: { date: "desc" },
    });
    const price = latestPrice ? Number(latestPrice.close) : 0;
    const value = qty * price;
    if (value <= 0) continue;

    holdingValues.push({
      code: h.instrument.code,
      name: h.instrument.name,
      sector: h.instrument.sector || "Unknown",
      country: h.instrument.country || "Unknown",
      type: h.instrument.instrumentType,
      market: h.instrument.marketCode,
      value,
    });
  }

  // Group by selected dimension
  const grouped = new Map<string, number>();
  for (const h of holdingValues) {
    const key =
      groupBy === "sector"
        ? h.sector
        : groupBy === "country"
          ? h.country
          : groupBy === "type"
            ? h.type
            : h.market;
    grouped.set(key, (grouped.get(key) || 0) + h.value);
  }

  const treemapData = Array.from(grouped.entries())
    .map(([name, size]) => ({ name, size }))
    .sort((a, b) => b.size - a.size);

  const totalValue = treemapData.reduce((s, d) => s + d.size, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">Exposure Report</h1>
          <p className="text-sm text-muted-foreground">
            Geographic and sector allocation treemap.
          </p>
        </div>
        <Suspense>
          <PortfolioSelector
            portfolios={portfolios}
            selectedId={selectedPortfolioId}
          />
        </Suspense>
      </div>

      {/* Group-by selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Group by:</span>
        {["sector", "country", "type", "market"].map((g) => (
          <a
            key={g}
            href={`?groupBy=${g}${selectedPortfolioId ? `&portfolio=${selectedPortfolioId}` : ""}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
              groupBy === g
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary"
            }`}
          >
            {g}
          </a>
        ))}
      </div>

      {treemapData.length === 0 ? (
        <p className="text-muted-foreground">
          No holdings with price data available.
        </p>
      ) : (
        <>
          {/* Treemap */}
          <div className="rounded-lg border border-border p-4">
            <ExposureTreemap data={treemapData} />
          </div>

          {/* Breakdown table */}
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium capitalize text-muted-foreground">
                    {groupBy}
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Value
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Weight
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {treemapData.map((d) => (
                  <tr key={d.name} className="hover:bg-accent/50">
                    <td className="px-4 py-3 font-medium capitalize">
                      {d.name}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {formatCurrency(d.size)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {formatPercent(
                        totalValue > 0 ? (d.size / totalValue) * 100 : 0
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/30 font-medium">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatCurrency(totalValue)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
