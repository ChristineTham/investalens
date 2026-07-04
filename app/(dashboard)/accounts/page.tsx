import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet, Landmark, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { getAccountsOverview } from "@/lib/services/accounts";
import { seedDefaultCategories } from "@/lib/actions/accounts";
import { CreateAccountButton } from "@/components/accounts/create-account-button";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Accounts",
};

const TYPE_LABELS: Record<string, string> = {
  transaction: "Transaction",
  savings: "Savings",
  offset: "Offset",
  term_deposit: "Term deposit",
  credit_card: "Credit card",
  cash: "Cash",
};

export default async function AccountsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await seedDefaultCategories(session.user.id);
  const { accounts, totalCash } = await getAccountsOverview();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Bank and cash accounts, balances, and transactions
          </p>
        </div>
        <CreateAccountButton />
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Total cash (real accounts)</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">
          {formatCurrency(totalCash)}
        </p>
      </div>

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12">
          <Wallet className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No accounts yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Add a bank or cash account to start tracking balances and transactions.
          </p>
        </div>
      ) : (
        <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((a) => (
            <Link
              key={a.id}
              href={`/accounts/${a.id}`}
              className="group flex h-full flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 font-medium group-hover:text-primary">
                    <Landmark className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{a.name}</span>
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {a.institution ? `${a.institution} · ` : ""}
                    {TYPE_LABELS[a.accountType] ?? a.accountType}
                    {a.maskedNumber ? ` · ${a.maskedNumber}` : ""}
                  </p>
                </div>
                {a.isVirtual && (
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Virtual
                  </span>
                )}
              </div>

              <div className="mt-3">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="text-2xl font-bold tabular-nums">
                  {formatCurrency(a.balance, a.currency)}
                </p>
              </div>

              <div className="mt-auto pt-3 text-xs text-muted-foreground">
                {a.transactionCount} transaction{a.transactionCount === 1 ? "" : "s"}
                {a.linkedPortfolios.length > 0 && (
                  <span>
                    {" · "}
                    {a.linkedPortfolios.map((p) => p.name).join(", ")}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Virtual accounts are auto-maintained portfolio cash ledgers. Their balances are
        excluded from total cash and portfolio value; their income is still counted.{" "}
        <Link href="/portfolio" className="text-primary hover:underline">
          Manage portfolios <ArrowRight className="inline h-3 w-3" />
        </Link>
      </p>
    </div>
  );
}
