"use client";

import { useState } from "react";
import { addHolding } from "@/lib/actions/holding";
import { InstrumentSearch } from "@/components/forms/instrument-search";
import type { InstrumentSearchResult } from "@/lib/providers/market-data";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AddHoldingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [portfolioId, setPortfolioId] = useState<string>("");
  const [selected, setSelected] = useState<InstrumentSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Resolve params
  useState(() => {
    params.then((p) => setPortfolioId(p.id));
  });

  async function handleAdd() {
    if (!selected || !portfolioId) return;
    setLoading(true);
    setError("");

    try {
      await addHolding(portfolioId, {
        instrumentCode: selected.code,
        marketCode: selected.exchange || "ASX",
        instrumentName: selected.name,
        instrumentType: selected.type,
      });
      window.location.href = `/portfolio/${portfolioId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add holding");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/portfolio/${portfolioId}`}
          className="rounded-md p-2 hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-serif text-2xl font-bold">Add Holding</h1>
      </div>

      <div className="max-w-md space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Search Instrument</label>
          <InstrumentSearch
            market="ASX"
            onSelect={setSelected}
            placeholder="Search ASX instruments..."
          />
        </div>

        {selected && (
          <div className="rounded-md border border-border bg-muted/50 p-4">
            <p className="font-medium">{selected.code}</p>
            <p className="text-sm text-muted-foreground">{selected.name}</p>
            <p className="text-xs text-muted-foreground">
              {selected.exchange} · {selected.type}
            </p>
          </div>
        )}

        <button
          onClick={handleAdd}
          disabled={!selected || loading}
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add to Portfolio"}
        </button>
      </div>
    </div>
  );
}
