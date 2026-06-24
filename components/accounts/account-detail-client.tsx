"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { ChartCard } from "@/components/charts/chart-card";
import { RangeSelector } from "@/components/charts/range-selector";
import {
  AccountBalanceChart,
  AccountCashflowChart,
  CategoryPie,
  type CategoryDatum,
} from "@/components/charts/account-charts";
import {
  setTransactionCategory,
  deleteAccountTransaction,
  addAccountTransaction,
} from "@/lib/actions/accounts";
import { CASH_TRANSACTION_TYPES } from "@/lib/validators/account";
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
  source: string;
  reconciled: boolean;
}
export interface CategoryOption {
  id: string;
  name: string;
  kind: string;
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
}: {
  account: AccountMeta;
  transactions: TxRow[];
  categories: CategoryOption[];
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
        <ChartCard title="Spending by category" height={260}>
          {(h) =>
            withLoader(
              <CategoryPie
                data={data?.categoryBreakdown ?? []}
                currency={ccy}
                height={h}
              />
            )
          }
        </ChartCard>
      </div>

      {/* Add transaction (physical accounts only) */}
      {!account.isVirtual && (
        <AddTransactionForm accountId={account.id} categories={categories} />
      )}

      {/* Transactions table */}
      <div>
        <h2 className="mb-2 font-serif text-lg font-semibold">Transactions</h2>
        {transactions.length === 0 ? (
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
                  <th className="px-3 py-2.5 text-center">Status</th>
                  {!account.isVirtual && <th className="px-3 py-2.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((t) => {
                  const credit = CREDIT_TYPES.has(t.type);
                  const signed = credit ? t.amount : -t.amount;
                  return (
                    <tr key={t.id} className="hover:bg-accent/50">
                      <td className="px-3 py-2.5 text-sm text-muted-foreground tabular-nums">
                        {t.date}
                      </td>
                      <td className="px-3 py-2.5 text-sm">{t.description ?? "—"}</td>
                      <td className="px-3 py-2.5 text-sm capitalize text-muted-foreground">
                        {t.type.replace(/_/g, " ")}
                      </td>
                      <td className="px-3 py-2.5">
                        {account.isVirtual ? (
                          <span className="text-sm text-muted-foreground">
                            {t.categoryName ?? "—"}
                          </span>
                        ) : (
                          <select
                            value={t.categoryId ?? ""}
                            onChange={(e) => handleCategory(t.id, e.target.value)}
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
                        )}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right text-sm font-medium tabular-nums ${credit ? "text-green-600" : "text-red-600"}`}
                      >
                        {formatCurrency(signed, ccy)}
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
                          <button
                            onClick={() => handleDeleteTx(t.id)}
                            aria-label="Delete transaction"
                            className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AddTransactionForm({
  accountId,
  categories,
}: {
  accountId: string;
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "withdrawal",
    amount: "",
    description: "",
    categoryId: "",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount) return;
    setLoading(true);
    try {
      await addAccountTransaction(accountId, {
        type: form.type,
        amount: Number(form.amount),
        date: form.date,
        description: form.description || null,
        categoryId: form.categoryId || null,
      });
      setForm((f) => ({ ...f, amount: "", description: "" }));
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-3"
    >
      <div>
        <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Date</label>
        <input
          type="date"
          value={form.date}
          onChange={(e) => set("date", e.target.value)}
          aria-label="Transaction date"
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Type</label>
        <select
          value={form.type}
          onChange={(e) => set("type", e.target.value)}
          aria-label="Transaction type"
          className="h-8 rounded-md border border-input bg-background px-2 text-sm capitalize"
        >
          {CASH_TRANSACTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Amount</label>
        <input
          type="number"
          step="any"
          value={form.amount}
          onChange={(e) => set("amount", e.target.value)}
          aria-label="Amount"
          className="h-8 w-28 rounded-md border border-input bg-background px-2 text-right text-sm"
          required
        />
      </div>
      <div className="flex-1">
        <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
          Description
        </label>
        <input
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          aria-label="Description"
          className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Category</label>
        <select
          value={form.categoryId}
          onChange={(e) => set("categoryId", e.target.value)}
          aria-label="Category"
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">—</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={loading || !form.amount}
        className="h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {loading ? "Adding…" : "Add"}
      </button>
    </form>
  );
}
