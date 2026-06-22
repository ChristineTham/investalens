"use client";

import { useState } from "react";
import { fetchAllPrices } from "@/lib/actions/fetch-prices";
import {
  fetchBondPrices,
  saveBondPrices,
  type BondPriceResult,
} from "@/lib/actions/fetch-bond-prices";
import type {
  FiigBondRate,
  FiigFetchDiagnostics,
} from "@/lib/providers/fiig-bond-rates";
import { RefreshCw, X, Copy, Check } from "lucide-react";

interface StockResult {
  fetched: number;
  failed: number;
  total: number;
}

interface BondRatesResponse {
  ok: boolean;
  rates?: FiigBondRate[];
  error?: string;
  diagnostics?: FiigFetchDiagnostics;
}

function diagnosticsToLog(
  d: FiigFetchDiagnostics | undefined,
  heading: string
): string[] {
  const lines: string[] = [];
  if (!d) return lines;
  lines.push(`--- ${heading} ---`);
  lines.push(`URL: ${d.url}`);
  lines.push(`Started: ${d.startedAt}`);
  lines.push(`Duration: ${d.durationMs} ms`);
  lines.push(`OK: ${d.ok}`);
  if (d.status !== undefined) {
    lines.push(`HTTP status: ${d.status} ${d.statusText ?? ""}`.trim());
  }
  if (d.errorName || d.errorMessage) {
    lines.push("--- Exception ---");
    if (d.errorName) lines.push(`Name: ${d.errorName}`);
    if (d.errorMessage) lines.push(`Detail: ${d.errorMessage}`);
  }
  if (d.responseHeaders && Object.keys(d.responseHeaders).length > 0) {
    lines.push("--- Response headers ---");
    for (const [k, v] of Object.entries(d.responseHeaders)) {
      lines.push(`${k}: ${v}`);
    }
  }
  if (d.bodySnippet) {
    lines.push("--- Response body (first 1000 chars) ---");
    lines.push(d.bodySnippet);
  }
  return lines;
}

/** Fetch FIIG bond rates, preferring the dedicated route, then persist them. */
async function updateBondPrices(
  logLines: string[]
): Promise<{ result: BondPriceResult | null; error: string }> {
  // 1. Primary: dedicated route fetches the rate sheet, then persist via action
  try {
    const res = await fetch("/api/v1/market/bond-rates", { cache: "no-store" });
    const data: BondRatesResponse = await res.json();

    if (data.ok && data.rates && data.rates.length > 0) {
      const saved = await saveBondPrices(data.rates);
      if (saved.ok) return { result: saved, error: "" };
      logLines.push(`Bond save error: ${saved.error ?? "unknown"}`);
      return { result: null, error: saved.error ?? "Failed to save bond prices" };
    }

    logLines.push(`Bond fetch (route) error: ${data.error ?? "unknown"}`);
    logLines.push(...diagnosticsToLog(data.diagnostics, "Bond request (route)"));
  } catch (err) {
    logLines.push(
      `Bond fetch (route) request failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // 2. Fallback: direct server action
  try {
    const res = await fetchBondPrices();
    if (res.ok) return { result: res, error: "" };
    logLines.push(`Bond fetch (fallback) error: ${res.error ?? "unknown"}`);
    logLines.push(...diagnosticsToLog(res.diagnostics, "Bond request (fallback)"));
    return { result: null, error: res.error ?? "Failed to fetch bond prices" };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch bond prices";
    logLines.push(`Bond fetch (fallback) request failed: ${message}`);
    return { result: null, error: message };
  }
}

export function FetchPricesButton() {
  const [loading, setLoading] = useState(false);
  const [stockResult, setStockResult] = useState<StockResult | null>(null);
  const [bondResult, setBondResult] = useState<BondPriceResult | null>(null);
  const [stockError, setStockError] = useState("");
  const [bondError, setBondError] = useState("");
  const [errorLog, setErrorLog] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleFetch() {
    setLoading(true);
    setStockResult(null);
    setBondResult(null);
    setStockError("");
    setBondError("");
    setErrorLog(null);
    setShowLog(false);
    setCopied(false);

    const logLines: string[] = [
      "=== InvestaLens — Fetch Prices Error Log ===",
      `Timestamp: ${new Date().toISOString()}`,
    ];

    // 1. Shares / ETFs / benchmarks via Yahoo Finance
    try {
      const res = await fetchAllPrices();
      setStockResult(res);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch share prices";
      setStockError(message);
      logLines.push("");
      logLines.push(`Share fetch failed: ${message}`);
    }

    // 2. Bonds via FIIG rate sheet
    const { result, error } = await updateBondPrices(logLines);
    if (result) {
      setBondResult(result);
    } else if (error) {
      setBondError(error);
    }

    if (error) {
      setErrorLog(logLines.concat("", "=== End of log ===").join("\n"));
    }

    setLoading(false);
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
          <h3 className="font-medium">Market Data</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Fetch the latest prices for all holdings — shares and ETFs from Yahoo
            Finance (historical prices and dividends), and bonds from the FIIG
            Securities rate sheet (matched by ISIN).
          </p>
        </div>
        <button
          onClick={handleFetch}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Fetching..." : "Fetch Prices"}
        </button>
      </div>

      {(stockResult || bondResult || stockError || bondError) && (
        <div className="mt-3 space-y-2 rounded-md border border-border bg-muted/50 p-3 text-sm">
          {/* Shares / ETFs */}
          {stockResult && (
            <p className="font-medium text-success">
              Shares &amp; ETFs: fetched {stockResult.fetched} price record
              {stockResult.fetched === 1 ? "" : "s"} for {stockResult.total}{" "}
              holding{stockResult.total === 1 ? "" : "s"}
              {stockResult.failed > 0 ? (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  ({stockResult.failed} not found on Yahoo Finance — e.g. bonds)
                </span>
              ) : null}
            </p>
          )}
          {stockError && (
            <p className="text-destructive">Shares &amp; ETFs: {stockError}</p>
          )}

          {/* Bonds */}
          {bondResult &&
            (bondResult.totalBonds === 0 ? (
              <p className="text-muted-foreground">No bond holdings found.</p>
            ) : (
              <p className="font-medium text-success">
                Bonds: updated {bondResult.updated} of {bondResult.totalBonds}{" "}
                from {bondResult.rateSheetCount} rate sheet entries
                {bondResult.unmatched > 0 ? (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    ({bondResult.unmatched} not on the rate sheet
                    {bondResult.carriedForward > 0
                      ? `, ${bondResult.carriedForward} carried forward`
                      : ""}
                    : {bondResult.unmatchedCodes.join(", ")})
                  </span>
                ) : null}
              </p>
            ))}
          {bondError && (
            <div className="flex items-center justify-between gap-3 text-destructive">
              <span>Bonds: {bondError}</span>
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
      aria-label="Fetch prices error log"
    >
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="font-medium">Fetch Prices — Error Log</h3>
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
