import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateHistoricalCostReport } from "@/lib/reports/historical-cost-report";
import { formatCurrency } from "@/lib/utils";
import { redirect } from "next/navigation";
import { ReportFilters } from "@/components/reports/report-filters";
import { HistoricalCostChart } from "@/components/charts/historical-cost-chart";
import { Suspense } from "react";

export default async function HistoricalCostPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolio?: string; from?: string; to?: string }>;
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
        <h1 className="font-serif text-2xl font-bold">Historical Cost</h1>
        <p className="text-muted-foreground">Create a portfolio first.</p>
      </div>
    );
  }

  const selectedPortfolioId = params.portfolio || null;

  // Default to current financial year
  const now = new Date();
  const fyYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const defaultFrom = new Date(fyYear, 6, 1); // July 1
  const defaultTo = new Date(fyYear + 1, 5, 30); // June 30

  const fromDate = params.from ? new Date(params.from) : defaultFrom;
  const toDate = params.to ? new Date(params.to) : defaultTo;

  const fromStr = fromDate.toISOString().split("T")[0];
  const toStr = toDate.toISOString().split("T")[0];

  let items: Awaited<ReturnType<typeof generateHistoricalCostReport>>;

  if (selectedPortfolioId) {
    items = await generateHistoricalCostReport(selectedPortfolioId, {
      from: fromDate,
      to: toDate,
    });
  } else {
    const allItems: Awaited<ReturnType<typeof generateHistoricalCostReport>> =
      [];
    for (const p of portfolios) {
      const r = await generateHistoricalCostReport(p.id, {
        from: fromDate,
        to: toDate,
      });
      allItems.push(...r);
    }
    items = allItems;
  }

  // Totals
  const totalOpening = items.reduce((s, i) => s + i.openingCostBase, 0);
  const totalPurchases = items.reduce((s, i) => s + i.purchases, 0);
  const totalSales = items.reduce((s, i) => s + i.sales, 0);
  const totalAdjustments = items.reduce((s, i) => s + i.adjustments, 0);
  const totalClosing = items.reduce((s, i) => s + i.closingCostBase, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">Historical Cost</h1>
          <p className="text-sm text-muted-foreground">
            Opening and closing cost base comparison.
          </p>
        </div>
      </div>

      <Suspense>
        <ReportFilters
          portfolios={portfolios}
          selectedPortfolioId={selectedPortfolioId}
          from={fromStr}
          to={toStr}
        />
      </Suspense>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Opening</p>
          <p className="text-lg font-bold">{formatCurrency(totalOpening)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Purchases</p>
          <p className="text-lg font-bold text-gain">
            +{formatCurrency(totalPurchases)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Sales</p>
          <p className="text-lg font-bold text-loss">
            -{formatCurrency(totalSales)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Adjustments</p>
          <p className="text-lg font-bold">
            {formatCurrency(totalAdjustments)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Closing</p>
          <p className="text-lg font-bold">{formatCurrency(totalClosing)}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground">No holdings found.</p>
      ) : (
        <>
          {/* Cost Base Chart */}
          <div className="rounded-lg border border-border p-4">
            <h2 className="mb-4 text-sm font-medium text-muted-foreground">
              Cost Base by Holding
            </h2>
            <HistoricalCostChart
              data={items.slice(0, 10).map((item) => ({
                name: item.instrumentCode,
                opening: item.openingCostBase,
                purchases: item.purchases,
                sales: item.sales,
                closing: item.closingCostBase,
              }))}
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Code
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Opening
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Purchases
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Sales
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Adjustments
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Closing
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr key={item.instrumentCode} className="hover:bg-accent/50">
                    <td className="px-4 py-3 font-medium">
                      {item.instrumentCode}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {formatCurrency(item.openingCostBase)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {formatCurrency(item.purchases)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {formatCurrency(item.sales)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {formatCurrency(item.adjustments)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {formatCurrency(item.closingCostBase)}
                    </td>
                  </tr>
                ))}
                {/* Total row */}
                <tr className="bg-muted/30 font-medium">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatCurrency(totalOpening)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatCurrency(totalPurchases)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatCurrency(totalSales)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatCurrency(totalAdjustments)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatCurrency(totalClosing)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
