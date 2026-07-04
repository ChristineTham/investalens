"use client";

import { useState } from "react";
import { updatePortfolio } from "@/lib/actions/portfolio";

interface PortfolioCgtFormProps {
  portfolio: {
    id: string;
    name: string;
    taxEntityType: string;
    saleAllocationMethod: string;
    cgtRegime: string;
    cgtTransitionMethod: string;
    incomeSupportRecipient: boolean;
    isForeignResident: boolean;
    marginalTaxRate: number | null;
  };
}

const selectClass =
  "h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

export function PortfolioCgtForm({ portfolio }: PortfolioCgtFormProps) {
  const [taxEntityType, setTaxEntityType] = useState(portfolio.taxEntityType);
  const [saleAllocationMethod, setSaleAllocationMethod] = useState(
    portfolio.saleAllocationMethod
  );
  const [cgtRegime, setCgtRegime] = useState(portfolio.cgtRegime);
  const [cgtTransitionMethod, setCgtTransitionMethod] = useState(
    portfolio.cgtTransitionMethod
  );
  const [incomeSupportRecipient, setIncomeSupportRecipient] = useState(
    portfolio.incomeSupportRecipient
  );
  const [isForeignResident, setIsForeignResident] = useState(
    portfolio.isForeignResident
  );
  const [marginalPct, setMarginalPct] = useState(
    portfolio.marginalTaxRate != null
      ? String(Math.round(portfolio.marginalTaxRate * 100))
      : ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await updatePortfolio(portfolio.id, {
        taxEntityType,
        saleAllocationMethod,
        cgtRegime,
        cgtTransitionMethod,
        incomeSupportRecipient,
        isForeignResident,
        marginalTaxRate:
          marginalPct.trim() === "" ? null : Number(marginalPct) / 100,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-card p-4"
    >
      <h3 className="font-medium">{portfolio.name}</h3>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Tax entity</span>
          <select
            value={taxEntityType}
            onChange={(e) => setTaxEntityType(e.target.value)}
            className={selectClass}
          >
            <option value="individual">Individual</option>
            <option value="trust">Trust</option>
            <option value="smsf">SMSF</option>
            <option value="company">Company</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            Parcel allocation
          </span>
          <select
            value={saleAllocationMethod}
            onChange={(e) => setSaleAllocationMethod(e.target.value)}
            className={selectClass}
          >
            <option value="fifo">FIFO</option>
            <option value="lifo">LIFO</option>
            <option value="min_gain">Minimise gain</option>
            <option value="max_gain">Maximise gain</option>
            <option value="min_tax">Minimise tax</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">CGT regime</span>
          <select
            value={cgtRegime}
            onChange={(e) => setCgtRegime(e.target.value)}
            className={selectClass}
          >
            <option value="current">Current (50% discount)</option>
            <option value="proposed_2027">Proposed 2027 (indexation)</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            2027 transition method
          </span>
          <select
            value={cgtTransitionMethod}
            onChange={(e) => setCgtTransitionMethod(e.target.value)}
            className={selectClass}
          >
            <option value="apportionment">Apportionment (days)</option>
            <option value="market_value">Market value @ 1 Jul 2027</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            Marginal tax rate on gains (%)
          </span>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={marginalPct}
            onChange={(e) => setMarginalPct(e.target.value)}
            placeholder="optional"
            className={selectClass}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isForeignResident}
            onChange={(e) => setIsForeignResident(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          Foreign / temporary resident
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={incomeSupportRecipient}
            onChange={(e) => setIncomeSupportRecipient(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          Income-support recipient (30% min-tax exempt)
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && (
          <span role="status" className="text-sm text-success">
            Saved
          </span>
        )}
        {error && (
          <span role="alert" className="text-sm text-destructive">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
