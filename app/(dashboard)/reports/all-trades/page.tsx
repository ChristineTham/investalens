import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function AllTradesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const transactions = await db.transaction.findMany({
    where: { holding: { portfolio: { userId: session.user.id } } },
    include: { holding: { include: { instrument: true, portfolio: { select: { name: true } } } } },
    orderBy: { tradeDate: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold">All Trades</h1>
      <p className="text-sm text-muted-foreground">
        Complete transaction history across all holdings (latest 100).
      </p>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Portfolio</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Code</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Qty</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Price</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Brokerage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-accent/50">
                <td className="px-4 py-3 text-sm">{formatDate(tx.tradeDate)}</td>
                <td className="px-4 py-3 text-sm">{tx.holding.portfolio.name}</td>
                <td className="px-4 py-3 font-medium">{tx.holding.instrument.code}</td>
                <td className="px-4 py-3 text-sm">{tx.transactionType}</td>
                <td className="px-4 py-3 text-right text-sm">{Number(tx.quantity).toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-sm">{formatCurrency(Number(tx.price))}</td>
                <td className="px-4 py-3 text-right text-sm text-muted-foreground">{formatCurrency(Number(tx.brokerage))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
