import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateFutureIncomeReport } from "@/lib/reports/future-income-report";
import { formatCurrency, formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";
import { PortfolioSelector } from "@/components/reports/portfolio-selector";
import { Suspense } from "react";

export default async function FutureIncomePage({
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
        <h1 className="font-serif text-2xl font-bold">Future Income</h1>
        <p className="text-muted-foreground">Create a portfolio first.</p>
      </div>
    );
  }

  const selectedPortfolioId = params.portfolio || null;

  let items: Awaited<ReturnType<typeof generateFutureIncomeReport>>;

  if (selectedPortfolioId) {
    items = await generateFutureIncomeReport(selectedPortfolioId);
  } else {
    const allItems: Awaited<ReturnType<typeof generateFutureIncomeReport>> = [];
    for (const p of portfolios) {
      const r = await generateFutureIncomeReport(p.id);
      allItems.push(...r);
    }
    items = allItems;
  }

  const totalEstimated = items.reduce((s, i) => s + i.estimatedAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">Future Income</h1>
          <p className="text-sm text-muted-foreground">
            Projected dividends and income based on current holdings.
          </p>
        </div>
        <Suspense>
          <PortfolioSelector
            portfolios={portfolios}
            selectedId={selectedPortfolioId}
          />
        </Suspense>
      </div>

      {/* Summary card */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Total Estimated Annual Income
          </p>
          <p className="text-lg font-bold">{formatCurrency(totalEstimated)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Income-Producing Holdings
          </p>
          <p className="text-lg font-bold">{items.length}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground">
          No income history to estimate from.
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
                  Est. Amount
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Frequency
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Next Payment
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Status
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
                    {formatCurrency(item.estimatedAmount)}
                  </td>
                  <td className="px-4 py-3 text-sm capitalize">
                    {item.frequency.replace("_", " ")}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {item.nextPaymentDate
                      ? formatDate(item.nextPaymentDate)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm capitalize">
                    {item.status}
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
