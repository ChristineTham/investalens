"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { updateAccount, deleteAccount } from "@/lib/actions/accounts";
import { ACCOUNT_TYPES } from "@/lib/validators/account";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

export interface AccountEditData {
  id: string;
  name: string;
  institution: string | null;
  bsb: string | null;
  accountNumber: string | null;
  accountType: string;
  interestRate: number | null;
  website: string | null;
  notes: string | null;
}

export function AccountActions({ account }: { account: AccountEditData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: account.name,
    institution: account.institution ?? "",
    bsb: account.bsb ?? "",
    accountNumber: account.accountNumber ?? "",
    accountType: account.accountType,
    interestRate: account.interestRate != null ? String(account.interestRate * 100) : "",
    website: account.website ?? "",
    notes: account.notes ?? "",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await updateAccount(account.id, {
        name: form.name,
        institution: form.institution || null,
        bsb: form.bsb || null,
        accountNumber: form.accountNumber || null,
        accountType: form.accountType,
        interestRate: form.interestRate ? Number(form.interestRate) / 100 : null,
        website: form.website || null,
        notes: form.notes || null,
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${account.name}"? This cannot be undone.`)) return;
    await deleteAccount(account.id);
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setOpen(true)}
        title="Edit account"
        className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        onClick={handleDelete}
        title="Delete account"
        className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium" htmlFor="ae-name">
                Name
              </label>
              <input
                id="ae-name"
                className={fieldClass}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium" htmlFor="ae-inst">
                  Institution
                </label>
                <input
                  id="ae-inst"
                  className={fieldClass}
                  value={form.institution}
                  onChange={(e) => set("institution", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" htmlFor="ae-type">
                  Type
                </label>
                <select
                  id="ae-type"
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
                <label className="mb-1 block text-xs font-medium" htmlFor="ae-bsb">
                  BSB
                </label>
                <input
                  id="ae-bsb"
                  className={fieldClass}
                  value={form.bsb}
                  onChange={(e) => set("bsb", e.target.value)}
                  placeholder="nnn-nnn"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" htmlFor="ae-num">
                  Account number
                </label>
                <input
                  id="ae-num"
                  className={fieldClass}
                  value={form.accountNumber}
                  onChange={(e) => set("accountNumber", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" htmlFor="ae-rate">
                  Interest rate (%)
                </label>
                <input
                  id="ae-rate"
                  type="number"
                  step="any"
                  className={fieldClass}
                  value={form.interestRate}
                  onChange={(e) => set("interestRate", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" htmlFor="ae-web">
                  Website
                </label>
                <input
                  id="ae-web"
                  className={fieldClass}
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder="https://…"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium" htmlFor="ae-notes">
                Notes
              </label>
              <input
                id="ae-notes"
                className={fieldClass}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
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
                disabled={loading}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {loading ? "Saving…" : "Save"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
