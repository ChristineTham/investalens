"use client";

import { useState } from "react";
import { createTransaction } from "@/lib/actions/transaction";

interface AddTransactionFormProps {
  holdingId: string;
  currency: string;
}

export function AddTransactionForm({
  holdingId,
  currency,
}: AddTransactionFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);

    try {
      await createTransaction({
        holdingId,
        transactionType: form.get("transactionType") as string,
        tradeDate: form.get("tradeDate") as string,
        quantity: Number(form.get("quantity")),
        price: Number(form.get("price")),
        brokerage: Number(form.get("brokerage") || 0),
        currency,
      });
      setOpen(false);
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add transaction"
      );
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Add Transaction
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-border bg-card p-4"
    >
      <h3 className="font-medium">Add Transaction</h3>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <label htmlFor="transactionType" className="text-xs font-medium">
            Type
          </label>
          <select
            id="transactionType"
            name="transactionType"
            required
            className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
          >
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
            <option value="DIVIDEND">Dividend</option>
            <option value="INTEREST">Interest</option>
            <option value="SPLIT">Split</option>
            <option value="FEE">Fee</option>
            <option value="TRANSFER_IN">Transfer In</option>
            <option value="TRANSFER_OUT">Transfer Out</option>
            <option value="RETURN_OF_CAPITAL">Return of Capital</option>
            <option value="BONUS">Bonus</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="tradeDate" className="text-xs font-medium">
            Date
          </label>
          <input
            id="tradeDate"
            name="tradeDate"
            type="date"
            required
            defaultValue={new Date().toISOString().split("T")[0]}
            className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="quantity" className="text-xs font-medium">
            Quantity
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            step="any"
            required
            className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="price" className="text-xs font-medium">
            Price
          </label>
          <input
            id="price"
            name="price"
            type="number"
            step="any"
            required
            min="0"
            className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="brokerage" className="text-xs font-medium">
            Brokerage
          </label>
          <input
            id="brokerage"
            name="brokerage"
            type="number"
            step="any"
            min="0"
            defaultValue="0"
            className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
