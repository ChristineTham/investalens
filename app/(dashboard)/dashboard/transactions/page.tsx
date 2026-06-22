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

  const fees = await db.fee.findMany({
    where: { portfolio: { userId: session.user.id } },
    include: { portfolio: { select: { id: true, name: true } } },
    orderBy: { invoiceDate: "desc" },
  });

  type ActivityRow = {
    key: string;
    date: Date;
    portfolioId: string;
    portfolioName: string;
    holdingId: string | null;
    instrumentCode: string;
    type: string;
    quantity: number | null;
    price: number | null;
    fees: number;
    amount: number;
  };

  const txRows: ActivityRow[] = transactions.map((tx) => {
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
    return {
      key: `tx-${tx.id}`,
      date: tx.tradeDate,
      portfolioId: tx.holding.portfolio.id,
      portfolioName: tx.holding.portfolio.name,
      holdingId: tx.holdingId,
      instrumentCode: tx.holding.instrument.code,
      type: tx.transactionType,
      quantity: isIncome ? null : qty,
      price: isIncome ? null : price,
      fees: brokerage,
      amount: isIncome ? gross : gross + brokerage + accrued,
    };
  });

  const feeRows: ActivityRow[] = fees.map((fee) => ({
    key: `fee-${fee.id}`,
    date: fee.invoiceDate,
    portfolioId: fee.portfolio.id,
    portfolioName: fee.portfolio.name,
    holdingId: null,
    instrumentCode: "Custody Fee",
    type: "FEE",
    quantity: null,
    price: null,
    fees: Number(fee.total),
    amount: Number(fee.total),
  }));

  const rows = [...txRows, ...feeRows].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="rounded-md p-2 hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold">All Activity</h1>
          <p className="text-sm text-muted-foreground">
            {transactions.length} transactions
            {fees.length > 0 ? ` and ${fees.length} fees` : ""} across all
            portfolios
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
                  Fees
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const href = row.holdingId
                  ? `/portfolio/${row.portfolioId}/holdings/${row.holdingId}`
                  : `/portfolio/${row.portfolioId}/bonds`;
                return (
                  <tr key={row.key} className="hover:bg-accent/50">
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <Link href={href} className="hover:text-primary hover:underline">
                        {row.date.toISOString().split("T")[0]}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={href} className="font-medium text-primary hover:underline">
                        {row.instrumentCode}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <Link href={href} className="hover:text-primary hover:underline">
                        {row.type.replace(/_/g, " ")}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <Link href={href} className="hover:text-primary hover:underline">
                        {row.portfolioName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <Link href={href} className="hover:text-primary hover:underline">
                        {row.quantity != null ? row.quantity.toLocaleString() : "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <Link href={href} className="hover:text-primary hover:underline">
                        {row.price != null
                          ? `$${row.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
                          : "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                      <Link href={href} className="hover:text-primary hover:underline">
                        {row.fees > 0 ? `$${row.fees.toFixed(2)}` : "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      <Link href={href} className="hover:text-primary hover:underline">
                        ${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
