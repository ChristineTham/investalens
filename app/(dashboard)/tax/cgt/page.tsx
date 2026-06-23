import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  generateCgtReport,
  type CgtItem,
  type CgtSummary,
} from "@/lib/reports/tax/cgt-report";
import { formatCurrency, formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";
import { TaxFilter } from "@/components/reports/tax-filter";
import { Suspense } from "react";

export default async function CgtPage({
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
        <h1 className="font-serif text-2xl font-bold">Capital Gains Tax</h1>
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
  const selectedYear = params.year ? parseInt(params.year, 10) : currentFY;
  const availableYears = Array.from({ length: 5 }, (_, i) => currentFY - i);

  // Generate CGT report
  let items: CgtItem[] = [];
  let summary: Pick<
    CgtSummary,
    | "shortTermGains"
    | "longTermGains"
    | "totalLosses"
    | "cgtDiscount"
    | "indexationRelief"
    | "netCapitalGain"
    | "method"
    | "financialYear"
  >;

  if (selectedPortfolioId) {
    const report = await generateCgtReport(selectedPortfolioId, selectedYear);
    items = report.items;
    summary = report;
  } else {
    // Consolidated across all portfolios
    const allItems: CgtItem[] = [];
    let lastFY = "";
    let lastMethod = "fifo";
    for (const p of portfolios) {
      const report = await generateCgtReport(p.id, selectedYear);
      allItems.push(...report.items);
      lastFY = report.financialYear;
      lastMethod = report.method;
    }
    items = allItems.sort(
      (a, b) =>
        new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime()
    );

    const shortTermGains = items
      .filter((i) => !i.isLongTerm && i.gain > 0)
      .reduce((s, i) => s + i.gain, 0);
    const longTermGains = items
      .filter((i) => i.isLongTerm && i.gain > 0)
      .reduce((s, i) => s + i.gain, 0);
    const totalLosses = items
      .filter((i) => i.gain < 0)
      .reduce((s, i) => s + Math.abs(i.gain), 0);
    const cgtDiscount = items.reduce((s, i) => s + i.cgtDiscount, 0);
    const indexationRelief = items.reduce((s, i) => s + i.indexationRelief, 0);
    const netCapitalGain = Math.max(
      0,
      shortTermGains + longTermGains - cgtDiscount - indexationRelief - totalLosses
    );

    summary = {
      shortTermGains,
      longTermGains,
      totalLosses,
      cgtDiscount,
      indexationRelief,
      netCapitalGain,
      method: lastMethod as CgtSummary["method"],
      financialYear: lastFY,
    };
  }

  // ATO CGT calculation steps
  const totalGains = summary.shortTermGains + summary.longTermGains;
  const gainsAfterLosses = Math.max(0, totalGains - summary.totalLosses);
  const netAfterDiscount = Math.max(
    0,
    gainsAfterLosses - summary.cgtDiscount - summary.indexationRelief
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">Capital Gains Tax</h1>
          <p className="text-sm text-muted-foreground">
            {summary.financialYear} — Parcel allocation:{" "}
            {summary.method.toUpperCase()}
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

      {/* ATO CGT Summary — mirrors Schedule 18 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Gains</p>
          <p className="text-lg font-bold">{formatCurrency(totalGains)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Short-term</p>
          <p className="text-lg font-bold">
            {formatCurrency(summary.shortTermGains)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            held &lt;12 months
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Long-term</p>
          <p className="text-lg font-bold">
            {formatCurrency(summary.longTermGains)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            held ≥12 months
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Capital Losses</p>
          <p className="text-lg font-bold text-loss">
            -{formatCurrency(summary.totalLosses)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">50% CGT Discount</p>
          <p className="text-lg font-bold">
            -{formatCurrency(summary.cgtDiscount)}
          </p>
        </div>
        {summary.indexationRelief > 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Indexation Relief</p>
            <p className="text-lg font-bold">
              -{formatCurrency(summary.indexationRelief)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              pre-1999 CPI method
            </p>
          </div>
        )}
        <div className="rounded-lg border border-border bg-card p-4 ring-2 ring-primary/20">
          <p className="text-xs font-medium text-primary">
            Net Capital Gain
          </p>
          <p className="text-lg font-bold">{formatCurrency(netAfterDiscount)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            assessable amount
          </p>
        </div>
      </div>

      {/* ATO calculation steps */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h3 className="text-sm font-medium">
          CGT Calculation (ATO Method)
        </h3>
        <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
          <li>
            1. Total capital gains: {formatCurrency(totalGains)}
          </li>
          <li>
            2. Less capital losses: -{formatCurrency(summary.totalLosses)}
          </li>
          <li>
            3. Net gains after losses: {formatCurrency(gainsAfterLosses)}
          </li>
          <li>
            4. Less 50% CGT discount (on long-term discount-method gains): -
            {formatCurrency(summary.cgtDiscount)}
          </li>
          {summary.indexationRelief > 0 && (
            <li>
              4a. Less CPI indexation relief (pre-1999 assets): -
              {formatCurrency(summary.indexationRelief)}
            </li>
          )}
          <li className="font-medium text-foreground">
            5. Net capital gain (Item 18 tax return):{" "}
            {formatCurrency(netAfterDiscount)}
          </li>
        </ol>
      </div>

      {/* CGT method / indexation methodology note */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h3 className="text-sm font-medium">CGT methods &amp; CPI indexation</h3>
        <p className="mt-2 text-xs text-muted-foreground">
          Australian CGT allows two ways to work out a gain on assets held for
          at least 12 months. This report currently applies the{" "}
          <span className="font-medium text-foreground">discount method</span>:
          the nominal gain (proceeds less cost base) is reduced by the CGT
          discount shown above ({summary.method.toUpperCase()} parcel
          allocation).
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          For assets acquired before{" "}
          <span className="font-medium text-foreground">
            21 September 1999
          </span>
          , the <span className="font-medium text-foreground">indexation
          method</span> is the inflation-indexed alternative: the cost base is
          uplifted by the change in the ABS Consumer Price Index (frozen at the
          September 1999 quarter) before the gain is calculated, and no CGT
          discount applies. Taxpayers may use whichever method produces the
          lower assessable gain. CPI index data is sourced from the Reserve Bank
          of Australia (Statistical Table&nbsp;G1, Consumer Price Inflation).
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Traditional (non-listed) bonds are exempt from CGT and are excluded
          here &mdash; any discount or premium realised on sale or at maturity is
          ordinary income and appears in the Taxable Income report. Listed and
          hybrid securities remain subject to CGT.
        </p>
      </div>

      {/* Detail table */}
      {items.length === 0 ? (
        <p className="text-muted-foreground">
          No asset sales in this tax year.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Sale Date
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Proceeds
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Cost Base
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Gain/Loss
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
              {items.map((item, i) => (
                <tr key={i} className="hover:bg-accent/50">
                  <td className="px-4 py-3 font-medium">
                    {item.instrumentCode}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatDate(item.saleDate)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatCurrency(item.proceeds)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatCurrency(item.costBase)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right text-sm ${item.gain < 0 ? "text-loss" : ""}`}
                  >
                    {formatCurrency(item.gain)}
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
                <td className="px-4 py-3" colSpan={3}>
                  Total ({items.length} disposal
                  {items.length !== 1 ? "s" : ""})
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(
                    items.reduce((s, i) => s + i.proceeds, 0)
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(
                    items.reduce((s, i) => s + i.costBase, 0)
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(items.reduce((s, i) => s + i.gain, 0))}
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

      {/* Tax return guidance */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h3 className="text-sm font-medium">ATO Tax Return Mapping</h3>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          <li>
            <strong>Item 18 (Capital gains):</strong>{" "}
            {formatCurrency(netAfterDiscount)}
          </li>
          <li>
            <strong>Label A (Total current year capital gains):</strong>{" "}
            {formatCurrency(totalGains)}
          </li>
          <li>
            <strong>Label H (Net capital gain):</strong>{" "}
            {formatCurrency(netAfterDiscount)}
          </li>
          <li>
            <strong>Label V (Total current year capital losses):</strong>{" "}
            {formatCurrency(summary.totalLosses)}
          </li>
        </ul>
      </div>
    </div>
  );
}
