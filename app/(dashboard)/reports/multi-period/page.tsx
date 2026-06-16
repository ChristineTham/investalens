import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateMultiPeriodReport } from "@/lib/reports/multi-period-report";
import { formatPercent } from "@/lib/utils";
import { redirect } from "next/navigation";
import { PortfolioSelector } from "@/components/reports/portfolio-selector";
import { Suspense } from "react";

export default async function MultiPeriodReportPage({
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
        <h1 className="font-serif text-2xl font-bold">
          Multi-Period Comparison
        </h1>
        <p className="text-muted-foreground">Create a portfolio first.</p>
      </div>
    );
  }

  const selectedPortfolioId = params.portfolio || null;

  // Define comparison periods
  const now = new Date();
  const periods = [
    {
      label: "1 Month",
      dateRange: {
        from: new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()),
        to: now,
      },
    },
    {
      label: "3 Months",
      dateRange: {
        from: new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
        to: now,
      },
    },
    {
      label: "6 Months",
      dateRange: {
        from: new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
        to: now,
      },
    },
    {
      label: "1 Year",
      dateRange: {
        from: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
        to: now,
      },
    },
    {
      label: "3 Years",
      dateRange: {
        from: new Date(now.getFullYear() - 3, now.getMonth(), now.getDate()),
        to: now,
      },
    },
  ];

  let rows: Awaited<ReturnType<typeof generateMultiPeriodReport>>;

  if (selectedPortfolioId) {
    rows = await generateMultiPeriodReport(selectedPortfolioId, periods);
  } else {
    const allRows: Awaited<ReturnType<typeof generateMultiPeriodReport>> = [];
    for (const p of portfolios) {
      const r = await generateMultiPeriodReport(p.id, periods);
      allRows.push(...r);
    }
    rows = allRows;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">
            Multi-Period Comparison
          </h1>
          <p className="text-sm text-muted-foreground">
            Compare performance across multiple time periods.
          </p>
        </div>
        <Suspense>
          <PortfolioSelector
            portfolios={portfolios}
            selectedId={selectedPortfolioId}
          />
        </Suspense>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">
          No price data available for comparison. Price data is populated by the
          daily cron job.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Code
                </th>
                {periods.map((p) => (
                  <th
                    key={p.label}
                    className="px-4 py-3 text-right text-sm font-medium text-muted-foreground"
                  >
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.instrumentCode} className="hover:bg-accent/50">
                  <td className="px-4 py-3 font-medium">
                    {row.instrumentCode}
                  </td>
                  {row.periods.map((p) => (
                    <td
                      key={p.label}
                      className={`px-4 py-3 text-right text-sm ${
                        p.returnPercent >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatPercent(p.returnPercent)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
