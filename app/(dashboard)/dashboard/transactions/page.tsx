import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function AllTransactionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const transactions = await db.transaction.findMany({
    where: {
      holding: { portfolio: { userId: session.user.id } },
    },
    include: {
      holding: { include: { instrument: true, portfolio: true } },
    },
    orderBy: { tradeDate: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="rounded-md p-2 hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold">All Transactions</h1>
          <p className="text-sm text-muted-foreground">
            {transactions.length} transactions across all portfolios
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Instrument
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Portfolio
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
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map((tx) => {
                const qty = Number(tx.quantity);
                const price = Number(tx.price);
                const brokerage = Number(tx.brokerage);
                const accrued = Number(tx.accruedInterest ?? 0);
                const isIncome = [
                  "DIVIDEND",
                  "INTEREST",
                  "COUPON",
                  "RETURN_OF_CAPITAL",
                ].includes(tx.transactionType);
                const gross = qty * price;
                const amount = isIncome ? gross : gross + brokerage + accrued;
                const holdingHref = `/portfolio/${tx.holding.portfolio.id}/holdings/${tx.holdingId}`;
                return (
                  <tr key={tx.id} className="hover:bg-accent/50">
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <Link
                        href={holdingHref}
                        className="hover:text-primary hover:underline"
                      >
                        {tx.tradeDate.toISOString().split("T")[0]}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={holdingHref}
                        className="font-medium text-primary hover:underline"
                      >
                        {tx.holding.instrument.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <Link
                        href={holdingHref}
                        className="hover:text-primary hover:underline"
                      >
                        {tx.transactionType.replace(/_/g, " ")}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <Link
                        href={holdingHref}
                        className="hover:text-primary hover:underline"
                      >
                        {tx.holding.portfolio.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <Link
                        href={holdingHref}
                        className="hover:text-primary hover:underline"
                      >
                        {isIncome ? "—" : qty.toLocaleString()}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <Link
                        href={holdingHref}
                        className="hover:text-primary hover:underline"
                      >
                        {isIncome
                          ? "—"
                          : `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                      <Link
                        href={holdingHref}
                        className="hover:text-primary hover:underline"
                      >
                        {brokerage > 0
                          ? `$${brokerage.toFixed(2)}`
                          : accrued > 0
                            ? `$${accrued.toFixed(2)} acc`
                            : "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      <Link
                        href={holdingHref}
                        className="hover:text-primary hover:underline"
                      >
                        ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
