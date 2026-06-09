import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTransactions } from "@/lib/actions/transaction";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";

export default async function HoldingDetailPage({
  params,
}: {
  params: Promise<{ id: string; holdingId: string }>;
}) {
  const { id, holdingId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const holding = await db.holding.findFirst({
    where: {
      id: holdingId,
      portfolio: { userId: session.user.id },
    },
    include: { instrument: true, portfolio: true },
  });

  if (!holding) redirect(`/portfolio/${id}`);

  const transactions = await getTransactions(holdingId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/portfolio/${id}`}
          className="rounded-md p-2 hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold">
            {holding.instrument.code}
          </h1>
          <p className="text-sm text-muted-foreground">
            {holding.instrument.name} · {holding.instrument.marketCode}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-medium">Holding Summary</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Type</p>
            <p className="font-medium capitalize">
              {holding.instrument.instrumentType}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Currency</p>
            <p className="font-medium">{holding.instrument.currency}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">DRP</p>
            <p className="font-medium">
              {holding.drpEnabled ? "Enabled" : "Disabled"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Transactions</p>
            <p className="font-medium">{transactions.length}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium">Transaction History</h2>
        {transactions.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No transactions recorded yet.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Quantity
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
                    <td className="px-4 py-3 text-sm font-medium">
                      {tx.transactionType}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {Number(tx.quantity).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {formatCurrency(Number(tx.price), holding.instrument.currency)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                      {formatCurrency(Number(tx.brokerage), holding.instrument.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
