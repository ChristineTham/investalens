"use client";

import { useState, useEffect, useRef } from "react";
import { updateInstrumentDelisted } from "@/lib/actions/instrument";
import { toast } from "sonner";
import { X } from "lucide-react";

interface DelistedToggleProps {
  instrumentId: string;
  portfolioId: string;
  holdingId: string;
  enabled: boolean;
}

export function DelistedToggle({
  instrumentId,
  portfolioId,
  holdingId,
  enabled,
}: DelistedToggleProps) {
  const [isDelisted, setIsDelisted] = useState(enabled);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function handleToggle() {
    const nextState = !isDelisted;
    if (nextState) {
      setShowModal(true);
      setProgressPct(0);
      setProgressLabel("Ready to start enrichment...");
    } else {
      setLoading(true);
      try {
        await updateInstrumentDelisted(instrumentId, false, portfolioId, holdingId);
        setIsDelisted(false);
        toast.success("Holding successfully marked as active.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update status");
      } finally {
        setLoading(false);
      }
    }
  }

  async function confirmDelisting() {
    setLoading(true);
    setProgressPct(5);
    setProgressLabel("Searching delisted.com.au...");

    let currentPct = 5;
    intervalRef.current = setInterval(() => {
      if (currentPct < 90) {
        currentPct += Math.floor(Math.random() * 8) + 2;
        if (currentPct > 90) currentPct = 90;
        setProgressPct(currentPct);

        if (currentPct < 30) {
          setProgressLabel("Searching delisted.com.au...");
        } else if (currentPct < 65) {
          setProgressLabel("Scraping company details & events...");
        } else {
          setProgressLabel("Downloading price history from EODHD...");
        }
      }
    }, 400);

    try {
      const res = await updateInstrumentDelisted(instrumentId, true, portfolioId, holdingId);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      setProgressPct(100);
      setProgressLabel("Completed!");

      await new Promise((resolve) => setTimeout(resolve, 600));

      setIsDelisted(true);
      setShowModal(false);

      if (res && !res.verified) {
        toast.warning("Delisted status could not be verified on delisted.com.au.");
      } else {
        toast.success("Holding successfully marked as delisted.");
      }
    } catch (err) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      toast.error(err instanceof Error ? err.message : "Failed to update delisted status");
      setShowModal(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleToggle}
        disabled={loading}
        role="switch"
        aria-checked={isDelisted}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          isDelisted ? "bg-amber-500" : "bg-muted"
        } disabled:opacity-50`}
        title={
          isDelisted
            ? "Delisted – click to mark active"
            : "Active – click to mark delisted"
        }
        aria-label="Delisted Status"
      >
        <span
          aria-hidden="true"
          className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
            isDelisted ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Delisting"
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-medium text-foreground">Confirm Delisting</h3>
              {!loading && (
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to mark this holding as delisted? This will perform a once-off fetch to download:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                <li>Company profile details from <strong>delisted.com.au</strong></li>
                <li>Full historical price history from <strong>EODHD</strong></li>
              </ul>

              {loading && (
                <div className="mt-4 space-y-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{progressLabel}</span>
                    <span>{progressPct}%</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelisting}
                disabled={loading}
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {loading ? "Fetching..." : "Confirm & Fetch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
