"use client";

import { useState } from "react";
import { createCashAccount, addCashTransaction } from "@/lib/actions/cash-accounts";
import { Plus } from "lucide-react";

export function CreateCashAccountForm({ portfolioId }: { portfolioId: string }) {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("AUD");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await createCashAccount(portfolioId, name.trim(), currency);
      setName("");
      window.location.reload();
    } catch {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Account name..."
        aria-label="Account name"
        className="flex h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      />
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        aria-label="Currency"
        className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
      >
        <option value="AUD">AUD</option>
        <option value="USD">USD</option>
        <option value="GBP">GBP</option>
        <option value="NZD">NZD</option>
      </select>
      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Account
      </button>
    </form>
  );
}

export function AddCashTransactionForm({ accountId }: { accountId: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"DEPOSIT" | "WITHDRAWAL">("DEPOSIT");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;
    setLoading(true);
    try {
      await addCashTransaction(accountId, {
        type,
        amount: Number(amount),
        description: description || undefined,
      });
      setOpen(false);
      setAmount("");
      setDescription("");
      window.location.reload();
    } catch {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-accent"
      >
        <Plus className="h-3 w-3" />
        Add Transaction
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-border p-3">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as "DEPOSIT" | "WITHDRAWAL")}
        aria-label="Transaction type"
        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
      >
        <option value="DEPOSIT">Deposit</option>
        <option value="WITHDRAWAL">Withdrawal</option>
      </select>
      <input
        type="number"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
        aria-label="Amount"
        className="h-8 w-24 rounded-md border border-input bg-background px-2 text-xs"
      />
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        aria-label="Description"
        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
      />
      <button
        type="submit"
        disabled={loading || !amount}
        className="h-8 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        Save
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="h-8 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent"
      >
        Cancel
      </button>
    </form>
  );
}
