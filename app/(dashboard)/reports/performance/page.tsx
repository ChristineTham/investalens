import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generatePerformanceReport } from "@/lib/reports/performance-report";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function PerformanceReportPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolio?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;

  // Get user's portfolios for selector
  const portfolios = await db.portfolio.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
  });

  if (portfolios.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-bold">Performance Report</h1>
        <p className="text-muted-foreground">Create a portfolio first.</p>
      </div>
    );
  }

  const portfolioId = params.portfolio || portfolios[0].id;
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const report = await generatePerformanceReport({
    portfolioId,
    dateRange: { from: oneYearAgo, to: now },
    groupBy: "none",
    openOnly: true,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold">Performance Report</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Cost</p>
          <p className="text-lg font-bold">
            {formatCurrency(report.portfolio.totalCostBase)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Market Value</p>
          <p className="text-lg font-bold">
            {formatCurrency(report.portfolio.totalMarketValue)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Return</p>
          <p className="text-lg font-bold">
            {formatCurrency(report.portfolio.totalReturn)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Return %</p>
          <p className="text-lg font-bold">
            {formatPercent(report.portfolio.totalReturnPercent)}
          </p>
        </div>
      </div>

      {/* Holdings table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Code
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Cost Base
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Market Value
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Capital Gain
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Dividends
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Total Return
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Return %
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {report.portfolio.holdings.map((h) => (
              <tr key={h.holdingId} className="hover:bg-accent/50">
                <td className="px-4 py-3 font-medium">{h.instrumentCode}</td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(h.costBase)}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(h.marketValue)}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(h.capitalGain)}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(h.dividendIncome)}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(h.totalReturn)}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatPercent(h.totalReturnPercent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
