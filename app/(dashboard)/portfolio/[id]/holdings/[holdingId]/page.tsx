import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTransactions } from "@/lib/actions/transaction";
import { ArrowLeft, GitMerge } from "lucide-react";
import { redirect } from "next/navigation";
import { AddTransactionForm } from "@/components/forms/add-transaction-form";
import { TransactionRow } from "@/components/forms/transaction-row";
import { DeleteHoldingButton } from "@/components/forms/delete-holding-button";
import { DrpToggle } from "@/components/forms/drp-toggle";

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
      <div className="flex items-center justify-between">
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
        <div className="flex items-center gap-2">
          <Link
            href={`/portfolio/${id}/holdings/${holdingId}/actions`}
            className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <GitMerge className="h-4 w-4" />
            Corporate Actions
          </Link>
          <DeleteHoldingButton
            holdingId={holdingId}
            portfolioId={id}
            instrumentCode={holding.instrument.code}
          />
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
            <div className="mt-1 flex items-center gap-2">
              <DrpToggle holdingId={holdingId} enabled={holding.drpEnabled} />
              <span className="text-sm text-muted-foreground">
                {holding.drpEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Transactions</p>
            <p className="font-medium">{transactions.length}</p>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Transaction History</h2>
          <AddTransactionForm
            holdingId={holdingId}
            currency={holding.instrument.currency}
          />
        </div>
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
                  <th className="w-20 px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    transaction={tx}
                    currency={holding.instrument.currency}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
