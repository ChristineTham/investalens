"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createTransaction } from "@/lib/actions/transaction";
import { TRANSACTION_TYPE_META } from "@/lib/constants/activity-meta";

interface HoldingOption {
  id: string;
  code: string;
  name: string;
  currency: string;
}

const fieldClass =
  "h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm";

/**
 * Inline "New transaction" creator for a portfolio's existing holdings — mirrors
 * the accounts new-transaction UX. To add a brand-new instrument, use Add Holding.
 */
export function AddPortfolioTransaction({
  holdings,
}: {
  holdings: HoldingOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [holdingId, setHoldingId] = useState(holdings[0]?.id ?? "");
  const [transactionType, setTransactionType] = useState("BUY");
  const [tradeDate, setTradeDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [brokerage, setBrokerage] = useState("0");

  const currency =
    holdings.find((h) => h.id === holdingId)?.currency ?? "AUD";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!holdingId) return;
    setLoading(true);
    setError("");
    try {
      await createTransaction({
        holdingId,
        transactionType,
        tradeDate,
        quantity: Number(quantity),
        price: Number(price),
        brokerage: Number(brokerage || 0),
        currency,
      });
      setOpen(false);
      setQuantity("");
      setPrice("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add transaction");
    } finally {
      setLoading(false);
    }
  }

  if (holdings.length === 0) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm font-medium hover:bg-accent"
      >
        <Plus className="h-3.5 w-3.5" />
        New Transaction
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full space-y-3 rounded-lg border border-border bg-card p-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">New transaction</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="space-y-1 md:col-span-1">
          <label htmlFor="ntx-holding" className="text-xs font-medium">
            Holding
          </label>
          <select
            id="ntx-holding"
            value={holdingId}
            onChange={(e) => setHoldingId(e.target.value)}
            className={fieldClass}
          >
            {holdings.map((h) => (
              <option key={h.id} value={h.id}>
                {h.code} — {h.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="ntx-type" className="text-xs font-medium">
            Type
          </label>
          <select
            id="ntx-type"
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value)}
            className={fieldClass}
          >
            {Object.entries(TRANSACTION_TYPE_META).map(([v, m]) => (
              <option key={v} value={v}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="ntx-date" className="text-xs font-medium">
            Date
          </label>
          <input
            id="ntx-date"
            type="date"
            value={tradeDate}
            onChange={(e) => setTradeDate(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="ntx-qty" className="text-xs font-medium">
            Quantity
          </label>
          <input
            id="ntx-qty"
            type="number"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="ntx-price" className="text-xs font-medium">
            Price
          </label>
          <input
            id="ntx-price"
            type="number"
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="ntx-brokerage" className="text-xs font-medium">
            Brokerage
          </label>
          <input
            id="ntx-brokerage"
            type="number"
            step="any"
            value={brokerage}
            onChange={(e) => setBrokerage(e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !holdingId || quantity === "" || price === ""}
        className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? "Saving…" : "Add transaction"}
      </button>
    </form>
  );
}
