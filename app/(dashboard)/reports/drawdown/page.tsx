import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateDrawdownReport } from "@/lib/reports/drawdown-report";
import { formatPercent } from "@/lib/utils";
import { redirect } from "next/navigation";
import { PortfolioSelector } from "@/components/reports/portfolio-selector";
import { Suspense } from "react";

export default async function DrawdownReportPage({
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
        <h1 className="font-serif text-2xl font-bold">Drawdown Risk</h1>
        <p className="text-muted-foreground">Create a portfolio first.</p>
      </div>
    );
  }

  const selectedPortfolioId = params.portfolio || null;
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  let items: Awaited<ReturnType<typeof generateDrawdownReport>>;

  if (selectedPortfolioId) {
    items = await generateDrawdownReport(selectedPortfolioId, {
      from: oneYearAgo,
      to: now,
    });
  } else {
    const allItems: Awaited<ReturnType<typeof generateDrawdownReport>> = [];
    for (const p of portfolios) {
      const r = await generateDrawdownReport(p.id, {
        from: oneYearAgo,
        to: now,
      });
      allItems.push(...r);
    }
    items = allItems;
  }

  // Portfolio-level stats
  const maxDrawdown =
    items.length > 0
      ? Math.max(...items.map((i) => i.maxDrawdownPercent))
      : 0;
  const avgDrawdown =
    items.length > 0
      ? items.reduce((s, i) => s + i.maxDrawdownPercent, 0) / items.length
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">Drawdown Risk</h1>
          <p className="text-sm text-muted-foreground">
            Maximum drawdown and Return over Maximum Drawdown (RoMaD) analysis.
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Max Drawdown</p>
          <p className="text-lg font-bold text-destructive">
            -{maxDrawdown.toFixed(2)}%
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Avg Max Drawdown</p>
          <p className="text-lg font-bold">-{avgDrawdown.toFixed(2)}%</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Holdings Analyzed</p>
          <p className="text-lg font-bold">{items.length}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground">
          No price data available for drawdown analysis. Price data is populated
          by the daily cron job.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Code
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Max Drawdown %
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Total Return %
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  RoMaD
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items
                .sort((a, b) => b.maxDrawdownPercent - a.maxDrawdownPercent)
                .map((item) => (
                  <tr
                    key={item.instrumentCode}
                    className="hover:bg-accent/50"
                  >
                    <td className="px-4 py-3 font-medium">
                      {item.instrumentCode}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-destructive">
                      -{item.maxDrawdownPercent.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {formatPercent(item.totalReturn)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {item.romad.toFixed(2)}
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
