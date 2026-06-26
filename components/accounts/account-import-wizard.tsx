"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, CheckCircle2 } from "lucide-react";
import {
  previewAccountImport,
  commitAccountImport,
  type ImportKind,
  type ImportPreviewRow,
  type CommitRow,
} from "@/lib/actions/account-import";
import { formatCurrency } from "@/lib/utils";

interface CategoryOption {
  id: string;
  name: string;
}
interface TemplateOption {
  id: string;
  name: string;
  description?: string;
}

function detectKind(filename: string): ImportKind {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".ofx") || lower.endsWith(".qfx")) return "ofx";
  if (lower.endsWith(".qif")) return "qif";
  return "csv";
}

export function AccountImportWizard({
  accountId,
  currency,
  categories,
  csvTemplates,
}: {
  accountId: string;
  currency: string;
  categories: CategoryOption[];
  csvTemplates: TemplateOption[];
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<ImportKind>("csv");
  const [csvTemplateId, setCsvTemplateId] = useState("generic_bank");
  const [rows, setRows] = useState<ImportPreviewRow[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    reconciled: number;
  } | null>(null);

  function onFile(f: File | null) {
    setFile(f);
    setRows(null);
    setResult(null);
    setError("");
    if (f) setKind(detectKind(f.name));
  }

  async function handlePreview() {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const text = await file.text();
      const preview = await previewAccountImport(accountId, text, kind, csvTemplateId);
      setRows(preview.rows);
      const sel = new Set<number>();
      const ov: Record<number, string> = {};
      preview.rows.forEach((r, i) => {
        if (!r.isDuplicate) sel.add(i);
        if (r.suggestedCategoryId) ov[i] = r.suggestedCategoryId;
      });
      setSelected(sel);
      setOverrides(ov);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse the file.");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!rows) return;
    setLoading(true);
    setError("");
    try {
      const commit: CommitRow[] = [...selected].map((i) => {
        const r = rows[i];
        return {
          date: r.date,
          amount: r.amount,
          type: r.type,
          description: r.description,
          fitId: r.fitId,
          importHash: r.importHash,
          categoryId: overrides[i] ?? null,
        };
      });
      const res = await commitAccountImport(accountId, commit);
      setResult(res);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setLoading(false);
    }
  }

  function toggle(i: number) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  if (result) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
        <h2 className="mt-3 text-lg font-medium">Import complete</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Imported {result.imported} transaction{result.imported === 1 ? "" : "s"}
          {result.reconciled > 0
            ? `, reconciled ${result.reconciled} existing transfer(s)`
            : ""}
          {result.skipped > 0 ? `, skipped ${result.skipped} duplicate(s)` : ""}.
        </p>
        <button
          onClick={() => router.push(`/accounts/${accountId}`)}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Back to account
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium" htmlFor="imp-file">
              Statement file
            </label>
            <input
              id="imp-file"
              type="file"
              accept=".ofx,.qfx,.qif,.csv,.txt"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              OFX / QFX, QIF, or CSV. OFX transactions are de-duplicated by their bank id.
            </p>
          </div>
          {kind === "csv" && (
            <div>
              <label className="mb-1 block text-xs font-medium" htmlFor="imp-tmpl">
                CSV format
              </label>
              <select
                id="imp-tmpl"
                value={csvTemplateId}
                onChange={(e) => setCsvTemplateId(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2.5 text-sm"
              >
                {csvTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={handlePreview}
            disabled={!file || loading}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading && !rows ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Preview
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>

      {/* Review */}
      {rows && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {rows.length} parsed · {selected.size} selected ·{" "}
              {rows.filter((r) => r.isDuplicate).length} duplicate(s) skipped
            </p>
            <button
              onClick={handleImport}
              disabled={loading || selected.size === 0}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Import {selected.size} selected
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-200">
              <thead className="bg-muted/50 text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 text-left">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="px-3 py-2.5 text-left">Date</th>
                  <th className="px-3 py-2.5 text-left">Description</th>
                  <th className="px-3 py-2.5 text-left">Type</th>
                  <th className="px-3 py-2.5 text-left">Category</th>
                  <th className="px-3 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => (
                  <tr
                    key={`${r.importHash}-${i}`}
                    className={r.isDuplicate ? "opacity-50" : "hover:bg-accent/50"}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(i)}
                        onChange={() => toggle(i)}
                        aria-label={`Select ${r.description}`}
                      />
                    </td>
                    <td className="px-3 py-2 text-sm text-muted-foreground tabular-nums">
                      {r.date}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {r.description || "—"}
                      {r.isDuplicate && (
                        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {r.matchedTransfer ? "Transfer match" : "Duplicate"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm capitalize text-muted-foreground">
                      {r.type.replace(/_/g, " ")}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={overrides[i] ?? ""}
                        onChange={(e) =>
                          setOverrides((o) => ({ ...o, [i]: e.target.value }))
                        }
                        aria-label="Category"
                        className="rounded-md border border-input bg-background px-1.5 py-1 text-xs"
                      >
                        <option value="">Uncategorised</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td
                      className={`px-3 py-2 text-right text-sm font-medium tabular-nums ${r.amount >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(r.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
