"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Unlink, Coins, CheckCircle2 } from "lucide-react";
import {
  reconcileTransactions,
  unreconcile,
  type ReconcileTarget,
} from "@/lib/actions/reconciliation";
import { FrankingFields } from "@/components/forms/franking-fields";
import { formatCurrency } from "@/lib/utils";
import type {
  ReconciliationData,
  ReconAccountTx,
  PortfolioTxCandidate,
} from "@/lib/services/reconciliation";

function keysToTargets(keys: string[]): ReconcileTarget[] {
  return keys.map((k) => {
    const [kind, refId] = k.split(":");
    return { kind: kind as "transaction" | "fee", refId };
  });
}

export function ReconcileClient({ data }: { data: ReconciliationData }) {
  const router = useRouter();
  const { currency, accountTxs, candidates } = data;
  const candByKey = new Map<string, PortfolioTxCandidate>(
    candidates.map((c) => [c.key, c])
  );

  const needsMatching = accountTxs.filter((t) => t.status !== "reconciled");
  const reconciled = accountTxs.filter((t) => t.status === "reconciled");

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 font-serif text-lg font-semibold">
          Needs matching ({needsMatching.length})
        </h2>
        {needsMatching.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Everything is reconciled.
          </div>
        ) : (
          <div className="space-y-3">
            {needsMatching.map((t) => (
              <MatchCard
                key={t.id}
                tx={t}
                candByKey={candByKey}
                candidates={candidates}
                currency={currency}
                onChanged={() => router.refresh()}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-serif text-lg font-semibold">
          Reconciled ({reconciled.length})
        </h2>
        {reconciled.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No reconciled transactions yet.
          </p>
        ) : (
          <div className="space-y-2">
            {reconciled.map((t) => (
              <ReconciledCard
                key={t.id}
                tx={t}
                currency={currency}
                onChanged={() => router.refresh()}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MatchCard({
  tx,
  candByKey,
  candidates,
  currency,
  onChanged,
}: {
  tx: ReconAccountTx;
  candByKey: Map<string, PortfolioTxCandidate>;
  candidates: PortfolioTxCandidate[];
  currency: string;
  onChanged: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(tx.suggestion?.keys ?? [])
  );
  const [busy, setBusy] = useState(false);

  // Derive the refId of the selected DIVIDEND candidate (if any) — pure computed value.
  const dividendCandKey = [...selected].find((k) => candByKey.get(k)?.transactionType === "DIVIDEND") ?? null;
  const frankingRefId = dividendCandKey ? dividendCandKey.split(":")[1] : null;

  // Only same-direction candidates can cover the remaining amount.
  const pool = candidates
    .filter((c) => Math.sign(c.cashAmount) === Math.sign(tx.remaining))
    .sort(
      (a, b) =>
        Math.abs(Math.abs(a.cashAmount) - Math.abs(tx.remaining)) -
        Math.abs(Math.abs(b.cashAmount) - Math.abs(tx.remaining))
    )
    .slice(0, 40);

  const selectedTotal = [...selected].reduce(
    (s, k) => s + (candByKey.get(k)?.cashAmount ?? 0),
    0
  );
  const afterRemaining = tx.remaining - selectedTotal;
  const tol = Math.max(0.5, Math.abs(tx.remaining) * 0.01);
  const willMatch = Math.abs(afterRemaining) <= tol && selected.size > 0;

  function toggle(key: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleLink() {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const keys = [...selected];
      const isSuggested =
        !!tx.suggestion &&
        tx.suggestion.keys.length === keys.length &&
        tx.suggestion.keys.every((k) => selected.has(k));
      await reconcileTransactions(
        tx.id,
        keysToTargets(keys),
        isSuggested ? "auto" : "manual"
      );
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlink(reconciliationId: string) {
    setBusy(true);
    try {
      await unreconcile(reconciliationId);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-40 flex-1">
          <p className="text-sm font-medium">{tx.description || "—"}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {tx.date} · {tx.type.replace(/_/g, " ")}
          </p>
        </div>
        <span
          className={`text-sm font-semibold tabular-nums ${tx.amount >= 0 ? "text-gain" : "text-loss"}`}
        >
          {formatCurrency(tx.amount, currency)}
        </span>
        {tx.status === "partial" && (
          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
            Partial · {formatCurrency(tx.remaining, currency)} left
          </span>
        )}
        {tx.suggestion && (
          <span className="rounded bg-green-600/10 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
            {Math.round(tx.suggestion.confidence * 100)}%{" "}
            {tx.suggestion.keys.length > 1 ? "split" : "match"} suggested
          </span>
        )}
      </div>

      {/* Existing links (partial reconciliations) */}
      {tx.links.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-border pt-2">
          {tx.links.map((l) => (
            <li
              key={l.reconciliationId}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <Link2 className="h-3 w-3" />
              <span>
                {l.portfolioName ? `${l.portfolioName} · ` : ""}
                {l.targetLabel}
              </span>
              <span className="tabular-nums">
                {formatCurrency(l.cashAmount, currency)}
              </span>
              <button
                onClick={() => handleUnlink(l.reconciliationId)}
                disabled={busy}
                className="ml-auto rounded p-0.5 hover:bg-destructive/10 hover:text-destructive"
                aria-label="Unlink"
              >
                <Unlink className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Candidate picker */}
      <div className="mt-2 border-t border-border pt-2">
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {pool.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No matching portfolio transactions found.
            </p>
          ) : (
            pool.map((c) => (
              <label
                key={c.key}
                className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-accent"
              >
                <input
                  type="checkbox"
                  checked={selected.has(c.key)}
                  onChange={() => toggle(c.key)}
                />
                <span className="text-muted-foreground tabular-nums">{c.date}</span>
                <span className="truncate">
                  {c.portfolioName} · {c.label}
                </span>
                <span className="ml-auto shrink-0 tabular-nums">
                  {formatCurrency(c.cashAmount, currency)}
                </span>
              </label>
            ))
          )}
        </div>

        {/* Franking panel — shown inline when a DIVIDEND candidate is selected */}
        {frankingRefId && (
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
              Dividend tax components (portfolio record only — not reflected in account cash)
            </p>
            <FrankingFields
              transaction={{ id: frankingRefId }}
            />
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground tabular-nums">
            Selected {formatCurrency(selectedTotal, currency)} of{" "}
            {formatCurrency(tx.remaining, currency)}
            {selected.size > 0 && (
              <span className={willMatch ? "text-green-600" : "text-amber-600"}>
                {" "}
                ·{" "}
                {willMatch
                  ? "matches"
                  : `${formatCurrency(afterRemaining, currency)} left`}
              </span>
            )}
          </p>
          <button
            onClick={handleLink}
            disabled={busy || selected.size === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <Link2 className="h-3.5 w-3.5" />
            Link {selected.size > 1 ? `${selected.size} (split)` : "match"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReconciledCard({
  tx,
  currency,
  onChanged,
}: {
  tx: ReconAccountTx;
  currency: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [frankingFor, setFrankingFor] = useState<string | null>(null);

  async function handleUnlink(reconciliationId: string) {
    setBusy(true);
    try {
      await unreconcile(reconciliationId);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center gap-3 p-3">
        <div className="min-w-40 flex-1">
          <p className="text-sm font-medium">{tx.description || "—"}</p>
          <p className="text-xs text-muted-foreground tabular-nums">{tx.date}</p>
        </div>
        <span
          className={`text-sm font-semibold tabular-nums ${tx.amount >= 0 ? "text-gain" : "text-loss"}`}
        >
          {formatCurrency(tx.amount, currency)}
        </span>
        {tx.links.length > 1 && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            Split × {tx.links.length}
          </span>
        )}
      </div>
      <ul className="divide-y divide-border border-t border-border">
        {tx.links.map((l) => {
          const isDividend =
            l.transactionId != null && l.transactionType === "DIVIDEND";
          return (
            <li key={l.reconciliationId}>
              <div className="flex flex-wrap items-center gap-3 px-3 py-2">
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Link2 className="h-3.5 w-3.5" />
                  {l.portfolioName ? `${l.portfolioName} · ` : ""}
                  {l.targetLabel}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {formatCurrency(l.cashAmount, currency)}
                </span>
                {l.matchType === "auto" && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    Auto
                  </span>
                )}
                {isDividend && (
                  <button
                    onClick={() =>
                      setFrankingFor((f) =>
                        f === l.reconciliationId ? null : l.reconciliationId
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-md border border-input px-2 py-1 text-xs font-medium hover:bg-accent"
                  >
                    <Coins className="h-3.5 w-3.5" />
                    Franking
                  </button>
                )}
                <button
                  onClick={() => handleUnlink(l.reconciliationId)}
                  disabled={busy}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-input px-2 py-1 text-xs font-medium hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  Unlink
                </button>
              </div>
              {isDividend &&
                frankingFor === l.reconciliationId &&
                l.transactionId && (
                  <div className="border-t border-border bg-muted/30 p-3">
                    <FrankingFields
                      transaction={{
                        id: l.transactionId,
                        frankedAmount: l.franking?.frankedAmount,
                        unfrankedAmount: l.franking?.unfrankedAmount,
                        frankingCredits: l.franking?.frankingCredits,
                        taxDeferred: l.franking?.taxDeferred,
                        foreignTax: l.franking?.foreignTax,
                      }}
                      onSaved={() => {
                        setFrankingFor(null);
                        onChanged();
                      }}
                      onCancel={() => setFrankingFor(null)}
                    />
                  </div>
                )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
