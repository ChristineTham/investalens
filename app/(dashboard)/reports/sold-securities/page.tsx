import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateSoldSecuritiesReport } from "@/lib/reports/sold-securities-report";
import { formatCurrency, formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";
import { PortfolioSelector } from "@/components/reports/portfolio-selector";
import { Suspense } from "react";

export default async function SoldSecuritiesPage({
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
        <h1 className="font-serif text-2xl font-bold">Sold Securities</h1>
        <p className="text-muted-foreground">Create a portfolio first.</p>
      </div>
    );
  }

  const selectedPortfolioId = params.portfolio || null;
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  let items: Awaited<ReturnType<typeof generateSoldSecuritiesReport>>;

  if (selectedPortfolioId) {
    items = await generateSoldSecuritiesReport(selectedPortfolioId, {
      from: oneYearAgo,
      to: now,
    });
  } else {
    const allItems: Awaited<ReturnType<typeof generateSoldSecuritiesReport>> =
      [];
    for (const p of portfolios) {
      const r = await generateSoldSecuritiesReport(p.id, {
        from: oneYearAgo,
        to: now,
      });
      allItems.push(...r);
    }
    items = allItems.sort(
      (a, b) =>
        new Date(b.tradeDate).getTime() - new Date(a.tradeDate).getTime()
    );
  }

  const totalProceeds = items.reduce((s, i) => s + i.proceeds, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">Sold Securities</h1>
          <p className="text-sm text-muted-foreground">
            Realised gains and losses on closed positions (past 12 months).
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
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Total Proceeds</p>
        <p className="text-lg font-bold">{formatCurrency(totalProceeds)}</p>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground">No sales in the past 12 months.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Proceeds
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item, i) => (
                <tr key={i} className="hover:bg-accent/50">
                  <td className="px-4 py-3 font-medium">
                    {item.instrumentCode}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatDate(item.tradeDate)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {item.quantity.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatCurrency(item.proceeds)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
