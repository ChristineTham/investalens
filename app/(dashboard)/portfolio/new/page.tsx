"use client";

import { useState } from "react";
import { createPortfolio } from "@/lib/actions/portfolio";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewPortfolioPage() {
  const [name, setName] = useState("");
  const [taxResidency, setTaxResidency] = useState("AU");
  const [taxEntityType, setTaxEntityType] = useState("individual");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await createPortfolio({ name, taxResidency, taxEntityType });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create portfolio"
      );
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/portfolio" className="rounded-md p-2 hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-serif text-2xl font-bold">New Portfolio</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Portfolio Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            placeholder="e.g. My ASX Portfolio"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="taxResidency" className="text-sm font-medium">
            Tax Residency
          </label>
          <select
            id="taxResidency"
            value={taxResidency}
            onChange={(e) => setTaxResidency(e.target.value)}
            aria-label="Tax residency"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="AU">Australia</option>
            <option value="NZ">New Zealand</option>
            <option value="US">United States</option>
            <option value="GB">United Kingdom</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="taxEntityType" className="text-sm font-medium">
            Entity Type
          </label>
          <select
            id="taxEntityType"
            value={taxEntityType}
            onChange={(e) => setTaxEntityType(e.target.value)}
            aria-label="Tax entity type"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="individual">Individual</option>
            <option value="smsf">SMSF</option>
            <option value="company">Company</option>
            <option value="trust">Trust</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || !name}
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Portfolio"}
        </button>
      </form>
    </div>
  );
}
