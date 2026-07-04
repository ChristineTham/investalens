import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";
import { ReportFilters } from "@/components/reports/report-filters";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "All Trades",
};

export default async function AllTradesPage({
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
        <h1 className="font-serif text-2xl font-bold">All Trades</h1>
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

  const whereClause = {
    tradeDate: { gte: fromDate, lte: toDate },
    holding: selectedPortfolioId
      ? { portfolio: { id: selectedPortfolioId, userId: session.user.id } }
      : { portfolio: { userId: session.user.id } },
  };

  const transactions = await db.transaction.findMany({
    where: whereClause,
    include: {
      holding: {
        include: { instrument: true, portfolio: { select: { name: true } } },
      },
    },
    orderBy: { tradeDate: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">All Trades</h1>
          <p className="text-sm text-muted-foreground">
            Complete transaction history (latest 100 in selected range).
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

      {transactions.length === 0 ? (
        <p className="text-muted-foreground">No transactions found for the selected period.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Portfolio
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Price
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Brokerage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-accent/50">
                  <td className="px-4 py-3 text-sm">
                    {formatDate(tx.tradeDate)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {tx.holding.portfolio.name}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {tx.holding.instrument.code}
                  </td>
                  <td className="px-4 py-3 text-sm">{tx.transactionType}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    {Number(tx.quantity).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatCurrency(Number(tx.price))}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                    {formatCurrency(Number(tx.brokerage))}
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
