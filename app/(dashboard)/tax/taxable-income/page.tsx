import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateTaxableIncomeReport } from "@/lib/reports/tax/taxable-income";
import { formatCurrency } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function TaxableIncomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const portfolios = await db.portfolio.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
  });

  if (portfolios.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-bold">Taxable Income Report</h1>
        <p className="text-muted-foreground">Create a portfolio first.</p>
      </div>
    );
  }

  const currentFY = new Date().getMonth() >= 6
    ? new Date().getFullYear() + 1
    : new Date().getFullYear();

  const report = await generateTaxableIncomeReport(portfolios[0].id, currentFY);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold">Taxable Income Report</h1>
      <p className="text-sm text-muted-foreground">{report.financialYear}</p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Income</p>
          <p className="text-lg font-bold">{formatCurrency(report.totals.totalIncome)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Franking Credits</p>
          <p className="text-lg font-bold">{formatCurrency(report.totals.frankingCredits)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Foreign Tax</p>
          <p className="text-lg font-bold">{formatCurrency(report.totals.foreignTax)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Interest</p>
          <p className="text-lg font-bold">{formatCurrency(report.totals.interest)}</p>
        </div>
      </div>

      {report.items.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Code</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Net Dividend</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Franked</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Unfranked</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Credits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {report.items.map((item) => (
                <tr key={item.instrumentCode} className="hover:bg-accent/50">
                  <td className="px-4 py-3 font-medium">{item.instrumentCode}</td>
                  <td className="px-4 py-3 text-right text-sm">{formatCurrency(item.netDividend)}</td>
                  <td className="px-4 py-3 text-right text-sm">{formatCurrency(item.frankedAmount)}</td>
                  <td className="px-4 py-3 text-right text-sm">{formatCurrency(item.unfrankedAmount)}</td>
                  <td className="px-4 py-3 text-right text-sm">{formatCurrency(item.frankingCredits)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
