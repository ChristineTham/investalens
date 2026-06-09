import { auth } from "@/lib/auth";
import { getCashAccounts } from "@/lib/actions/cash-accounts";
import { formatCurrency } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function CashPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const accounts = await getCashAccounts(id);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold">Cash Accounts</h1>
      <p className="text-sm text-muted-foreground">
        Manage cash accounts linked to this portfolio.
      </p>

      {accounts.length === 0 ? (
        <p className="text-muted-foreground">No cash accounts yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map((account) => (
            <div key={account.id} className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-medium">{account.name}</h3>
              <p className="mt-1 text-2xl font-bold">{formatCurrency(Number(account.balance), account.currency)}</p>
              <p className="text-sm text-muted-foreground">{account.currency}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
