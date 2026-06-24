import Link from "next/link";
import { ArrowLeft, Landmark, CreditCard } from "lucide-react";
import { getAccountDetail } from "@/lib/services/accounts";
import { getCategories } from "@/lib/actions/accounts";
import { AccountActions } from "@/components/accounts/account-actions";
import { AccountDetailClient } from "@/components/accounts/account-detail-client";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-context";
import { formatCurrency } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  transaction: "Transaction",
  savings: "Savings",
  offset: "Offset",
  term_deposit: "Term deposit",
  credit_card: "Credit card",
  cash: "Cash",
};

function mask(n: string | null): string | null {
  if (!n) return null;
  const d = n.replace(/\s/g, "");
  return d.length <= 4 ? d : `•••• ${d.slice(-4)}`;
}

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [account, cats] = await Promise.all([getAccountDetail(id), getCategories()]);

  const meta = {
    id: account.id,
    name: account.name,
    currency: account.currency,
    isVirtual: account.isVirtual,
    balance: Number(account.balance),
  };

  const txRows = account.transactions.map((t) => ({
    id: t.id,
    date: t.date.toISOString().split("T")[0],
    type: t.type,
    amount: Number(t.amount),
    description: t.description,
    categoryId: t.categoryId,
    categoryName: t.category?.name ?? null,
    source: t.source,
    reconciled: t.reconciled,
  }));

  const categories = cats.map((c) => ({ id: c.id, name: c.name, kind: c.kind }));

  const subtitle = [
    account.institution,
    TYPE_LABELS[account.accountType] ?? account.accountType,
    account.bsb ? `BSB ${account.bsb}` : null,
    mask(account.accountNumber),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <BreadcrumbLabel id={id} label={account.name} />

      <div className="flex flex-wrap items-center gap-4">
        <Link href="/accounts" className="rounded-md p-2 hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-2 font-serif text-2xl font-bold">
            <Landmark className="h-5 w-5 text-muted-foreground" />
            {account.name}
            {account.isVirtual && (
              <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Virtual
              </span>
            )}
          </h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {!account.isVirtual && (
          <AccountActions
            account={{
              id: account.id,
              name: account.name,
              institution: account.institution,
              bsb: account.bsb,
              accountNumber: account.accountNumber,
              accountType: account.accountType,
              interestRate: account.interestRate != null ? Number(account.interestRate) : null,
              website: account.website,
              notes: account.notes,
            }}
          />
        )}
      </div>

      {account.isVirtual && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          This is an auto-maintained portfolio cash ledger. It is read-only, and its balance is
          excluded from total cash and portfolio value (income is still counted).
        </div>
      )}

      {/* Balance + cards + linked portfolios */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Current balance</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {formatCurrency(meta.balance, account.currency)}
          </p>
          {account.interestRate != null && (
            <p className="mt-1 text-xs text-muted-foreground">
              {(Number(account.interestRate) * 100).toFixed(2)}% p.a.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-2 text-xs text-muted-foreground">Linked portfolios</p>
          {account.portfolioLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground">None</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {account.portfolioLinks.map((l) => (
                <li key={l.id} className="flex items-center gap-2">
                  <Link
                    href={`/portfolio/${l.portfolio.id}`}
                    className="text-primary hover:underline"
                  >
                    {l.portfolio.name}
                  </Link>
                  {l.isDefault && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      Default
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-2 text-xs text-muted-foreground">Cards</p>
          {account.cards.length === 0 ? (
            <p className="text-sm text-muted-foreground">None</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {account.cards.map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="capitalize">{c.network ?? "card"}</span>
                  {c.last4 && <span className="text-muted-foreground">•••• {c.last4}</span>}
                  {c.label && <span className="text-muted-foreground">· {c.label}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <AccountDetailClient account={meta} transactions={txRows} categories={categories} />
    </div>
  );
}
