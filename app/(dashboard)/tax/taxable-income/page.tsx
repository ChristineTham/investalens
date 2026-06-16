import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  generateTaxableIncomeReport,
  type TaxableIncomeItem,
} from "@/lib/reports/tax/taxable-income";
import { formatCurrency } from "@/lib/utils";
import { redirect } from "next/navigation";
import { TaxFilter } from "@/components/reports/tax-filter";
import { Suspense } from "react";

export default async function TaxableIncomePage({
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
        <h1 className="font-serif text-2xl font-bold">Taxable Income Report</h1>
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

  // Generate report for selected portfolio or all portfolios
  let items: TaxableIncomeItem[] = [];
  let financialYearLabel = "";

  if (selectedPortfolioId) {
    const report = await generateTaxableIncomeReport(
      selectedPortfolioId,
      selectedYear
    );
    items = report.items;
    financialYearLabel = report.financialYear;
  } else {
    // Consolidated: merge across all portfolios
    const merged = new Map<string, TaxableIncomeItem>();
    for (const p of portfolios) {
      const report = await generateTaxableIncomeReport(p.id, selectedYear);
      financialYearLabel = report.financialYear;
      for (const item of report.items) {
        const existing = merged.get(item.instrumentCode);
        if (existing) {
          existing.totalIncome += item.totalIncome;
          existing.netDividend += item.netDividend;
          existing.frankedAmount += item.frankedAmount;
          existing.unfrankedAmount += item.unfrankedAmount;
          existing.interest += item.interest;
          existing.taxDeferred += item.taxDeferred;
          existing.foreignIncome += item.foreignIncome;
          existing.frankingCredits += item.frankingCredits;
          existing.foreignTax += item.foreignTax;
        } else {
          merged.set(item.instrumentCode, { ...item });
        }
      }
    }
    items = Array.from(merged.values());
  }

  // Calculate totals
  const totals = {
    totalIncome: items.reduce((s, i) => s + i.totalIncome, 0),
    netDividend: items.reduce((s, i) => s + i.netDividend, 0),
    frankedAmount: items.reduce((s, i) => s + i.frankedAmount, 0),
    unfrankedAmount: items.reduce((s, i) => s + i.unfrankedAmount, 0),
    interest: items.reduce((s, i) => s + i.interest, 0),
    taxDeferred: items.reduce((s, i) => s + i.taxDeferred, 0),
    foreignIncome: items.reduce((s, i) => s + i.foreignIncome, 0),
    frankingCredits: items.reduce((s, i) => s + i.frankingCredits, 0),
    foreignTax: items.reduce((s, i) => s + i.foreignTax, 0),
  };

  // Grossed-up income for ATO reporting
  const grossedUpIncome = totals.totalIncome + totals.frankingCredits;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">
            Taxable Income Report
          </h1>
          <p className="text-sm text-muted-foreground">
            {financialYearLabel} — Investment income for tax return
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

      {/* Summary cards — ATO tax return mapping */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            Total Assessable Income
          </p>
          <p className="text-lg font-bold">{formatCurrency(grossedUpIncome)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            (grossed-up with credits)
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            Franked Dividends
          </p>
          <p className="text-lg font-bold">
            {formatCurrency(totals.frankedAmount)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            Unfranked Dividends
          </p>
          <p className="text-lg font-bold">
            {formatCurrency(totals.unfrankedAmount)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Franking Credits</p>
          <p className="text-lg font-bold">
            {formatCurrency(totals.frankingCredits)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            (tax offset)
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Interest Income</p>
          <p className="text-lg font-bold">
            {formatCurrency(totals.interest)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Foreign Income</p>
          <p className="text-lg font-bold">
            {formatCurrency(totals.foreignIncome)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Foreign Tax Paid</p>
          <p className="text-lg font-bold">
            {formatCurrency(totals.foreignTax)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            (FITO offset)
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Tax-Deferred</p>
          <p className="text-lg font-bold">
            {formatCurrency(totals.taxDeferred)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            (reduces cost base)
          </p>
        </div>
      </div>

      {/* Detail table */}
      {items.length === 0 ? (
        <p className="text-muted-foreground">
          No income transactions in this period.
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
                  Net Dividend
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Franked
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Unfranked
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Credits
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Interest
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Foreign Tax
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Tax-Deferred
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.instrumentCode} className="hover:bg-accent/50">
                  <td className="px-4 py-3 font-medium">
                    {item.instrumentCode}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatCurrency(item.netDividend)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatCurrency(item.frankedAmount)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatCurrency(item.unfrankedAmount)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatCurrency(item.frankingCredits)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatCurrency(item.interest)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatCurrency(item.foreignTax)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatCurrency(item.taxDeferred)}
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="bg-muted/30 font-medium">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(totals.netDividend)}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(totals.frankedAmount)}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(totals.unfrankedAmount)}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(totals.frankingCredits)}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(totals.interest)}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(totals.foreignTax)}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(totals.taxDeferred)}
                </td>
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
            <strong>Item 11 (Dividends):</strong> Franked + Unfranked ={" "}
            {formatCurrency(totals.frankedAmount + totals.unfrankedAmount)}
          </li>
          <li>
            <strong>Item 11 Label T (Franking Credits):</strong>{" "}
            {formatCurrency(totals.frankingCredits)}
          </li>
          <li>
            <strong>Item 10 (Interest):</strong>{" "}
            {formatCurrency(totals.interest)}
          </li>
          <li>
            <strong>Item 20 (Foreign Income):</strong>{" "}
            {formatCurrency(totals.foreignIncome)}
          </li>
          <li>
            <strong>Item 20 (Foreign Tax Offset - FITO):</strong>{" "}
            {formatCurrency(totals.foreignTax)}
          </li>
        </ul>
      </div>
    </div>
  );
}
