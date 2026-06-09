"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { parseCsv, type CsvParseResult } from "@/lib/import/csv-parser";
import { mapRows } from "@/lib/import/mapper";
import { listBrokerTemplates, getBrokerTemplate } from "@/lib/import/templates";
import { importTransactions } from "@/lib/actions/import";
import { FieldMapper } from "@/components/forms/field-mapper";
import { ImportReviewTable } from "@/components/forms/import-review-table";
import type { FieldMapping, ImportConfig, ParsedTransaction } from "@/lib/import/types";
import { Upload, ChevronRight, ChevronLeft, Check, Loader2 } from "lucide-react";

type Step = "upload" | "configure" | "map" | "review" | "complete";

export default function ImportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [portfolioId, setPortfolioId] = useState<string>("");
  const [step, setStep] = useState<Step>("upload");
  const [csvResult, setCsvResult] = useState<CsvParseResult | null>(null);
  const [csvContent, setCsvContent] = useState<string>("");
  const [dateFormat, setDateFormat] = useState("dd/mm/yyyy");
  const [decimalSeparator, setDecimalSeparator] = useState(".");
  const [selectedBroker, setSelectedBroker] = useState("");
  const [mapping, setMapping] = useState<FieldMapping>({
    tradeDate: null,
    instrumentCode: null,
    quantity: null,
    price: null,
    transactionType: null,
  });
  const [parsed, setParsed] = useState<ParsedTransaction[]>([]);
  const [errors, setErrors] = useState<Array<{ row: number; data: Record<string, string>; errors: string[] }>>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; rejected: number; duplicates: number } | null>(null);

  // Resolve params
  useState(() => {
    params.then((p) => setPortfolioId(p.id));
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    file.text().then((text) => {
      setCsvContent(text);
      const result = parseCsv(text);
      setCsvResult(result);
      setStep("configure");
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "text/plain": [".txt"] },
    maxFiles: 1,
  });

  function handleBrokerSelect(broker: string) {
    setSelectedBroker(broker);
    const template = getBrokerTemplate(broker);
    if (template) {
      setMapping(template.mapping);
      setDateFormat(template.dateFormat);
      setDecimalSeparator(template.decimalSeparator);
    }
  }

  function handleMapAndReview() {
    if (!csvResult) return;
    const config: ImportConfig = { mapping, dateFormat, decimalSeparator };
    const { transactions, errors: mapErrors } = mapRows(csvResult.rows, config);
    setParsed(transactions);
    setErrors(mapErrors);
    setStep("review");
  }

  async function handleImport() {
    if (!portfolioId) return;
    setImporting(true);

    try {
      const config: ImportConfig = { mapping, dateFormat, decimalSeparator };
      const importResult = await importTransactions(portfolioId, csvContent, config);
      setResult({
        imported: importResult.imported.length,
        rejected: importResult.rejected.length,
        duplicates: importResult.duplicates.length,
      });
      setStep("complete");
    } catch {
      setErrors([{ row: 0, data: {}, errors: ["Import failed. Please try again."] }]);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold">Import Transactions</h1>

      {/* Step indicators */}
      <div className="flex items-center gap-2 text-sm">
        {(["upload", "configure", "map", "review", "complete"] as Step[]).map(
          (s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              <span
                className={
                  step === s
                    ? "font-medium text-primary"
                    : "text-muted-foreground"
                }
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
            </div>
          )
        )}
      </div>

      {/* Upload step */}
      {step === "upload" && (
        <div
          {...getRootProps()}
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium">
            Drag & drop a CSV file, or click to browse
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Supports .csv and .txt files
          </p>
        </div>
      )}

      {/* Configure step */}
      {step === "configure" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-medium">File Detected</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {csvResult?.rowCount} rows, {csvResult?.headers.length} columns,
              delimiter: &quot;{csvResult?.delimiter}&quot;
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Broker Template</label>
              <select
                value={selectedBroker}
                onChange={(e) => handleBrokerSelect(e.target.value)}
                aria-label="Broker template"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Custom / Manual mapping</option>
                {listBrokerTemplates().map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Date Format</label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  aria-label="Date format"
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                  <option value="mm/dd/yyyy">MM/DD/YYYY</option>
                  <option value="yyyy-mm-dd">YYYY-MM-DD</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Decimal Separator</label>
                <select
                  value={decimalSeparator}
                  onChange={(e) => setDecimalSeparator(e.target.value)}
                  aria-label="Decimal separator"
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value=".">Period (.)</option>
                  <option value=",">Comma (,)</option>
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep("map")}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Next: Map Fields
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Map step */}
      {step === "map" && csvResult && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-medium">Map CSV Columns</h2>
            <FieldMapper
              headers={csvResult.headers}
              mapping={mapping}
              onMappingChange={setMapping}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("configure")}
              className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={handleMapAndReview}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Next: Review
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Review step */}
      {step === "review" && (
        <div className="space-y-6">
          <div className="flex gap-4 text-sm">
            <span className="rounded-md bg-success/10 px-3 py-1 text-success">
              {parsed.length} valid
            </span>
            <span className="rounded-md bg-destructive/10 px-3 py-1 text-destructive">
              {errors.length} errors
            </span>
          </div>

          <ImportReviewTable
            transactions={parsed}
            errors={errors}
            duplicates={[]}
          />

          <div className="flex gap-3">
            <button
              onClick={() => setStep("map")}
              className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={importing || parsed.length === 0}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {importing ? "Importing..." : `Import ${parsed.length} transactions`}
            </button>
          </div>
        </div>
      )}

      {/* Complete step */}
      {step === "complete" && result && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <Check className="mx-auto h-12 w-12 text-success" />
          <h2 className="mt-4 text-xl font-medium">Import Complete</h2>
          <div className="mt-4 flex justify-center gap-6 text-sm">
            <div>
              <p className="text-2xl font-bold text-success">{result.imported}</p>
              <p className="text-muted-foreground">Imported</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{result.rejected}</p>
              <p className="text-muted-foreground">Rejected</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-warning">{result.duplicates}</p>
              <p className="text-muted-foreground">Duplicates</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
