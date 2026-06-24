"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Star, Unlink, Plus } from "lucide-react";
import {
  linkPortfolioAccount,
  unlinkPortfolioAccount,
} from "@/lib/actions/accounts";
import { formatCurrency } from "@/lib/utils";
import type { PortfolioAccountLinks } from "@/lib/services/accounts";

export function PortfolioAccountsPanel({
  portfolioId,
  links,
}: {
  portfolioId: string;
  links: PortfolioAccountLinks;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-medium">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          Linked accounts
        </h2>
        {links.virtualAccountId && (
          <Link
            href={`/accounts/${links.virtualAccountId}`}
            className="text-xs text-primary hover:underline"
          >
            View cash ledger
          </Link>
        )}
      </div>

      {links.linked.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No bank accounts linked. Portfolio cash flows are tracked in the virtual cash
          ledger; link a real account to reconcile against bank statements.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {links.linked.map((l) => (
            <li key={l.linkId} className="flex items-center gap-2 text-sm">
              <Link
                href={`/accounts/${l.accountId}`}
                className="font-medium text-primary hover:underline"
              >
                {l.name}
              </Link>
              <span className="text-muted-foreground tabular-nums">
                {formatCurrency(l.balance, l.currency)}
              </span>
              {l.isDefault ? (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Default
                </span>
              ) : (
                <button
                  onClick={() =>
                    run(() =>
                      linkPortfolioAccount(l.accountId, portfolioId, true)
                    )
                  }
                  disabled={busy}
                  title="Set as default settlement account"
                  className="inline-flex items-center gap-1 rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <Star className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() =>
                  run(() => unlinkPortfolioAccount(l.accountId, portfolioId))
                }
                disabled={busy}
                aria-label="Unlink account"
                className="ml-auto rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Unlink className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {links.available.length > 0 && (
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <select
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            aria-label="Account to link"
            className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Link an account…</option>
            {links.available.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              adding &&
              run(async () => {
                await linkPortfolioAccount(
                  adding,
                  portfolioId,
                  links.linked.length === 0
                );
                setAdding("");
              })
            }
            disabled={!adding || busy}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Link
          </button>
        </div>
      )}
    </div>
  );
}
