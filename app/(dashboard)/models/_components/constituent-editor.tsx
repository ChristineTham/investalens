"use client";

import { useEffect, useState } from "react";
import { InstrumentSearch } from "@/components/forms/instrument-search";
import {
  checkInstrumentCoverage,
  type InstrumentCoverageResult,
} from "@/lib/actions/model";
import { cn } from "@/lib/utils";
import { AlertTriangle, Plus, Trash2, Scale } from "lucide-react";

export interface ConstituentRow {
  /** Local stable key for React lists. */
  key: string;
  instrumentCode: string;
  marketCode: string;
  instrumentName?: string;
  /** Weight as a percentage (0–100) for editing; converted to a fraction on submit. */
  weightPercent: number;
}

interface ConstituentEditorProps {
  value: ConstituentRow[];
  onChange: (rows: ConstituentRow[]) => void;
  lookbackYears: number;
}

let keyCounter = 0;
function nextKey() {
  keyCounter += 1;
  return `c${keyCounter}-${Date.now()}`;
}

export function ConstituentEditor({
  value,
  onChange,
  lookbackYears,
}: ConstituentEditorProps) {
  const [coverage, setCoverage] = useState<
    Record<string, InstrumentCoverageResult>
  >({});

  const totalPercent = value.reduce((a, r) => a + (r.weightPercent || 0), 0);
  const balanced = Math.abs(totalPercent - 100) < 0.01;

  // Re-check coverage for every row when the lookback period changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const row of value) {
        const id = `${row.instrumentCode}:${row.marketCode}`;
        try {
          const cov = await checkInstrumentCoverage(
            row.instrumentCode,
            row.marketCode,
            lookbackYears
          );
          if (!cancelled) setCoverage((prev) => ({ ...prev, [id]: cov }));
        } catch {
          /* ignore coverage failures */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookbackYears, value.length]);

  function addRow(code: string, marketCode: string, name?: string) {
    if (
      value.some(
        (r) => r.instrumentCode === code && r.marketCode === marketCode
      )
    ) {
      return; // no duplicates
    }
    onChange([
      ...value,
      {
        key: nextKey(),
        instrumentCode: code,
        marketCode,
        instrumentName: name,
        weightPercent: 0,
      },
    ]);
    checkInstrumentCoverage(code, marketCode, lookbackYears)
      .then((cov) =>
        setCoverage((prev) => ({ ...prev, [`${code}:${marketCode}`]: cov }))
      )
      .catch(() => {});
  }

  function updateWeight(key: string, weightPercent: number) {
    onChange(
      value.map((r) => (r.key === key ? { ...r, weightPercent } : r))
    );
  }

  function removeRow(key: string) {
    onChange(value.filter((r) => r.key !== key));
  }

  function normalise() {
    if (totalPercent <= 0) {
      // Distribute evenly when nothing is set yet.
      const even = value.length > 0 ? 100 / value.length : 0;
      onChange(value.map((r) => ({ ...r, weightPercent: even })));
      return;
    }
    onChange(
      value.map((r) => ({
        ...r,
        weightPercent: (r.weightPercent / totalPercent) * 100,
      }))
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Constituents</span>
        <button
          type="button"
          onClick={normalise}
          disabled={value.length === 0}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-accent disabled:opacity-50"
        >
          <Scale className="h-3.5 w-3.5" />
          Normalise weights
        </button>
      </div>

      <InstrumentSearch
        onSelect={(inst) =>
          addRow(inst.code, inst.exchange || "ASX", inst.name)
        }
        placeholder="Search and add an instrument..."
      />

      {value.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          No constituents yet. Search above to add instruments.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Instrument</th>
                <th className="px-3 py-2 text-right font-medium">Weight %</th>
                <th className="px-3 py-2 text-left font-medium">Coverage</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {value.map((row) => {
                const cov = coverage[`${row.instrumentCode}:${row.marketCode}`];
                return (
                  <tr key={row.key} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="font-medium">{row.instrumentCode}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {row.instrumentName ?? row.marketCode}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={row.weightPercent}
                        onChange={(e) =>
                          updateWeight(row.key, Number(e.target.value))
                        }
                        aria-label={`Weight for ${row.instrumentCode}`}
                        className="h-8 w-24 rounded-md border border-input bg-background px-2 text-right text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      {cov && !cov.valid ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {!cov.found
                            ? "No price history yet"
                            : cov.stale
                              ? "No recent prices — may be delisted"
                              : `History from ${cov.firstPrice ?? "?"} — shorter than ${lookbackYears}y lookback`}
                        </span>
                      ) : cov ? (
                        <span className="text-xs text-muted-foreground">
                          OK
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">…</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        aria-label={`Remove ${row.instrumentCode}`}
                        className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/30">
                <td className="px-3 py-2 text-xs font-medium text-muted-foreground">
                  Total
                </td>
                <td
                  className={cn(
                    "px-3 py-2 text-right text-sm font-semibold tabular-nums",
                    balanced
                      ? "text-emerald-600 dark:text-emerald-500"
                      : "text-amber-600 dark:text-amber-500"
                  )}
                >
                  {totalPercent.toFixed(2)}%
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground" colSpan={2}>
                  {balanced ? (
                    "Weights sum to 100%."
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Plus className="h-3 w-3 rotate-45" />
                      Must sum to 100% before saving.
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
