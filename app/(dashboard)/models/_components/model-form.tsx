"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MODEL_CATEGORIES } from "@/lib/validators/model";
import { createModel, updateModel } from "@/lib/actions/model";
import {
  ConstituentEditor,
  type ConstituentRow,
} from "@/app/(dashboard)/models/_components/constituent-editor";

const CATEGORY_LABELS: Record<(typeof MODEL_CATEGORIES)[number], string> = {
  conservative: "Conservative",
  moderately_conservative: "Moderately Conservative",
  balanced: "Balanced",
  growth: "Growth",
  high_growth: "High Growth",
  high_yield: "High Yield",
  index: "Index",
};

export interface ModelFormInitial {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  provider?: string | null;
  baseCurrency: string;
  notionalCapital: number;
  minCashWeight: number; // fraction
  defaultLookbackYears: number;
  constituents: ConstituentRow[];
}

interface ModelFormProps {
  mode: "create" | "edit";
  initial?: ModelFormInitial;
}

export function ModelForm({ mode, initial }: ModelFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "balanced");
  const [provider, setProvider] = useState(initial?.provider ?? "Custom");
  const [baseCurrency, setBaseCurrency] = useState(
    initial?.baseCurrency ?? "AUD"
  );
  const [notionalCapital, setNotionalCapital] = useState(
    initial?.notionalCapital ?? 1_000_000
  );
  const [minCashPercent, setMinCashPercent] = useState(
    (initial?.minCashWeight ?? 0) * 100
  );
  const [lookbackYears, setLookbackYears] = useState(
    initial?.defaultLookbackYears ?? 3
  );
  const [rows, setRows] = useState<ConstituentRow[]>(
    initial?.constituents ?? []
  );

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const totalPercent = rows.reduce((a, r) => a + (r.weightPercent || 0), 0);
  const balanced = Math.abs(totalPercent - 100) < 0.01;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (rows.length === 0) {
      setError("Add at least one constituent.");
      return;
    }
    if (!balanced) {
      setError(
        `Constituent weights must sum to 100% (currently ${totalPercent.toFixed(2)}%).`
      );
      return;
    }

    setLoading(true);
    const constituents = rows.map((r) => ({
      instrumentCode: r.instrumentCode,
      marketCode: r.marketCode,
      instrumentName: r.instrumentName,
      targetWeight: r.weightPercent / 100,
    }));

    const payload = {
      name,
      description: description || undefined,
      category,
      provider: provider || undefined,
      baseCurrency,
      notionalCapital,
      minCashWeight: minCashPercent / 100,
      defaultLookbackYears: lookbackYears,
      constituents,
    };

    try {
      if (mode === "edit" && initial) {
        await updateModel({ id: initial.id, ...payload });
        router.push(`/models/${initial.id}`);
      } else {
        const model = await createModel(payload);
        router.push(`/models/${model.id}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save model");
      setLoading(false);
    }
  }

  const backHref =
    mode === "edit" && initial ? `/models/${initial.id}` : "/models";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={backHref} className="rounded-md p-2 hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-serif text-2xl font-bold">
          {mode === "edit" ? "Edit Model" : "New Model Portfolio"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="name" className="text-sm font-medium">
              Model Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              placeholder="e.g. Balanced Index Strategy"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              placeholder="Optional notes about this model's strategy"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="category" className="text-sm font-medium">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {MODEL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="provider" className="text-sm font-medium">
              Provider
            </label>
            <input
              id="provider"
              type="text"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Custom"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="baseCurrency" className="text-sm font-medium">
              Base Currency
            </label>
            <select
              id="baseCurrency"
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="AUD">AUD</option>
              <option value="USD">USD</option>
              <option value="NZD">NZD</option>
              <option value="GBP">GBP</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="notionalCapital" className="text-sm font-medium">
              Notional Capital
            </label>
            <input
              id="notionalCapital"
              type="number"
              min={1}
              step="1000"
              value={notionalCapital}
              onChange={(e) => setNotionalCapital(Number(e.target.value))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="minCash" className="text-sm font-medium">
              Min Cash Reserve %
            </label>
            <input
              id="minCash"
              type="number"
              min={0}
              max={95}
              step="0.5"
              value={minCashPercent}
              onChange={(e) => setMinCashPercent(Number(e.target.value))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="lookback" className="text-sm font-medium">
              Default Lookback (years)
            </label>
            <input
              id="lookback"
              type="number"
              min={1}
              max={30}
              step="1"
              value={lookbackYears}
              onChange={(e) => setLookbackYears(Number(e.target.value))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <ConstituentEditor
          value={rows}
          onChange={setRows}
          lookbackYears={lookbackYears}
        />

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading || !name || rows.length === 0}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {loading
              ? "Saving..."
              : mode === "edit"
                ? "Save Changes"
                : "Create Model"}
          </button>
          <Link
            href={backHref}
            className="inline-flex h-10 items-center justify-center rounded-md border border-border px-6 py-2 text-sm font-medium hover:bg-accent"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
