"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteTransaction,
  updateTransaction,
} from "@/lib/actions/transaction";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Pencil, Trash2, Check, X, Coins } from "lucide-react";
import { FrankingFields } from "@/components/forms/franking-fields";

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
  /** Optional security code shown as an extra column for a portfolio-wide list. */
  securityCode?: string;
  /** Optional link target for the security code (e.g. the holding page). */
  securityHref?: string;
}

const INCOME_TYPES = ["DIVIDEND", "INTEREST", "COUPON"];

export function TransactionRow({
  transaction: tx,
  currency,
  securityCode,
  securityHref,
}: TransactionRowProps) {
  const router = useRouter();
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

  async function handleDelete() {
    if (!confirm("Delete this transaction? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteTransaction(tx.id);
      router.refresh();
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
      router.refresh();
    } catch {
      setSaving(false);
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
        {securityCode && (
          <td className="px-4 py-2 text-sm font-medium text-muted-foreground">
            {securityCode}
          </td>
        )}
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
        {securityCode && (
          <td className="px-4 py-3 text-sm font-medium">
            {securityHref ? (
              <Link href={securityHref} className="text-primary hover:underline">
                {securityCode}
              </Link>
            ) : (
              securityCode
            )}
          </td>
        )}
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
          <td colSpan={securityCode ? 7 : 6} className="px-4 py-3">
            <FrankingFields
              transaction={tx}
              onSaved={() => {
                setFrankingOpen(false);
                router.refresh();
              }}
              onCancel={() => setFrankingOpen(false)}
            />
          </td>
        </tr>
      )}
    </>
  );
}
