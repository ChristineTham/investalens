import Link from "next/link";
import { ArrowLeft, Landmark, CreditCard, Upload, Link2 } from "lucide-react";
import { getAccountDetail, getAccountsOverview, signedAmount } from "@/lib/services/accounts";
import { getCategories } from "@/lib/actions/accounts";
import { syncPortfolioLedger } from "@/lib/services/cash-ledger";
import { AccountActions } from "@/components/accounts/account-actions";
import { AccountDetailClient } from "@/components/accounts/account-detail-client";
import { ConvertVirtualButton } from "@/components/accounts/convert-virtual-button";
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
  let account = await getAccountDetail(id);
  // Virtual ledgers are derived: rebuild from the portfolio's transactions on view.
  // Call the service directly (not the server action) — revalidatePath is not
  // allowed during a Server Component render.
  if (account.isVirtual && account.portfolioId) {
    await syncPortfolioLedger(account.portfolioId);
    account = await getAccountDetail(id);
  }
  const [cats, accountsOverview] = await Promise.all([
    getCategories(),
    getAccountsOverview(),
  ]);

  const meta = {
    id: account.id,
    name: account.name,
    currency: account.currency,
    isVirtual: account.isVirtual,
    balance: Number(account.balance),
  };

  // Running balance per transaction, computed chronologically (oldest first)
  // from the opening balance. `account.transactions` is ordered newest-first.
  const opening = Number(account.openingBalance);
  const runningById = new Map<string, number>();
  let running = opening;
  for (const t of [...account.transactions].reverse()) {
    running += signedAmount(t.type, Number(t.amount));
    runningById.set(t.id, running);
  }

  const txRows = account.transactions.map((t) => ({
    id: t.id,
    date: t.date.toISOString().split("T")[0],
    type: t.type,
    amount: Number(t.amount),
    description: t.description,
    categoryId: t.categoryId,
    categoryName: t.category?.name ?? null,
    transferAccountId: t.transferAccountId ?? null,
    transferAccountName: t.transferAccount?.name ?? null,
    source: t.source,
    reconciled: t.reconciled,
    runningBalance: runningById.get(t.id) ?? opening,
  }));

  const categories = cats.map((c) => ({ id: c.id, name: c.name, kind: c.kind }));
  // Exclude the current account from the transfer picker
  const transferAccounts = accountsOverview.accounts
    .filter((a) => a.id !== id && !a.isVirtual)
    .map((a) => ({ id: a.id, name: a.name }));

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
        {!account.isVirtual && (
          <Link
            href={`/accounts/${id}/import`}
            className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <Upload className="h-4 w-4" />
            Import
          </Link>
        )}
        {!account.isVirtual && account.portfolioLinks.length > 0 && (
          <Link
            href={`/accounts/${id}/reconcile`}
            className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <Link2 className="h-4 w-4" />
            Reconcile
          </Link>
        )}
      </div>

      {account.isVirtual && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <p>
            This is an auto-maintained portfolio cash ledger. It is read-only, and its balance is
            excluded from total cash and portfolio value (income is still counted).
          </p>
          <ConvertVirtualButton accountId={id} />
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

      <AccountDetailClient account={meta} transactions={txRows} categories={categories} transferAccounts={transferAccounts} />
    </div>
  );
}
