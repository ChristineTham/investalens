"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Pencil, Check, X, Plus } from "lucide-react";
import { ChartCard } from "@/components/charts/chart-card";
import { RangeSelector } from "@/components/charts/range-selector";
import {
  AccountBalanceChart,
  AccountCashflowChart,
  CategoryBar,
  type CategoryDatum,
} from "@/components/charts/account-charts";
import {
  setTransactionCategory,
  setTransactionTransferAccount,
  deleteAccountTransaction,
  addAccountTransaction,
  updateAccountTransaction,
} from "@/lib/actions/accounts";
import { CASH_TRANSACTION_TYPES } from "@/lib/validators/account";
import { cashTypeMeta } from "@/lib/constants/activity-meta";
import { ActivityIcon } from "@/components/ui/activity-icon";
import { formatCurrency } from "@/lib/utils";
import type { ChartRange } from "@/lib/constants/chart-ranges";

export interface AccountMeta {
  id: string;
  name: string;
  currency: string;
  isVirtual: boolean;
  balance: number;
}
export interface TxRow {
  id: string;
  date: string;
  type: string;
  amount: number;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  transferAccountId: string | null;
  transferAccountName: string | null;
  source: string;
  reconciled: boolean;
  runningBalance: number;
}
export interface CategoryOption {
  id: string;
  name: string;
  kind: string;
}
export interface TransferAccountOption {
  id: string;
  name: string;
}

interface DetailData {
  balanceSeries: { date: string; balance: number }[];
  cashflowSeries: { period: string; in: number; out: number }[];
  categoryBreakdown: CategoryDatum[];
  kpis: { moneyIn: number; moneyOut: number; net: number; interest: number; fees: number };
}

const CREDIT_TYPES = new Set([
  "deposit",
  "interest",
  "dividend_received",
  "distribution",
  "contribution",
  "transfer_in",
  "sell_settlement",
]);

function ChartLoader() {
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  const color = tone === "pos" ? "text-green-600" : tone === "neg" ? "text-red-600" : "";
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

export function AccountDetailClient({
  account,
  transactions,
  categories,
  transferAccounts,
}: {
  account: AccountMeta;
  transactions: TxRow[];
  categories: CategoryOption[];
  transferAccounts: TransferAccountOption[];
}) {
  const router = useRouter();
  const [range, setRange] = useState<ChartRange>("1Y");
  const [data, setData] = useState<DetailData | null>(null);
  const [loadedRange, setLoadedRange] = useState<ChartRange | null>(null);
  const loading = loadedRange !== range;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/accounts/${account.id}/detail?range=${range}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: DetailData | null) => {
        if (!cancelled && d) setData(d);
      })
      .finally(() => {
        if (!cancelled) setLoadedRange(range);
      });
    return () => {
      cancelled = true;
    };
  }, [account.id, range]);

  const ccy = account.currency;
  const k = data?.kpis;
  const withLoader = (node: ReactNode) => (loading ? <ChartLoader /> : node);

  async function handleCategory(txId: string, categoryId: string) {
    await setTransactionCategory(txId, categoryId || null);
    router.refresh();
  }
  async function handleTransferAccount(txId: string, transferAccountId: string) {
    await setTransactionTransferAccount(txId, transferAccountId || null);
    router.refresh();
  }
  async function handleDeleteTx(txId: string) {
    if (!confirm("Delete this transaction?")) return;
    await deleteAccountTransaction(txId);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">Activity &amp; charts</p>
        <RangeSelector value={range} onChange={setRange} label="Timescale" />
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Money in" value={k ? formatCurrency(k.moneyIn, ccy) : "—"} tone="pos" />
        <Kpi label="Money out" value={k ? formatCurrency(k.moneyOut, ccy) : "—"} tone="neg" />
        <Kpi
          label="Net"
          value={k ? formatCurrency(k.net, ccy) : "—"}
          tone={k && k.net < 0 ? "neg" : "pos"}
        />
        <Kpi label="Interest" value={k ? formatCurrency(k.interest, ccy) : "—"} tone="pos" />
        <Kpi label="Fees" value={k ? formatCurrency(k.fees, ccy) : "—"} tone="neg" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Balance over time"
          className="lg:col-span-2"
          height={280}
        >
          {(h) =>
            withLoader(
              <AccountBalanceChart
                data={data?.balanceSeries ?? []}
                currency={ccy}
                range={range}
                height={h}
              />
            )
          }
        </ChartCard>
        <ChartCard title="Cash flow" description="Money in / out per month" height={260}>
          {(h) =>
            withLoader(
              <AccountCashflowChart
                data={data?.cashflowSeries ?? []}
                currency={ccy}
                height={h}
              />
            )
          }
        </ChartCard>
        <ChartCard title="Category Breakdown" height={260}>
          {(h) =>
            withLoader(
              <CategoryBar
                data={data?.categoryBreakdown ?? []}
                currency={ccy}
                height={h}
              />
            )
          }
        </ChartCard>
      </div>

      {/* Transactions table */}
      <div>
        <h2 className="mb-2 font-serif text-lg font-semibold">Transactions</h2>
        {transactions.length === 0 && account.isVirtual ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No transactions yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-200">
              <thead className="bg-muted/50 text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 text-left">Date</th>
                  <th className="px-3 py-2.5 text-left">Description</th>
                  <th className="px-3 py-2.5 text-left">Type</th>
                  <th className="px-3 py-2.5 text-left">Category</th>
                  <th className="px-3 py-2.5 text-right">Amount</th>
                  <th className="px-3 py-2.5 text-right">Balance</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  {!account.isVirtual && <th className="px-3 py-2.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {/* Inline add row (physical accounts only) */}
                {!account.isVirtual && (
                  <AddTransactionRow
                    accountId={account.id}
                    categories={categories}
                    transferAccounts={transferAccounts}
                  />
                )}
                {transactions.length === 0 && !account.isVirtual && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-6 text-center text-sm text-muted-foreground"
                    >
                      No transactions yet — add one above.
                    </td>
                  </tr>
                )}
                {transactions.map((t) => (
                  <EditableTxRow
                    key={t.id}
                    t={t}
                    account={account}
                    categories={categories}
                    transferAccounts={transferAccounts}
                    ccy={ccy}
                    onCategory={handleCategory}
                    onTransferAccount={handleTransferAccount}
                    onDelete={handleDeleteTx}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "h-8 w-full rounded-md border border-input bg-background px-2 text-sm";
const selectCls =
  "h-8 w-full rounded-md border border-input bg-background px-2 text-sm capitalize";

/** A single transaction row that toggles between read-only and inline edit. */
function EditableTxRow({
  t,
  account,
  categories,
  transferAccounts,
  ccy,
  onCategory,
  onTransferAccount,
  onDelete,
}: {
  t: TxRow;
  account: AccountMeta;
  categories: CategoryOption[];
  transferAccounts: TransferAccountOption[];
  ccy: string;
  onCategory: (txId: string, categoryId: string) => void;
  onTransferAccount: (txId: string, transferAccountId: string) => void;
  onDelete: (txId: string) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: t.date,
    type: t.type,
    amount: String(t.amount),
    description: t.description ?? "",
  });

  const credit = CREDIT_TYPES.has(t.type);
  const signed = credit ? t.amount : -t.amount;
  const selectedCatKind = categories.find((c) => c.id === t.categoryId)?.kind ?? null;
  const isTransferCat = selectedCatKind === "transfer";

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startEdit() {
    setForm({
      date: t.date,
      type: t.type,
      amount: String(t.amount),
      description: t.description ?? "",
    });
    setEditing(true);
  }

  async function handleSave() {
    if (!form.amount) return;
    setSaving(true);
    try {
      await updateAccountTransaction(t.id, {
        type: form.type,
        amount: Number(form.amount),
        date: form.date,
        description: form.description || null,
      });
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  // The category + counterparty cell. Virtual ledgers are read-only, so they show
  // the auto-assigned category as plain text; real accounts get editable selects.
  const categoryCell = account.isVirtual ? (
    <td className="px-3 py-2.5 text-sm text-muted-foreground">
      {t.categoryName ?? "—"}
      {isTransferCat && t.transferAccountName && (
        <p className="mt-0.5 text-[10px] text-muted-foreground">→ {t.transferAccountName}</p>
      )}
    </td>
  ) : (
    <td className="px-3 py-2.5">
      <select
        value={t.categoryId ?? ""}
        onChange={(e) => onCategory(t.id, e.target.value)}
        aria-label="Category"
        className="rounded-md border border-input bg-background px-1.5 py-1 text-xs"
      >
        <option value="">Uncategorised</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {isTransferCat && (
        <div className="mt-1">
          <select
            value={t.transferAccountId ?? ""}
            onChange={(e) => onTransferAccount(t.id, e.target.value)}
            aria-label="Counterparty account"
            className="rounded-md border border-input bg-background px-1.5 py-1 text-xs text-muted-foreground"
          >
            <option value="">— counterparty account —</option>
            {transferAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </td>
  );

  if (editing) {
    return (
      <tr className="bg-accent/30">
        <td className="px-3 py-2">
          <input
            type="date"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            aria-label="Transaction date"
            className={inputCls}
          />
        </td>
        <td className="px-3 py-2">
          <input
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            aria-label="Description"
            placeholder="Description"
            className={inputCls}
          />
        </td>
        <td className="px-3 py-2">
          <select
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
            aria-label="Transaction type"
            className={selectCls}
          >
            {CASH_TRANSACTION_TYPES.map((ty) => (
              <option key={ty} value={ty}>
                {ty.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </td>
        {categoryCell}
        <td className="px-3 py-2 text-right">
          <input
            type="number"
            step="any"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            aria-label="Amount"
            className="h-8 w-28 rounded-md border border-input bg-background px-2 text-right text-sm"
            required
          />
        </td>
        <td className="px-3 py-2.5 text-right text-sm tabular-nums text-muted-foreground">
          {formatCurrency(t.runningBalance, ccy)}
        </td>
        <td className="px-3 py-2.5 text-center" />
        <td className="px-3 py-2.5 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={handleSave}
              disabled={saving || !form.amount}
              aria-label="Save changes"
              title="Save"
              className="rounded-md p-1 text-green-700 hover:bg-green-600/10 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              aria-label="Cancel editing"
              title="Cancel"
              className="rounded-md p-1 text-muted-foreground hover:bg-accent disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-accent/50">
      <td className="px-3 py-2.5 text-sm text-muted-foreground tabular-nums">{t.date}</td>
      <td className="px-3 py-2.5 text-sm">
        {t.description ?? "—"}
        {(t.type === "transfer_in" || t.type === "transfer_out") && t.transferAccountName && (
          <span className="ml-1.5 text-xs text-muted-foreground">
            ({t.type === "transfer_in" ? "from" : "to"} {t.transferAccountName})
          </span>
        )}
      </td>
      <td className="px-3 py-2.5 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span
            className={`h-3.5 w-1 shrink-0 rounded-sm ${cashTypeMeta(t.type).swatch}`}
            aria-hidden
          />
          <ActivityIcon
            icon={cashTypeMeta(t.type).icon}
            className="h-3.5 w-3.5 text-muted-foreground"
          />
          {cashTypeMeta(t.type).label}
        </span>
      </td>
      {categoryCell}
      <td
        className={`px-3 py-2.5 text-right text-sm font-medium tabular-nums ${credit ? "text-green-600" : "text-red-600"}`}
      >
        {formatCurrency(signed, ccy)}
      </td>
      <td className="px-3 py-2.5 text-right text-sm tabular-nums text-muted-foreground">
        {formatCurrency(t.runningBalance, ccy)}
      </td>
      <td className="px-3 py-2.5 text-center">
        {t.reconciled ? (
          <span className="rounded bg-green-600/10 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
            Reconciled
          </span>
        ) : t.source === "portfolio" ? (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            Auto-posted
          </span>
        ) : null}
      </td>
      {!account.isVirtual && (
        <td className="px-3 py-2.5 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={startEdit}
              aria-label="Edit transaction"
              title="Edit"
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(t.id)}
              aria-label="Delete transaction"
              title="Delete"
              className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}

/** Inline "add transaction" row rendered at the top of the transactions table. */
function AddTransactionRow({
  accountId,
  categories,
  transferAccounts,
}: {
  accountId: string;
  categories: CategoryOption[];
  transferAccounts: TransferAccountOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "withdrawal",
    amount: "",
    description: "",
    categoryId: "",
    transferAccountId: "",
  });

  const isTransfer = form.type === "transfer_in" || form.type === "transfer_out";

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleAdd() {
    if (!form.amount) return;
    setLoading(true);
    try {
      await addAccountTransaction(accountId, {
        type: form.type,
        amount: Number(form.amount),
        date: form.date,
        description: form.description || null,
        categoryId: form.categoryId || null,
        transferAccountId: form.transferAccountId || null,
      });
      setForm((f) => ({ ...f, amount: "", description: "", transferAccountId: "" }));
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <tr className="border-b-2 border-border bg-muted/30">
      <td className="px-3 py-2">
        <input
          type="date"
          value={form.date}
          onChange={(e) => set("date", e.target.value)}
          aria-label="New transaction date"
          className={inputCls}
        />
      </td>
      <td className="px-3 py-2">
        <input
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          aria-label="New transaction description"
          placeholder="Add a transaction…"
          className={inputCls}
        />
      </td>
      <td className="px-3 py-2">
        <select
          value={form.type}
          onChange={(e) => set("type", e.target.value)}
          aria-label="New transaction type"
          className={selectCls}
        >
          {CASH_TRANSACTION_TYPES.map((ty) => (
            <option key={ty} value={ty}>
              {ty.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <select
          value={form.categoryId}
          onChange={(e) => set("categoryId", e.target.value)}
          aria-label="New transaction category"
          className="rounded-md border border-input bg-background px-1.5 py-1 text-xs"
        >
          <option value="">Uncategorised</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {isTransfer && (
          <div className="mt-1">
            <select
              value={form.transferAccountId}
              onChange={(e) => set("transferAccountId", e.target.value)}
              aria-label="New transaction counterparty account"
              className="rounded-md border border-input bg-background px-1.5 py-1 text-xs text-muted-foreground"
            >
              <option value="">— counterparty account —</option>
              {transferAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        <input
          type="number"
          step="any"
          value={form.amount}
          onChange={(e) => set("amount", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          aria-label="New transaction amount"
          placeholder="0.00"
          className="h-8 w-28 rounded-md border border-input bg-background px-2 text-right text-sm"
        />
      </td>
      <td className="px-3 py-2.5" />
      <td className="px-3 py-2.5 text-center" />
      <td className="px-3 py-2.5 text-right">
        <button
          onClick={handleAdd}
          disabled={loading || !form.amount}
          aria-label="Add transaction"
          title="Add transaction"
          className="rounded-md bg-primary p-1 text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
        </button>
      </td>
    </tr>
  );
}
