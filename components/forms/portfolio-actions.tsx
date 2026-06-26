"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updatePortfolio,
  deletePortfolio,
  mergePortfolio,
} from "@/lib/actions/portfolio";
import { Pencil, Trash2, GitMerge } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  PORTFOLIO_ICONS,
  PORTFOLIO_COLORS,
} from "@/lib/constants/portfolio-identity";
import { PortfolioIcon } from "@/components/ui/portfolio-icon";
import { cn } from "@/lib/utils";

export interface PortfolioActionsData {
  name: string;
  icon: string | null;
  color: string | null;
  brokerName: string | null;
  brokerWebsite: string | null;
  clientNumber: string | null;
  accountNumber: string | null;
}

interface PortfolioActionsProps {
  portfolioId: string;
  portfolio: PortfolioActionsData;
  otherPortfolios: { id: string; name: string }[];
}

const fieldClass =
  "h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm";

export function PortfolioActions({
  portfolioId,
  portfolio,
  otherPortfolios,
}: PortfolioActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: portfolio.name,
    icon: portfolio.icon ?? "",
    color: portfolio.color ?? "",
    brokerName: portfolio.brokerName ?? "",
    brokerWebsite: portfolio.brokerWebsite ?? "",
    clientNumber: portfolio.clientNumber ?? "",
    accountNumber: portfolio.accountNumber ?? "",
  });
  const [mergeTarget, setMergeTarget] = useState("");

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await updatePortfolio(portfolioId, {
        name: form.name,
        icon: form.icon || null,
        color: form.color || null,
        brokerName: form.brokerName || null,
        brokerWebsite: form.brokerWebsite || null,
        clientNumber: form.clientNumber || null,
        accountNumber: form.accountNumber || null,
      });
      setEditOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${portfolio.name}"? This cannot be undone.`)) return;
    await deletePortfolio(portfolioId);
  }

  async function handleMerge(e: React.FormEvent) {
    e.preventDefault();
    if (!mergeTarget) return;
    setLoading(true);
    setError("");
    try {
      await mergePortfolio(portfolioId, mergeTarget);
      setMergeOpen(false);
      router.push(`/portfolio/${mergeTarget}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to merge.");
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setEditOpen(true)}
        title="Edit portfolio details"
        className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <Pencil className="h-4 w-4" />
      </button>
      {otherPortfolios.length > 0 && (
        <button
          onClick={() => setMergeOpen(true)}
          title="Merge into another portfolio"
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <GitMerge className="h-4 w-4" />
        </button>
      )}
      <button
        onClick={handleDelete}
        title="Delete portfolio"
        className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {/* Edit details */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit portfolio</DialogTitle>
            <DialogDescription>
              Update the name and broker / account details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium" htmlFor="pf-name">
                Name
              </label>
              <input
                id="pf-name"
                className={fieldClass}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>

            <div>
              <span className="mb-1 block text-xs font-medium">Icon</span>
              <div className="flex flex-wrap gap-1.5">
                {PORTFOLIO_ICONS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-label={key}
                    onClick={() => set("icon", key)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md border",
                      form.icon === key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <PortfolioIcon icon={key} className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="mb-1 block text-xs font-medium">Colour</span>
              <div className="flex flex-wrap gap-1.5">
                {PORTFOLIO_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Colour ${c}`}
                    onClick={() => set("color", c)}
                    className={cn(
                      "h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-background",
                      `bg-[${c}]`,
                      form.color === c ? "ring-foreground" : "ring-transparent"
                    )}
                  />
                ))}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Leave unset to use an automatic colour.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium" htmlFor="pf-broker">
                  Broker name
                </label>
                <input
                  id="pf-broker"
                  className={fieldClass}
                  value={form.brokerName}
                  onChange={(e) => set("brokerName", e.target.value)}
                  placeholder="e.g. CommSec"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" htmlFor="pf-website">
                  Broker website
                </label>
                <input
                  id="pf-website"
                  className={fieldClass}
                  value={form.brokerWebsite}
                  onChange={(e) => set("brokerWebsite", e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" htmlFor="pf-client">
                  Client number
                </label>
                <input
                  id="pf-client"
                  className={fieldClass}
                  value={form.clientNumber}
                  onChange={(e) => set("clientNumber", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" htmlFor="pf-account">
                  Account number
                </label>
                <input
                  id="pf-account"
                  className={fieldClass}
                  value={form.accountNumber}
                  onChange={(e) => set("accountNumber", e.target.value)}
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-md border border-input px-3 py-1.5 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {loading ? "Saving…" : "Save"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Merge */}
      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Merge portfolio</DialogTitle>
            <DialogDescription>
              Move all holdings and transactions from{" "}
              <span className="font-medium">{portfolio.name}</span> into another
              portfolio. The target portfolio&apos;s details are kept, and{" "}
              <span className="font-medium">{portfolio.name}</span> is deleted.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMerge} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium" htmlFor="pf-merge">
                Merge into
              </label>
              <select
                id="pf-merge"
                className={fieldClass}
                value={mergeTarget}
                onChange={(e) => setMergeTarget(e.target.value)}
                required
              >
                <option value="">Select a portfolio…</option>
                {otherPortfolios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <button
                type="button"
                onClick={() => setMergeOpen(false)}
                className="rounded-md border border-input px-3 py-1.5 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !mergeTarget}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {loading ? "Merging…" : "Merge"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
