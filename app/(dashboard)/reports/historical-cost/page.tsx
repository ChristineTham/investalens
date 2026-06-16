import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateHistoricalCostReport } from "@/lib/reports/historical-cost-report";
import { formatCurrency } from "@/lib/utils";
import { redirect } from "next/navigation";
import { PortfolioSelector } from "@/components/reports/portfolio-selector";
import { Suspense } from "react";

export default async function HistoricalCostPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolio?: string }>;
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

  // Default to current financial year (July 1 - June 30 for AU)
  const now = new Date();
  const fyYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const from = new Date(fyYear, 6, 1); // July 1
  const to = new Date(fyYear + 1, 5, 30); // June 30

  let items: Awaited<ReturnType<typeof generateHistoricalCostReport>>;

  if (selectedPortfolioId) {
    items = await generateHistoricalCostReport(selectedPortfolioId, {
      from,
      to,
    });
  } else {
    const allItems: Awaited<ReturnType<typeof generateHistoricalCostReport>> =
      [];
    for (const p of portfolios) {
      const r = await generateHistoricalCostReport(p.id, { from, to });
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
            Opening and closing cost base for FY{fyYear}/{(fyYear + 1).toString().slice(2)}.
          </p>
        </div>
        <Suspense>
          <PortfolioSelector
            portfolios={portfolios}
            selectedId={selectedPortfolioId}
          />
        </Suspense>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Opening</p>
          <p className="text-lg font-bold">{formatCurrency(totalOpening)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Purchases</p>
          <p className="text-lg font-bold text-green-600">
            +{formatCurrency(totalPurchases)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Sales</p>
          <p className="text-lg font-bold text-red-600">
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
      )}
    </div>
  );
}
