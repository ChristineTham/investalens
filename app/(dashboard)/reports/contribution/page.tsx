import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateContributionReport } from "@/lib/reports/contribution-report";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { redirect } from "next/navigation";
import { ReportFilters } from "@/components/reports/report-filters";
import { ContributionBarChart } from "@/components/charts/contribution-bar";
import { ChartCard } from "@/components/charts/chart-card";
import { Suspense } from "react";

export default async function ContributionReportPage({
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
        <h1 className="font-serif text-2xl font-bold">Contribution Analysis</h1>
        <p className="text-muted-foreground">Create a portfolio first.</p>
      </div>
    );
  }

  const selectedPortfolioId = params.portfolio || null;
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const fromDate = params.from ? new Date(params.from) : oneYearAgo;
  const toDate = params.to ? new Date(params.to) : now;

  const fromStr = fromDate.toISOString().split("T")[0];
  const toStr = toDate.toISOString().split("T")[0];

  let items: Awaited<ReturnType<typeof generateContributionReport>>;

  if (selectedPortfolioId) {
    items = await generateContributionReport(selectedPortfolioId, {
      from: fromDate,
      to: toDate,
    });
  } else {
    const allItems: Awaited<ReturnType<typeof generateContributionReport>> = [];
    for (const p of portfolios) {
      const r = await generateContributionReport(p.id, {
        from: fromDate,
        to: toDate,
      });
      allItems.push(...r);
    }
    const totalReturn = allItems.reduce((s, i) => s + i.totalReturn, 0);
    items = allItems.map((i) => ({
      ...i,
      contributionPercent:
        totalReturn !== 0 ? (i.totalReturn / totalReturn) * 100 : 0,
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">
            Contribution Analysis
          </h1>
          <p className="text-sm text-muted-foreground">
            How each holding drives overall portfolio return.
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

      {items.length === 0 ? (
        <p className="text-muted-foreground">No holdings found.</p>
      ) : (
        <>
          {/* Contribution Chart */}
          <ChartCard
            title="Contribution by holding"
            description="Each holding's share of total return (%)"
            height={Math.max(300, items.length * 36)}
          >
            {(h) => (
              <ContributionBarChart
                height={h}
                data={items.map((item) => ({
                  name: item.instrumentCode,
                  contribution: item.contributionPercent,
                }))}
              />
            )}
          </ChartCard>

          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Code
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Total Return
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Contribution %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr key={item.holdingId} className="hover:bg-accent/50">
                    <td className="px-4 py-3 font-medium">
                      {item.instrumentCode}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {formatCurrency(item.totalReturn)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {formatPercent(item.contributionPercent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
