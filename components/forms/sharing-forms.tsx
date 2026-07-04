"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sharePortfolio, removeShare } from "@/lib/actions/sharing";
import { Plus, Trash2 } from "lucide-react";

interface SharePortfolioFormProps {
  portfolios: Array<{ id: string; name: string }>;
}

export function SharePortfolioForm({ portfolios }: SharePortfolioFormProps) {
  const router = useRouter();
  const [portfolioId, setPortfolioId] = useState(portfolios[0]?.id || "");
  const [email, setEmail] = useState("");
  const [accessLevel, setAccessLevel] = useState<"read" | "write" | "admin">("read");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !portfolioId) return;
    setLoading(true);
    setError("");
    try {
      await sharePortfolio(portfolioId, email.trim(), accessLevel);
      setEmail("");
      setLoading(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to share");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive"
        >
          {error}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={portfolioId}
          onChange={(e) => setPortfolioId(e.target.value)}
          aria-label="Portfolio to share"
          className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          {portfolios.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          aria-label="Email address"
          required
          className="flex h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
        <select
          value={accessLevel}
          onChange={(e) => setAccessLevel(e.target.value as "read" | "write" | "admin")}
          aria-label="Access level"
          className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="read">Read Only</option>
          <option value="write">Read & Write</option>
        </select>
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Share
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Write and Admin levels currently grant read-only access; full write
        support is planned.
      </p>
    </form>
  );
}

export function RemoveShareButton({ shareId }: { shareId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    if (!confirm("Remove this share?")) return;
    setLoading(true);
    try {
      await removeShare(shareId);
      setLoading(false);
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleRemove}
      disabled={loading}
      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      title="Remove share"
      aria-label="Remove share"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
