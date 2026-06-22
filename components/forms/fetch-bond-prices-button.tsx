"use client";

import { useState } from "react";
import {
  fetchBondPrices,
  type BondPriceResult,
} from "@/lib/actions/fetch-bond-prices";
import { Landmark, X, Copy, Check } from "lucide-react";

function buildErrorLog(res: BondPriceResult): string {
  const d = res.diagnostics;
  const lines: string[] = [];
  lines.push("=== InvestaLens — Fetch Bond Prices Error Log ===");
  lines.push(`Timestamp: ${new Date().toISOString()}`);
  lines.push(`Message: ${res.error ?? "Unknown error"}`);
  lines.push(`Bonds in portfolios: ${res.totalBonds}`);
  lines.push("");
  if (d) {
    lines.push("--- Request ---");
    lines.push(`URL: ${d.url}`);
    lines.push(`Started: ${d.startedAt}`);
    lines.push(`Duration: ${d.durationMs} ms`);
    lines.push(`OK: ${d.ok}`);
    if (d.status !== undefined) {
      lines.push(`HTTP status: ${d.status} ${d.statusText ?? ""}`.trim());
    }
    if (d.errorName || d.errorMessage) {
      lines.push("");
      lines.push("--- Exception ---");
      if (d.errorName) lines.push(`Name: ${d.errorName}`);
      if (d.errorMessage) lines.push(`Detail: ${d.errorMessage}`);
    }
    if (d.responseHeaders && Object.keys(d.responseHeaders).length > 0) {
      lines.push("");
      lines.push("--- Response headers ---");
      for (const [k, v] of Object.entries(d.responseHeaders)) {
        lines.push(`${k}: ${v}`);
      }
    }
    if (d.bodySnippet) {
      lines.push("");
      lines.push("--- Response body (first 1000 chars) ---");
      lines.push(d.bodySnippet);
    }
  } else {
    lines.push(
      "(No request diagnostics available — failure occurred before the network call.)"
    );
  }
  lines.push("");
  lines.push("=== End of log ===");
  return lines.join("\n");
}

export function FetchBondPricesButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BondPriceResult | null>(null);
  const [error, setError] = useState("");
  const [errorLog, setErrorLog] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleFetch() {
    setLoading(true);
    setError("");
    setResult(null);
    setErrorLog(null);
    setShowLog(false);
    setCopied(false);

    try {
      const res = await fetchBondPrices();
      if (!res.ok) {
        setError(res.error ?? "Failed to fetch bond prices");
        setErrorLog(buildErrorLog(res));
      } else {
        setResult(res);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch bond prices";
      setError(message);
      setErrorLog(
        [
          "=== InvestaLens — Fetch Bond Prices Error Log ===",
          `Timestamp: ${new Date().toISOString()}`,
          `Message: ${message}`,
          err instanceof Error && err.stack ? `\nStack:\n${err.stack}` : "",
          "=== End of log ===",
        ].join("\n")
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!errorLog) return;
    try {
      await navigator.clipboard.writeText(errorLog);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
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
        <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <span>{error}</span>
          {errorLog && (
            <button
              type="button"
              onClick={() => setShowLog(true)}
              className="shrink-0 rounded-md border border-destructive/50 px-2 py-1 text-xs font-medium hover:bg-destructive/20"
            >
              View error log
            </button>
          )}
        </div>
      )}

      {showLog && errorLog && (
        <ErrorLogModal
          log={errorLog}
          copied={copied}
          onCopy={handleCopy}
          onClose={() => setShowLog(false)}
        />
      )}
    </div>
  );
}

function ErrorLogModal({
  log,
  copied,
  onCopy,
  onClose,
}: {
  log: string;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Bond price error log"
    >
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="font-medium">Fetch Bond Prices — Error Log</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-accent"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-auto p-4">
          <pre className="whitespace-pre-wrap wrap-break-word rounded-md bg-muted p-3 text-xs">
            {log}
          </pre>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border p-4">
          <button
            onClick={onCopy}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy to clipboard"}
          </button>
          <button
            onClick={onClose}
            className="rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
