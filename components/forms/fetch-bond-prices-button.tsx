"use client";

import { useState } from "react";
import { fetchBondPrices, type BondPriceResult } from "@/lib/actions/fetch-bond-prices";
import { Landmark } from "lucide-react";

export function FetchBondPricesButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BondPriceResult | null>(null);
  const [error, setError] = useState("");

  async function handleFetch() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetchBondPrices();
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch bond prices");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-medium">Bond Prices</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Update current bond capital prices from the FIIG Securities rate
            sheet. Matches your bond holdings by ISIN.
          </p>
        </div>
        <button
          onClick={handleFetch}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Landmark className={`h-4 w-4 ${loading ? "animate-pulse" : ""}`} />
          {loading ? "Fetching..." : "Fetch Bond Prices"}
        </button>
      </div>

      {result && (
        <div className="mt-3 rounded-md border border-border bg-muted/50 p-3 text-sm">
          {result.totalBonds === 0 ? (
            <p className="text-muted-foreground">
              No bond holdings found in your portfolios.
            </p>
          ) : (
            <>
              <p className="font-medium text-success">
                Updated {result.updated} of {result.totalBonds} bond
                {result.totalBonds === 1 ? "" : "s"} from {result.rateSheetCount}{" "}
                rate sheet entries
              </p>
              {result.unmatched > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {result.unmatched} not on the rate sheet:{" "}
                  {result.unmatchedCodes.join(", ")}
                </p>
              )}
            </>
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
