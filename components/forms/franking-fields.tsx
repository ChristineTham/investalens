"use client";

import { useState } from "react";
import { updateTransaction } from "@/lib/actions/transaction";

const numStr = (v: unknown) => (v == null ? "" : String(Number(v)));

export interface FrankingTarget {
  id: string;
  frankedAmount?: unknown;
  unfrankedAmount?: unknown;
  frankingCredits?: unknown;
  taxDeferred?: unknown;
  foreignTax?: unknown;
}

/**
 * Shared dividend franking / tax-component classifier. Writes the franked split,
 * franking credits, tax-deferred and foreign-tax amounts onto a portfolio
 * `Transaction`. Used both from the holdings transaction list and from the
 * account reconciliation flow.
 */
export function FrankingFields({
  transaction,
  onSaved,
  onCancel,
}: {
  transaction: FrankingTarget;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const [franked, setFranked] = useState(numStr(transaction.frankedAmount));
  const [unfranked, setUnfranked] = useState(numStr(transaction.unfrankedAmount));
  const [credits, setCredits] = useState(numStr(transaction.frankingCredits));
  const [taxDeferred, setTaxDeferred] = useState(numStr(transaction.taxDeferred));
  const [foreignTax, setForeignTax] = useState(numStr(transaction.foreignTax));
  const [taxRate, setTaxRate] = useState("30");
  const [saving, setSaving] = useState(false);

  // Gross-up: franking credit = franked × rate / (1 − rate). 30% → ×3/7.
  function computeCredits() {
    const f = Number(franked) || 0;
    const r = Number(taxRate) / 100;
    if (r <= 0 || r >= 1) return;
    setCredits(String(Math.round(f * (r / (1 - r)) * 100) / 100));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateTransaction(transaction.id, {
        frankedAmount: franked.trim() === "" ? null : Number(franked),
        unfrankedAmount: unfranked.trim() === "" ? null : Number(unfranked),
        frankingCredits: credits.trim() === "" ? null : Number(credits),
        taxDeferred: taxDeferred.trim() === "" ? null : Number(taxDeferred),
        foreignTax: foreignTax.trim() === "" ? null : Number(foreignTax),
      });
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Franking / tax classification. Auto-fetched dividends carry the gross cash
        amount only — enter the franked split and credits from your dividend or AMMA
        statement.
      </p>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Franked amount</span>
          <input
            type="number"
            step="any"
            value={franked}
            onChange={(e) => setFranked(e.target.value)}
            className="rounded border border-input bg-background px-2 py-1 text-right text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Unfranked amount</span>
          <input
            type="number"
            step="any"
            value={unfranked}
            onChange={(e) => setUnfranked(e.target.value)}
            className="rounded border border-input bg-background px-2 py-1 text-right text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Franking credits</span>
          <input
            type="number"
            step="any"
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
            className="rounded border border-input bg-background px-2 py-1 text-right text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Tax-deferred</span>
          <input
            type="number"
            step="any"
            value={taxDeferred}
            onChange={(e) => setTaxDeferred(e.target.value)}
            className="rounded border border-input bg-background px-2 py-1 text-right text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Foreign tax</span>
          <input
            type="number"
            step="any"
            value={foreignTax}
            onChange={(e) => setForeignTax(e.target.value)}
            className="rounded border border-input bg-background px-2 py-1 text-right text-sm"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Company tax rate</span>
          <select
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            aria-label="Company tax rate"
            className="h-8 rounded border border-input bg-background px-2 text-sm"
          >
            <option value="30">30%</option>
            <option value="25">25% (base rate)</option>
          </select>
          <button
            type="button"
            onClick={computeCredits}
            className="rounded-md border border-input px-2 py-1 text-xs font-medium hover:bg-accent"
          >
            Compute credits from franked
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save franking"}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
