"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, X, Copy, Check } from "lucide-react";

// Mirrors lib/services/price-sync.ts SyncEvent (kept local to avoid importing
// server-only modules into this client component).
type PhaseKey = "shares" | "bonds" | "info";
type SyncEvent =
  | { type: "phase"; phase: PhaseKey; label: string; total: number }
  | { type: "item"; phase: PhaseKey; current: number; total: number; label: string }
  | { type: "result"; section: PhaseKey; data: unknown }
  | { type: "error"; section: PhaseKey; message: string; diagnostics?: unknown }
  | { type: "done" };

interface StockResult {
  fetched: number;
  failed: number;
  total: number;
}
interface BondResult {
  matched: number;
  updated: number;
  unmatched: number;
  carriedForward: number;
  totalBonds: number;
  rateSheetCount: number;
  unmatchedCodes: string[];
}
interface InfoResult {
  updated: number;
  failed: number;
  total: number;
}

interface Progress {
  phase: PhaseKey;
  label: string;
  current: number;
  total: number;
  item: string;
}

const PHASE_LABEL: Record<PhaseKey, string> = {
  shares: "Shares & ETFs (Yahoo Finance)",
  bonds: "Bond prices (FIIG rate sheet)",
  info: "Company information (yfinance)",
};
const PHASE_ORDER: PhaseKey[] = ["shares", "bonds", "info"];

// Round a 0–100 percentage to the nearest available Tailwind width fraction so
// the bar width is a static class (no forbidden inline style).
const WIDTH_STEPS: { pct: number; cls: string }[] = [
  { pct: 0, cls: "w-0" },
  { pct: 8, cls: "w-1/12" },
  { pct: 17, cls: "w-2/12" },
  { pct: 25, cls: "w-1/4" },
  { pct: 33, cls: "w-1/3" },
  { pct: 42, cls: "w-5/12" },
  { pct: 50, cls: "w-1/2" },
  { pct: 58, cls: "w-7/12" },
  { pct: 67, cls: "w-2/3" },
  { pct: 75, cls: "w-3/4" },
  { pct: 83, cls: "w-10/12" },
  { pct: 92, cls: "w-11/12" },
  { pct: 100, cls: "w-full" },
];
function widthClass(pct: number): string {
  let best = WIDTH_STEPS[0];
  for (const s of WIDTH_STEPS) {
    if (Math.abs(s.pct - pct) < Math.abs(best.pct - pct)) best = s;
  }
  return best.cls;
}

export function FetchPricesButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [stockResult, setStockResult] = useState<StockResult | null>(null);
  const [bondResult, setBondResult] = useState<BondResult | null>(null);
  const [infoResult, setInfoResult] = useState<InfoResult | null>(null);
  const [bondError, setBondError] = useState("");
  const [infoError, setInfoError] = useState("");
  const [sharesError, setSharesError] = useState("");
  const [topError, setTopError] = useState("");
  const [errorLog, setErrorLog] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleFetch() {
    setLoading(true);
    setProgress(null);
    setStockResult(null);
    setBondResult(null);
    setInfoResult(null);
    setBondError("");
    setInfoError("");
    setSharesError("");
    setTopError("");
    setErrorLog(null);
    setShowLog(false);
    setCopied(false);

    const logLines: string[] = [
      "=== InvestaLens — Fetch Prices Error Log ===",
      `Timestamp: ${new Date().toISOString()}`,
    ];

    try {
      const res = await fetch("/api/v1/market/sync-prices", {
        cache: "no-store",
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        const message =
          data.error ?? `Sync failed (HTTP ${res.status} ${res.statusText}).`;
        setTopError(message);
        logLines.push("", `Request failed: ${message}`);
        setErrorLog(logLines.concat("", "=== End of log ===").join("\n"));
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handleEvent = (event: SyncEvent) => {
        switch (event.type) {
          case "phase":
            setProgress({
              phase: event.phase,
              label: PHASE_LABEL[event.phase],
              current: 0,
              total: event.total,
              item: "",
            });
            break;
          case "item":
            setProgress({
              phase: event.phase,
              label: PHASE_LABEL[event.phase],
              current: event.current,
              total: event.total,
              item: event.label,
            });
            break;
          case "result":
            if (event.section === "shares") setStockResult(event.data as StockResult);
            else if (event.section === "bonds") setBondResult(event.data as BondResult);
            else if (event.section === "info") setInfoResult(event.data as InfoResult);
            break;
          case "error":
            if (event.section === "shares") setSharesError(event.message);
            else if (event.section === "bonds") setBondError(event.message);
            else if (event.section === "info") setInfoError(event.message);
            logLines.push("", `[${event.section}] ${event.message}`);
            if (event.diagnostics) {
              logLines.push(JSON.stringify(event.diagnostics, null, 2));
            }
            break;
          case "done":
            break;
        }
      };

      // Read the NDJSON stream line by line
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          try {
            handleEvent(JSON.parse(line) as SyncEvent);
          } catch {
            /* ignore malformed line */
          }
        }
      }

      if (logLines.length > 2) {
        setErrorLog(logLines.concat("", "=== End of log ===").join("\n"));
      }

      // Re-fetch the server-rendered dashboard so summary cards, charts and
      // holding values reflect the prices just written to the database.
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Fetch failed.";
      setTopError(message);
      logLines.push("", `Stream error: ${message}`);
      setErrorLog(logLines.concat("", "=== End of log ===").join("\n"));
    } finally {
      setProgress(null);
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

  const hasResults =
    stockResult ||
    bondResult ||
    infoResult ||
    sharesError ||
    bondError ||
    infoError ||
    topError;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-medium">Market Data</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Fetch the latest prices for all holdings — shares and ETFs from Yahoo
            Finance (historical prices and dividends), and bonds from the FIIG
            Securities rate sheet (matched by ISIN). Also refreshes company
            profiles, fundamentals, analyst views and news for shares &amp; ETFs.
          </p>
        </div>
        <button
          onClick={handleFetch}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Updating..." : "Update"}
        </button>
      </div>

      {loading && <FetchProgress progress={progress} />}

      {hasResults && (
        <div className="mt-3 space-y-2 rounded-md border border-border bg-muted/50 p-3 text-sm">
          {topError && (
            <p role="alert" className="text-destructive">
              {topError}
            </p>
          )}

          {/* Shares / ETFs */}
          {stockResult && (
            <p className="font-medium text-success">
              Shares &amp; ETFs: fetched {stockResult.fetched} price record
              {stockResult.fetched === 1 ? "" : "s"} for {stockResult.total}{" "}
              holding{stockResult.total === 1 ? "" : "s"}
              {stockResult.failed > 0 ? (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  ({stockResult.failed} not found on Yahoo Finance)
                </span>
              ) : null}
            </p>
          )}
          {sharesError && (
            <p role="alert" className="text-destructive">
              Shares &amp; ETFs: {sharesError}
            </p>
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
            <div
              role="alert"
              className="flex items-center justify-between gap-3 text-destructive"
            >
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

          {/* Stock information */}
          {infoResult &&
            (infoResult.total === 0 ? null : (
              <p className="font-medium text-success">
                Stock info: updated {infoResult.updated} of {infoResult.total}{" "}
                share{infoResult.total === 1 ? "" : "s"} &amp; ETF
                {infoResult.total === 1 ? "" : "s"}
                {infoResult.failed > 0 ? (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    ({infoResult.failed} unavailable)
                  </span>
                ) : null}
              </p>
            ))}
          {infoError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 text-destructive"
            >
              <span>Stock info: {infoError}</span>
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

function FetchProgress({ progress }: { progress: Progress | null }) {
  const phaseIndex = progress ? PHASE_ORDER.indexOf(progress.phase) : 0;
  const stepNo = phaseIndex + 1;
  const pct =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;
  const cls = widthClass(pct);

  return (
    <div className="mt-3 space-y-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full bg-primary transition-all duration-300 ease-out ${cls}`} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>
          Step {stepNo} of {PHASE_ORDER.length}:{" "}
          <span className="font-medium text-foreground">
            {progress ? progress.label : "Starting…"}
          </span>
        </span>
        {progress && progress.total > 0 ? (
          <span>
            {progress.current} / {progress.total}
            {progress.item ? (
              <>
                {" · "}
                <span className="font-medium text-foreground">{progress.item}</span>
              </>
            ) : null}
          </span>
        ) : (
          <span>Preparing…</span>
        )}
      </div>
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
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
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
