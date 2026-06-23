"use client";

import { useState } from "react";
import {
  deleteTransaction,
  updateTransaction,
} from "@/lib/actions/transaction";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Pencil, Trash2, Check, X, Coins } from "lucide-react";

interface TransactionRowProps {
  transaction: {
    id: string;
    transactionType: string;
    tradeDate: Date;
    quantity: unknown;
    price: unknown;
    brokerage: unknown;
    comments: string | null;
    frankedAmount?: unknown;
    unfrankedAmount?: unknown;
    frankingCredits?: unknown;
    taxDeferred?: unknown;
    foreignTax?: unknown;
  };
  currency: string;
}

const INCOME_TYPES = ["DIVIDEND", "INTEREST", "COUPON"];
const numStr = (v: unknown) => (v == null ? "" : String(Number(v)));

export function TransactionRow({ transaction: tx, currency }: TransactionRowProps) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [transactionType, setTransactionType] = useState(tx.transactionType);
  const [tradeDate, setTradeDate] = useState(
    new Date(tx.tradeDate).toISOString().split("T")[0]
  );
  const [quantity, setQuantity] = useState(String(Number(tx.quantity)));
  const [price, setPrice] = useState(String(Number(tx.price)));
  const [brokerage, setBrokerage] = useState(String(Number(tx.brokerage)));

  // Franking / tax-component state
  const isIncome = INCOME_TYPES.includes(tx.transactionType);
  const hasFranking =
    Number(tx.frankedAmount ?? 0) !== 0 ||
    Number(tx.unfrankedAmount ?? 0) !== 0 ||
    Number(tx.frankingCredits ?? 0) !== 0;
  const unclassified = tx.transactionType === "DIVIDEND" && !hasFranking;

  const [frankingOpen, setFrankingOpen] = useState(false);
  const [savingFranking, setSavingFranking] = useState(false);
  const [franked, setFranked] = useState(numStr(tx.frankedAmount));
  const [unfranked, setUnfranked] = useState(numStr(tx.unfrankedAmount));
  const [credits, setCredits] = useState(numStr(tx.frankingCredits));
  const [taxDeferred, setTaxDeferred] = useState(numStr(tx.taxDeferred));
  const [foreignTax, setForeignTax] = useState(numStr(tx.foreignTax));
  const [taxRate, setTaxRate] = useState("30");

  async function handleDelete() {
    if (!confirm("Delete this transaction? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteTransaction(tx.id);
      window.location.reload();
    } catch {
      setDeleting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateTransaction(tx.id, {
        transactionType,
        tradeDate,
        quantity: Number(quantity),
        price: Number(price),
        brokerage: Number(brokerage),
      });
      setEditing(false);
      window.location.reload();
    } catch {
      setSaving(false);
    }
  }

  // Gross-up: franking credit = franked × rate / (1 − rate). 30% → ×3/7.
  function computeCredits() {
    const f = Number(franked) || 0;
    const r = Number(taxRate) / 100;
    if (r <= 0 || r >= 1) return;
    setCredits(String(Math.round(f * (r / (1 - r)) * 100) / 100));
  }

  async function handleSaveFranking() {
    setSavingFranking(true);
    try {
      await updateTransaction(tx.id, {
        frankedAmount: franked.trim() === "" ? null : Number(franked),
        unfrankedAmount: unfranked.trim() === "" ? null : Number(unfranked),
        frankingCredits: credits.trim() === "" ? null : Number(credits),
        taxDeferred: taxDeferred.trim() === "" ? null : Number(taxDeferred),
        foreignTax: foreignTax.trim() === "" ? null : Number(foreignTax),
      });
      window.location.reload();
    } catch {
      setSavingFranking(false);
    }
  }

  if (editing) {
    return (
      <tr className="bg-accent/30">
        <td className="px-4 py-2">
          <input
            type="date"
            value={tradeDate}
            onChange={(e) => setTradeDate(e.target.value)}
            aria-label="Trade date"
            className="w-full rounded border border-input bg-background px-2 py-1 text-sm"
          />
        </td>
        <td className="px-4 py-2">
          <select
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value)}
            aria-label="Transaction type"
            className="w-full rounded border border-input bg-background px-2 py-1 text-sm"
          >
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
            <option value="DIVIDEND">DIVIDEND</option>
            <option value="INTEREST">INTEREST</option>
            <option value="SPLIT">SPLIT</option>
            <option value="FEE">FEE</option>
            <option value="TRANSFER_IN">TRANSFER_IN</option>
            <option value="TRANSFER_OUT">TRANSFER_OUT</option>
            <option value="RETURN_OF_CAPITAL">RETURN_OF_CAPITAL</option>
            <option value="BONUS">BONUS</option>
            <option value="MERGER_IN">MERGER_IN</option>
            <option value="MERGER_OUT">MERGER_OUT</option>
            <option value="RIGHTS_ISSUE">RIGHTS_ISSUE</option>
            <option value="COUPON">COUPON</option>
            <option value="MATURITY">MATURITY</option>
            <option value="ADJUSTMENT">ADJUSTMENT</option>
          </select>
        </td>
        <td className="px-4 py-2">
          <input
            type="number"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            aria-label="Quantity"
            className="w-24 rounded border border-input bg-background px-2 py-1 text-right text-sm"
          />
        </td>
        <td className="px-4 py-2">
          <input
            type="number"
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            aria-label="Price"
            className="w-24 rounded border border-input bg-background px-2 py-1 text-right text-sm"
          />
        </td>
        <td className="px-4 py-2">
          <input
            type="number"
            step="any"
            value={brokerage}
            onChange={(e) => setBrokerage(e.target.value)}
            aria-label="Brokerage"
            className="w-20 rounded border border-input bg-background px-2 py-1 text-right text-sm"
          />
        </td>
        <td className="px-4 py-2">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded p-1 text-success hover:bg-accent"
              title="Save"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded p-1 text-muted-foreground hover:bg-accent"
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr className="group hover:bg-accent/50">
        <td className="px-4 py-3 text-sm">{formatDate(tx.tradeDate)}</td>
        <td className="px-4 py-3 text-sm font-medium">
          {tx.transactionType}
          {unclassified && (
            <span
              className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 align-middle"
              title="Unclassified dividend — no franking set"
            />
          )}
        </td>
        <td className="px-4 py-3 text-right text-sm">
          {Number(tx.quantity).toLocaleString()}
        </td>
        <td className="px-4 py-3 text-right text-sm">
          {formatCurrency(Number(tx.price), currency)}
        </td>
        <td className="px-4 py-3 text-right text-sm text-muted-foreground">
          {formatCurrency(Number(tx.brokerage), currency)}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {isIncome && (
              <button
                onClick={() => setFrankingOpen((o) => !o)}
                className={`rounded p-1 hover:bg-accent ${
                  frankingOpen || unclassified
                    ? "text-amber-600"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Franking / tax components"
              >
                <Coins className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => setEditing(true)}
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>

      {frankingOpen && (
        <tr className="bg-muted/30">
          <td colSpan={6} className="px-4 py-3">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Franking / tax classification. Auto-fetched dividends carry the
                gross cash amount only — enter the franked split and credits from
                your dividend or AMMA statement.
              </p>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    Franked amount
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={franked}
                    onChange={(e) => setFranked(e.target.value)}
                    className="rounded border border-input bg-background px-2 py-1 text-right text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    Unfranked amount
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={unfranked}
                    onChange={(e) => setUnfranked(e.target.value)}
                    className="rounded border border-input bg-background px-2 py-1 text-right text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    Franking credits
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={credits}
                    onChange={(e) => setCredits(e.target.value)}
                    className="rounded border border-input bg-background px-2 py-1 text-right text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    Tax-deferred
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={taxDeferred}
                    onChange={(e) => setTaxDeferred(e.target.value)}
                    className="rounded border border-input bg-background px-2 py-1 text-right text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    Foreign tax
                  </span>
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
                  <span className="text-xs text-muted-foreground">
                    Company tax rate
                  </span>
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
                    onClick={handleSaveFranking}
                    disabled={savingFranking}
                    className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {savingFranking ? "Saving…" : "Save franking"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrankingOpen(false)}
                    className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
