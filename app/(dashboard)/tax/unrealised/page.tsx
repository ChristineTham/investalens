import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  generateUnrealisedCgtReport,
  type UnrealisedCgtItem,
} from "@/lib/reports/tax/unrealised-cgt";
import { formatCurrency } from "@/lib/utils";
import { redirect } from "next/navigation";
import { TaxFilter } from "@/components/reports/tax-filter";
import { Suspense } from "react";

export default async function UnrealisedCgtPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolio?: string; year?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;

  const portfolios = await db.portfolio.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, financialYearEnd: true },
  });

  if (portfolios.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-bold">Unrealised CGT</h1>
        <p className="text-muted-foreground">Create a portfolio first.</p>
      </div>
    );
  }

  const selectedPortfolioId = params.portfolio || null;
  const fyEndMonth = selectedPortfolioId
    ? portfolios.find((p) => p.id === selectedPortfolioId)?.financialYearEnd ?? 6
    : 6;

  const now = new Date();
  const currentFY =
    fyEndMonth === 12
      ? now.getFullYear()
      : now.getMonth() >= fyEndMonth
        ? now.getFullYear() + 1
        : now.getFullYear();
  // Year param isn't critical for unrealised (always "as of today") but kept for consistency
  const selectedYear = params.year ? parseInt(params.year, 10) : currentFY;
  const availableYears = Array.from({ length: 5 }, (_, i) => currentFY - i);

  // Generate report
  let items: UnrealisedCgtItem[] = [];

  if (selectedPortfolioId) {
    const report = await generateUnrealisedCgtReport(selectedPortfolioId);
    items = report.items;
  } else {
    // Consolidated across all portfolios
    for (const p of portfolios) {
      const report = await generateUnrealisedCgtReport(p.id);
      items.push(...report.items);
    }
  }

  // Calculate summary
  const shortTermGains = items
    .filter((i) => !i.isLongTerm && i.unrealisedGain > 0)
    .reduce((s, i) => s + i.unrealisedGain, 0);
  const longTermGains = items
    .filter((i) => i.isLongTerm && i.unrealisedGain > 0)
    .reduce((s, i) => s + i.unrealisedGain, 0);
  const unrealisedLosses = items
    .filter((i) => i.unrealisedGain < 0)
    .reduce((s, i) => s + Math.abs(i.unrealisedGain), 0);
  const cgtDiscount = items
    .filter((i) => i.unrealisedGain > 0 && i.methodUsed === "discount")
    .reduce((s, i) => s + (i.unrealisedGain - i.assessableGain), 0);
  const indexationRelief = items
    .filter((i) => i.unrealisedGain > 0 && i.methodUsed === "indexation")
    .reduce((s, i) => s + (i.unrealisedGain - i.assessableGain), 0);
  const totalGains = shortTermGains + longTermGains;
  const netAfterLosses = Math.max(0, totalGains - unrealisedLosses);
  const netHypotheticalGain = Math.max(
    0,
    netAfterLosses - cgtDiscount - indexationRelief
  );

  // Totals
  const totalCostBase = items.reduce((s, i) => s + i.costBase, 0);
  const totalMarketValue = items.reduce((s, i) => s + i.marketValue, 0);
  const totalUnrealised = items.reduce((s, i) => s + i.unrealisedGain, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">Unrealised CGT</h1>
          <p className="text-sm text-muted-foreground">
            Hypothetical tax liability if all positions sold today at current
            market price.
          </p>
        </div>
      </div>

      <Suspense>
        <TaxFilter
          portfolios={portfolios}
          selectedPortfolioId={selectedPortfolioId}
          selectedYear={selectedYear}
          availableYears={availableYears}
        />
      </Suspense>

      {/* Portfolio value summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Cost Base</p>
          <p className="text-lg font-bold">{formatCurrency(totalCostBase)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Market Value</p>
          <p className="text-lg font-bold">
            {formatCurrency(totalMarketValue)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            Total Unrealised Gain
          </p>
          <p
            className={`text-lg font-bold ${totalUnrealised < 0 ? "text-loss" : ""}`}
          >
            {formatCurrency(totalUnrealised)}
          </p>
        </div>
      </div>

      {/* CGT breakdown */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Short-term Gains</p>
          <p className="text-lg font-bold">
            {formatCurrency(shortTermGains)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            held &lt;12 months
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Long-term Gains</p>
          <p className="text-lg font-bold">{formatCurrency(longTermGains)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            held ≥12 months
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Unrealised Losses</p>
          <p className="text-lg font-bold text-loss">
            -{formatCurrency(unrealisedLosses)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">50% CGT Discount</p>
          <p className="text-lg font-bold">
            -{formatCurrency(cgtDiscount)}
          </p>
        </div>
        {indexationRelief > 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Indexation Relief</p>
            <p className="text-lg font-bold">
              -{formatCurrency(indexationRelief)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              pre-1999 CPI method
            </p>
          </div>
        )}
        <div className="rounded-lg border border-border bg-card p-4 ring-2 ring-primary/20">
          <p className="text-xs font-medium text-primary">
            Net Hypothetical CGT
          </p>
          <p className="text-lg font-bold">
            {formatCurrency(netHypotheticalGain)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            if sold today
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Holdings</p>
          <p className="text-lg font-bold">{items.length}</p>
        </div>
      </div>

      {/* Detail table */}
      {items.length === 0 ? (
        <p className="text-muted-foreground">
          No open positions with price data available.
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
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Cost Base
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Market Value
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Unrealised
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Assessable
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Term
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Method
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items
                .sort((a, b) => b.unrealisedGain - a.unrealisedGain)
                .map((item) => (
                  <tr
                    key={item.instrumentCode}
                    className="hover:bg-accent/50"
                  >
                    <td className="px-4 py-3 font-medium">
                      {item.instrumentCode}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {item.quantity.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {formatCurrency(item.costBase)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {formatCurrency(item.marketValue)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right text-sm ${item.unrealisedGain < 0 ? "text-loss" : ""}`}
                    >
                      {formatCurrency(item.unrealisedGain)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {formatCurrency(item.assessableGain)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.isLongTerm ? "Long (≥12m)" : "Short (<12m)"}
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">
                      {item.methodUsed}
                    </td>
                  </tr>
                ))}
              {/* Totals */}
              <tr className="bg-muted/30 font-medium">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right text-sm">
                  {items
                    .reduce((s, i) => s + i.quantity, 0)
                    .toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(totalCostBase)}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(totalMarketValue)}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(totalUnrealised)}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(
                    items.reduce((s, i) => s + i.assessableGain, 0)
                  )}
                </td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3"></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Tax planning guidance */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h3 className="text-sm font-medium">Tax Planning Notes</h3>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          <li>
            • Holdings with unrealised losses can be sold to offset gains
            (tax-loss harvesting)
          </li>
          <li>
            • Holdings approaching 12-month mark qualify for 50% CGT discount
            if held longer
          </li>
          <li>
            • SMSF entities receive 33.33% discount instead of 50%
          </li>
          <li>• Companies do not receive any CGT discount</li>
          <li>
            • Capital losses must be offset against gains before applying the
            discount
          </li>
        </ul>
      </div>
    </div>
  );
}
