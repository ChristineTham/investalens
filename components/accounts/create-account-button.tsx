"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createAccount } from "@/lib/actions/accounts";
import { ACCOUNT_TYPES } from "@/lib/validators/account";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const fieldClass =
  "h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm";

const TYPE_LABELS: Record<string, string> = {
  transaction: "Transaction",
  savings: "Savings",
  offset: "Offset",
  term_deposit: "Term deposit",
  credit_card: "Credit card",
  cash: "Cash",
};

export function CreateAccountButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    institution: "",
    bsb: "",
    accountNumber: "",
    accountType: "transaction",
    currency: "AUD",
    openingBalance: "0",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const account = await createAccount({
        name: form.name,
        institution: form.institution || null,
        bsb: form.bsb || null,
        accountNumber: form.accountNumber || null,
        accountType: form.accountType,
        currency: form.currency,
        openingBalance: Number(form.openingBalance) || 0,
      });
      setOpen(false);
      router.push(`/accounts/${account.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account.");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
        New Account
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New account</DialogTitle>
            <DialogDescription>
              Add a bank or cash account to track balances and transactions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium" htmlFor="ac-name">
                Name
              </label>
              <input
                id="ac-name"
                className={fieldClass}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium" htmlFor="ac-inst">
                  Institution
                </label>
                <input
                  id="ac-inst"
                  className={fieldClass}
                  value={form.institution}
                  onChange={(e) => set("institution", e.target.value)}
                  placeholder="e.g. CommBank"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" htmlFor="ac-type">
                  Type
                </label>
                <select
                  id="ac-type"
                  className={fieldClass}
                  value={form.accountType}
                  onChange={(e) => set("accountType", e.target.value)}
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" htmlFor="ac-bsb">
                  BSB
                </label>
                <input
                  id="ac-bsb"
                  className={fieldClass}
                  value={form.bsb}
                  onChange={(e) => set("bsb", e.target.value)}
                  placeholder="nnn-nnn"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" htmlFor="ac-num">
                  Account number
                </label>
                <input
                  id="ac-num"
                  className={fieldClass}
                  value={form.accountNumber}
                  onChange={(e) => set("accountNumber", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" htmlFor="ac-ccy">
                  Currency
                </label>
                <input
                  id="ac-ccy"
                  className={fieldClass}
                  value={form.currency}
                  onChange={(e) => set("currency", e.target.value.toUpperCase())}
                  maxLength={3}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" htmlFor="ac-open">
                  Opening balance
                </label>
                <input
                  id="ac-open"
                  type="number"
                  step="any"
                  className={fieldClass}
                  value={form.openingBalance}
                  onChange={(e) => set("openingBalance", e.target.value)}
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-input px-3 py-1.5 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !form.name.trim()}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {loading ? "Creating…" : "Create"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
