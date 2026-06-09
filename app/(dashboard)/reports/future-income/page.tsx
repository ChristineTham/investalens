import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateFutureIncomeReport } from "@/lib/reports/future-income-report";
import { formatCurrency, formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function FutureIncomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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

  const items = await generateFutureIncomeReport(portfolios[0].id);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold">Future Income</h1>
      <p className="text-sm text-muted-foreground">
        Projected dividends and income based on current holdings.
      </p>
      {items.length === 0 ? (
        <p className="text-muted-foreground">No income history to estimate from.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Code</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Est. Amount</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Frequency</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Next Payment</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.holdingId} className="hover:bg-accent/50">
                  <td className="px-4 py-3 font-medium">{item.instrumentCode}</td>
                  <td className="px-4 py-3 text-right text-sm">{formatCurrency(item.estimatedAmount)}</td>
                  <td className="px-4 py-3 text-sm capitalize">{item.frequency.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-sm">{item.nextPaymentDate ? formatDate(item.nextPaymentDate) : "—"}</td>
                  <td className="px-4 py-3 text-sm capitalize">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
