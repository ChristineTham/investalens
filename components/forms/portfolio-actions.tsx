"use client";

import { useState } from "react";
import { updatePortfolio, deletePortfolio } from "@/lib/actions/portfolio";
import { Pencil, Trash2 } from "lucide-react";

interface PortfolioActionsProps {
  portfolioId: string;
  currentName: string;
}

export function PortfolioActions({ portfolioId, currentName }: PortfolioActionsProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await updatePortfolio(portfolioId, { name });
    setEditing(false);
    setLoading(false);
    window.location.reload();
  }

  async function handleDelete() {
    if (!confirm(`Delete "${currentName}"? This cannot be undone.`)) return;
    await deletePortfolio(portfolioId);
  }

  if (editing) {
    return (
      <form onSubmit={handleRename} className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Portfolio name"
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-md border border-input px-3 py-1 text-xs font-medium"
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setEditing(true)}
        title="Rename portfolio"
        className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        onClick={handleDelete}
        title="Delete portfolio"
        className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
