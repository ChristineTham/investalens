import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateCalendarReport } from "@/lib/reports/calendar-report";
import { formatCurrency } from "@/lib/utils";
import { redirect } from "next/navigation";
import { PortfolioSelector } from "@/components/reports/portfolio-selector";
import { MonthlyIncomeChart } from "@/components/charts/monthly-income";
import { Suspense } from "react";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default async function CalendarReportPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolio?: string; year?: string }>;
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
        <h1 className="font-serif text-2xl font-bold">Dividend Calendar</h1>
        <p className="text-muted-foreground">Create a portfolio first.</p>
      </div>
    );
  }

  const selectedPortfolioId = params.portfolio || null;
  const year = params.year ? parseInt(params.year, 10) : new Date().getFullYear();

  let entries: Awaited<ReturnType<typeof generateCalendarReport>>;

  if (selectedPortfolioId) {
    entries = await generateCalendarReport(selectedPortfolioId, year);
  } else {
    const allEntries: Awaited<ReturnType<typeof generateCalendarReport>> = [];
    for (const p of portfolios) {
      const r = await generateCalendarReport(p.id, year);
      allEntries.push(...r);
    }
    entries = allEntries.sort((a, b) => a.month - b.month);
  }

  // Group by month
  const byMonth = new Map<number, typeof entries>();
  for (const entry of entries) {
    const existing = byMonth.get(entry.month) || [];
    existing.push(entry);
    byMonth.set(entry.month, existing);
  }

  // Monthly totals
  const monthlyTotals = Array.from({ length: 12 }, (_, i) => {
    const monthEntries = byMonth.get(i + 1) || [];
    return monthEntries.reduce((s, e) => s + e.estimatedAmount, 0);
  });
  const annualTotal = monthlyTotals.reduce((s, t) => s + t, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">Dividend Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Month-by-month dividend payment schedule for {year}.
          </p>
        </div>
        <Suspense>
          <PortfolioSelector
            portfolios={portfolios}
            selectedId={selectedPortfolioId}
          />
        </Suspense>
      </div>

      {/* Annual summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Estimated Annual Income
          </p>
          <p className="text-lg font-bold">{formatCurrency(annualTotal)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Payment Events</p>
          <p className="text-lg font-bold">{entries.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Avg Monthly</p>
          <p className="text-lg font-bold">
            {formatCurrency(annualTotal / 12)}
          </p>
        </div>
      </div>

      {/* Monthly Income Bar Chart */}
      {entries.length > 0 && (
        <div className="rounded-lg border border-border p-4">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            Monthly Dividend Income ({year})
          </h2>
          <MonthlyIncomeChart
            data={MONTH_NAMES.map((month, i) => ({
              month: month.slice(0, 3),
              amount: monthlyTotals[i],
            }))}
          />
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-muted-foreground">
          No projected dividend payments for {year}.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Month
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Instrument
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Est. Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from({ length: 12 }, (_, monthIdx) => {
                const monthEntries = byMonth.get(monthIdx + 1) || [];
                if (monthEntries.length === 0) return null;
                return monthEntries.map((entry, i) => (
                  <tr
                    key={`${monthIdx}-${entry.instrumentCode}-${i}`}
                    className="hover:bg-accent/50"
                  >
                    <td className="px-4 py-3 text-sm">
                      {i === 0 ? MONTH_NAMES[monthIdx] : ""}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {entry.instrumentCode}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {formatCurrency(entry.estimatedAmount)}
                    </td>
                  </tr>
                ));
              })}
              {/* Total row */}
              <tr className="bg-muted/30 font-medium">
                <td className="px-4 py-3 text-sm">Total</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(annualTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
