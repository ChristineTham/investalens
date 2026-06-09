import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateSoldSecuritiesReport } from "@/lib/reports/sold-securities-report";
import { formatCurrency, formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function SoldSecuritiesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const portfolios = await db.portfolio.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
  });

  if (portfolios.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-bold">Sold Securities</h1>
        <p className="text-muted-foreground">Create a portfolio first.</p>
      </div>
    );
  }

  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const items = await generateSoldSecuritiesReport(portfolios[0].id, {
    from: oneYearAgo,
    to: now,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold">Sold Securities</h1>
      <p className="text-sm text-muted-foreground">
        Realised gains and losses on closed positions.
      </p>

      {items.length === 0 ? (
        <p className="text-muted-foreground">No sales in the past 12 months.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Proceeds
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
                    {formatDate(item.tradeDate)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {item.quantity.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatCurrency(item.proceeds)}
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
