"use client";

import { useState } from "react";
import { addToWatchlist, removeFromWatchlist } from "@/lib/actions/watchlist";
import { InstrumentSearch } from "@/components/forms/instrument-search";
import type { InstrumentSearchResult } from "@/lib/providers/market-data";
import { Plus, Trash2 } from "lucide-react";

export function AddToWatchlistForm() {
  const [selected, setSelected] = useState<InstrumentSearchResult | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    if (!selected) return;
    setLoading(true);
    try {
      await addToWatchlist(selected.code, selected.exchange, notes || undefined);
      setSelected(null);
      setNotes("");
      window.location.reload();
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <h3 className="text-sm font-medium">Add to Watchlist</h3>
      <InstrumentSearch onSelect={setSelected} placeholder="Search instruments..." />
      {selected && (
        <div className="flex items-center gap-2">
          <span className="rounded bg-muted px-2 py-1 text-sm font-medium">
            {selected.code}
          </span>
          <span className="text-sm text-muted-foreground">{selected.name}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          aria-label="Notes"
          className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={loading || !selected}
          className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
    </div>
  );
}

export function RemoveFromWatchlistButton({ itemId }: { itemId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    setLoading(true);
    try {
      await removeFromWatchlist(itemId);
      window.location.reload();
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleRemove}
      disabled={loading}
      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      title="Remove from watchlist"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
