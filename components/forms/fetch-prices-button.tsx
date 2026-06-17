"use client";

import { useState } from "react";
import { fetchAllPrices } from "@/lib/actions/fetch-prices";
import { RefreshCw } from "lucide-react";

export function FetchPricesButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    fetched: number;
    failed: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState("");

  async function handleFetch() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetchAllPrices();
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch prices");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Market Data</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Fetch historical prices for all holdings since inception. Required
            for charts and analytics to function.
          </p>
        </div>
        <button
          onClick={handleFetch}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Fetching..." : "Fetch Prices"}
        </button>
      </div>

      {result && (
        <div className="mt-3 rounded-md border border-border bg-muted/50 p-3 text-sm">
          <p className="font-medium text-success">
            Fetched {result.fetched} price records for {result.total} instruments
          </p>
          {result.failed > 0 && (
            <p className="text-xs text-muted-foreground">
              {result.failed} instruments failed (may not have data on Yahoo
              Finance)
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
