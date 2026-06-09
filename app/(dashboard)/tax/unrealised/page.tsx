import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateUnrealisedCgtReport } from "@/lib/reports/tax/unrealised-cgt";
import { formatCurrency } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function UnrealisedCgtPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const portfolios = await db.portfolio.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
  });

  if (portfolios.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-bold">Unrealised CGT</h1>
        <p className="text-muted-foreground">Create a portfolio first.</p>
      </div>
    );
  }

  const report = await generateUnrealisedCgtReport(portfolios[0].id);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold">Unrealised CGT</h1>
      <p className="text-sm text-muted-foreground">
        Hypothetical capital gains tax if all positions sold today.
      </p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Short-term Gains</p>
          <p className="text-lg font-bold">
            {formatCurrency(report.shortTermGains)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Long-term Gains</p>
          <p className="text-lg font-bold">
            {formatCurrency(report.longTermGains)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Losses</p>
          <p className="text-lg font-bold text-destructive">
            {formatCurrency(report.unrealisedLosses)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">CGT Discount</p>
          <p className="text-lg font-bold">
            {formatCurrency(report.cgtDiscount)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Net Hypothetical</p>
          <p className="text-lg font-bold">
            {formatCurrency(report.netHypotheticalGain)}
          </p>
        </div>
      </div>

      {report.items.length > 0 && (
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
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Term
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {report.items.map((item) => (
                <tr key={item.instrumentCode} className="hover:bg-accent/50">
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
                  <td className="px-4 py-3 text-right text-sm">
                    {formatCurrency(item.unrealisedGain)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {item.isLongTerm ? "Long" : "Short"}
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
