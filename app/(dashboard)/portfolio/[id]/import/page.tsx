"use client";

import { useState, useCallback, useRef, useId, use } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { parseCsv, type CsvParseResult } from "@/lib/import/csv-parser";
import { mapRows } from "@/lib/import/mapper";
import { mapCashRows } from "@/lib/import/cash-mapper";
import { fileToCsv } from "@/lib/import/file-to-csv";
import {
  listTemplatesByCategory,
  listQuickImportTemplates,
  getTemplate,
} from "@/lib/import/templates";
import {
  importTransactions,
  importCashTransactions,
  importParsedTransactions,
  importParsedCashTransactions,
  importBondData,
} from "@/lib/actions/import";
import { listCustomImporters, type CustomImporter } from "@/lib/import/custom";
import { QuickImportButtons } from "@/components/forms/quick-import-buttons";
import { FieldMapper } from "@/components/forms/field-mapper";
import { ImportReviewTable } from "@/components/forms/import-review-table";
import type {
  FieldMapping,
  CashFieldMapping,
  ImportConfig,
  CashImportConfig,
  ParsedTransaction,
  CashParsedTransaction,
  ImportCategory,
} from "@/lib/import/types";
import {
  Upload,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  TrendingUp,
  Landmark,
  Banknote,
  FileCog,
  ArrowLeft,
  Zap,
} from "lucide-react";
import Link from "next/link";

type Step =
  | "hub"
  | "upload"
  | "configure"
  | "map"
  | "review"
  | "cash-configure"
  | "cash-review"
  | "complete";

const CATEGORY_LABELS: Record<ImportCategory, string> = {
  transactions: "Share Transactions",
  bonds: "Bonds & Fixed Interest",
  cash: "Cash / Bank Statement",
};

export default function ImportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: portfolioId } = use(params);
  const router = useRouter();
  const formId = useId();

  const [step, setStep] = useState<Step>("hub");
  const [category, setCategory] = useState<ImportCategory>("transactions");
  const [csvResult, setCsvResult] = useState<CsvParseResult | null>(null);
  const [csvContent, setCsvContent] = useState<string>("");
  const [dateFormat, setDateFormat] = useState("dd/mm/yyyy");
  const [decimalSeparator, setDecimalSeparator] = useState(".");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  // Transaction / bond mapping
  const [mapping, setMapping] = useState<FieldMapping>({
    tradeDate: null,
    instrumentCode: null,
    quantity: null,
    price: null,
    transactionType: null,
  });
  const [parsed, setParsed] = useState<ParsedTransaction[]>([]);

  // Cash mapping
  const [cashAccountName, setCashAccountName] = useState("Imported Cash");
  const [cashMapping, setCashMapping] = useState<CashFieldMapping>({
    date: null,
    amount: null,
    debit: null,
    credit: null,
    type: null,
    description: null,
  });
  const [cashParsed, setCashParsed] = useState<CashParsedTransaction[]>([]);

  const [errors, setErrors] = useState<
    Array<{ row: number; data: Record<string, string>; errors: string[] }>
  >([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    rejected: number;
    duplicates: number;
  } | null>(null);

  // Custom import
  const customInputRef = useRef<HTMLInputElement>(null);
  const [activeCustom, setActiveCustom] = useState<CustomImporter | null>(null);
  const [customBusy, setCustomBusy] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      fileToCsv(file)
        .then((text) => {
          setCsvContent(text);
          const res = parseCsv(text);
          setCsvResult(res);
          setStep(category === "cash" ? "cash-configure" : "configure");
        })
        .catch(() => {
          setErrors([
            {
              row: 0,
              data: {},
              errors: [
                "Failed to read file. Ensure it is a valid CSV or Excel file.",
              ],
            },
          ]);
        });
    },
    [category]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "text/plain": [".txt"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
  });

  function startCategory(cat: ImportCategory) {
    setCategory(cat);
    setSelectedTemplate("");
    setErrors([]);
    setResult(null);
    setStep("upload");
  }

  function handleTemplateSelect(templateId: string) {
    setSelectedTemplate(templateId);
    const template = getTemplate(templateId);
    if (template?.config) {
      setMapping(template.config.mapping);
      setDateFormat(template.config.dateFormat);
      setDecimalSeparator(template.config.decimalSeparator);
    } else if (template?.cashConfig) {
      setCashMapping(template.cashConfig.mapping);
      setDateFormat(template.cashConfig.dateFormat);
      setDecimalSeparator(template.cashConfig.decimalSeparator);
    }
  }

  function handleMapAndReview() {
    if (!csvResult) return;
    const config: ImportConfig = {
      mapping,
      dateFormat,
      decimalSeparator,
      transactionTypeMap: getTemplate(selectedTemplate)?.config?.transactionTypeMap,
    };
    const { transactions, errors: mapErrors } = mapRows(csvResult.rows, config);
    setParsed(transactions);
    setErrors(mapErrors);
    setStep("review");
  }

  function handleCashMapAndReview() {
    if (!csvResult) return;
    const config: CashImportConfig = {
      mapping: cashMapping,
      dateFormat,
      decimalSeparator,
      typeMap: getTemplate(selectedTemplate)?.cashConfig?.typeMap,
    };
    const { transactions, errors: mapErrors } = mapCashRows(
      csvResult.rows,
      config
    );
    setCashParsed(transactions);
    setErrors(mapErrors);
    setStep("cash-review");
  }

  async function handleImport() {
    setImporting(true);
    try {
      const config: ImportConfig = {
        mapping,
        dateFormat,
        decimalSeparator,
        transactionTypeMap: getTemplate(selectedTemplate)?.config?.transactionTypeMap,
      };
      const importResult = await importTransactions(
        portfolioId,
        csvContent,
        config,
        true,
        { template: selectedTemplate || undefined }
      );
      setResult({
        imported: importResult.imported.length,
        rejected: importResult.rejected.length,
        duplicates: importResult.duplicates.length,
      });
      setStep("complete");
      router.refresh();
    } catch {
      setErrors([
        { row: 0, data: {}, errors: ["Import failed. Please try again."] },
      ]);
    } finally {
      setImporting(false);
    }
  }

  async function handleCashImport() {
    setImporting(true);
    try {
      const config: CashImportConfig = {
        mapping: cashMapping,
        dateFormat,
        decimalSeparator,
        typeMap: getTemplate(selectedTemplate)?.cashConfig?.typeMap,
      };
      const importResult = await importCashTransactions(
        portfolioId,
        cashAccountName,
        csvContent,
        config
      );
      setResult({
        imported: importResult.imported.length,
        rejected: importResult.rejected.length,
        duplicates: importResult.duplicates.length,
      });
      setStep("complete");
      router.refresh();
    } catch {
      setErrors([
        { row: 0, data: {}, errors: ["Import failed. Please try again."] },
      ]);
    } finally {
      setImporting(false);
    }
  }

  function pickCustomFile(importer: CustomImporter) {
    setActiveCustom(importer);
    setResult(null);
    setErrors([]);
    customInputRef.current?.click();
  }

  async function handleCustomFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !activeCustom) return;
    const importer = activeCustom;
    setCustomBusy(true);
    try {
      const output = await importer.parse(file);
      if (output.category === "cash" && output.cashTransactions) {
        const res = await importParsedCashTransactions(
          portfolioId,
          output.cashAccountName || importer.name,
          output.cashTransactions
        );
        setResult({
          imported: res.imported.length,
          rejected: output.errors.length,
          duplicates: res.duplicates.length,
        });
      } else if (
        output.category === "bonds" ||
        (output.fees && output.fees.length > 0) ||
        (output.instruments && output.instruments.length > 0)
      ) {
        // Rich bond import: trades + income + fees + instrument metadata
        const res = await importBondData(
          portfolioId,
          {
            transactions: output.transactions || [],
            fees: output.fees,
            instruments: output.instruments,
          },
          { fileName: file.name, template: importer.id }
        );
        setResult({
          imported: res.transactions.imported.length + res.fees.imported,
          rejected: output.errors.length,
          duplicates:
            res.transactions.duplicates.length + res.fees.duplicates,
        });
      } else {
        const res = await importParsedTransactions(
          portfolioId,
          output.transactions || [],
          { fileName: file.name, template: importer.id }
        );
        setResult({
          imported: res.imported.length,
          rejected: output.errors.length,
          duplicates: res.duplicates.length,
        });
      }
      setStep("complete");
      router.refresh();
    } catch {
      setErrors([
        { row: 0, data: {}, errors: [`${importer.name} import failed.`] },
      ]);
    } finally {
      setCustomBusy(false);
      setActiveCustom(null);
    }
  }

  const categoryTemplates = listTemplatesByCategory(category);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {step !== "hub" && step !== "complete" && (
            <button
              onClick={() => setStep("hub")}
              className="rounded-md p-2 hover:bg-accent"
              aria-label="Back to import options"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <h1 className="font-serif text-2xl font-bold">Import</h1>
        </div>
        <Link
          href={`/portfolio/${portfolioId}/import/ai`}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          ✨ AI Import
        </Link>
      </div>

      {/* ── HUB ─────────────────────────────────────────────────────────── */}
      {step === "hub" && (
        <div className="space-y-8">
          {/* Quick import */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h2 className="font-medium">Quick Import</h2>
              <span className="text-xs text-muted-foreground">
                One step — pick a file and it imports immediately
              </span>
            </div>
            <QuickImportButtons
              portfolioId={portfolioId}
              templates={listQuickImportTemplates()}
            />
          </section>

          {/* Guided import by category */}
          <section className="space-y-3">
            <h2 className="font-medium">Guided Import</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <button
                onClick={() => startCategory("transactions")}
                className="flex flex-col items-start gap-2 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent"
              >
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="font-medium">Share Transactions</span>
                <span className="text-xs text-muted-foreground">
                  Buy / sell / dividend statements from any broker
                </span>
              </button>
              <button
                onClick={() => startCategory("bonds")}
                className="flex flex-col items-start gap-2 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent"
              >
                <Landmark className="h-5 w-5 text-primary" />
                <span className="font-medium">Bonds & Fixed Interest</span>
                <span className="text-xs text-muted-foreground">
                  Bond holdings and transactions with coupon / maturity
                </span>
              </button>
              <button
                onClick={() => startCategory("cash")}
                className="flex flex-col items-start gap-2 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent"
              >
                <Banknote className="h-5 w-5 text-primary" />
                <span className="font-medium">Cash / Bank Statement</span>
                <span className="text-xs text-muted-foreground">
                  Deposits, withdrawals, interest into a cash account
                </span>
              </button>
            </div>
          </section>

          {/* Custom importers */}
          {listCustomImporters().length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <FileCog className="h-4 w-4 text-primary" />
                <h2 className="font-medium">Custom Import</h2>
                <span className="text-xs text-muted-foreground">
                  Dedicated routines for complex files (e.g. multi-sheet
                  workbooks)
                </span>
              </div>
              <input
                ref={customInputRef}
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                onChange={handleCustomFile}
                className="hidden"
                aria-hidden="true"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {listCustomImporters().map((c) => (
                  <button
                    key={c.id}
                    onClick={() => pickCustomFile(c)}
                    disabled={customBusy}
                    className="flex flex-col items-start gap-1 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      {customBusy && activeCustom?.id === c.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileCog className="h-4 w-4 text-primary" />
                      )}
                      {c.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {c.description}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {errors.length > 0 && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {errors[0].errors.join(", ")}
            </div>
          )}
        </div>
      )}

      {/* Category label for the guided wizard */}
      {step !== "hub" && step !== "complete" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {CATEGORY_LABELS[category]}
          </span>
        </div>
      )}

      {/* ── UPLOAD ──────────────────────────────────────────────────────── */}
      {step === "upload" && (
        <div
          {...getRootProps()}
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <input {...getInputProps()} aria-label="Upload import file" />
          <Upload className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium">
            Drag & drop a file, or click to browse
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Supports .csv, .txt and .xlsx files
          </p>
        </div>
      )}

      {/* ── CONFIGURE (transactions / bonds) ────────────────────────────── */}
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
              <label htmlFor={`${formId}-template`} className="text-sm font-medium">
                Template
              </label>
              <select
                id={`${formId}-template`}
                value={selectedTemplate}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Custom / Manual mapping</option>
                {categoryTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor={`${formId}-date-format`} className="text-sm font-medium">
                  Date Format
                </label>
                <select
                  id={`${formId}-date-format`}
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                  <option value="mm/dd/yyyy">MM/DD/YYYY</option>
                  <option value="yyyy-mm-dd">YYYY-MM-DD</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor={`${formId}-decimal-separator`}
                  className="text-sm font-medium"
                >
                  Decimal Separator
                </label>
                <select
                  id={`${formId}-decimal-separator`}
                  value={decimalSeparator}
                  onChange={(e) => setDecimalSeparator(e.target.value)}
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

      {/* ── MAP (transactions / bonds) ──────────────────────────────────── */}
      {step === "map" && csvResult && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-medium">Map Columns</h2>
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

      {/* ── REVIEW (transactions / bonds) ───────────────────────────────── */}
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

          <ImportReviewTable transactions={parsed} errors={errors} duplicates={[]} />

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

      {/* ── CASH CONFIGURE ──────────────────────────────────────────────── */}
      {step === "cash-configure" && csvResult && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-medium">File Detected</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {csvResult.rowCount} rows, {csvResult.headers.length} columns
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor={`${formId}-cash-account-name`}
                className="text-sm font-medium"
              >
                Cash Account Name
              </label>
              <input
                id={`${formId}-cash-account-name`}
                value={cashAccountName}
                onChange={(e) => setCashAccountName(e.target.value)}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Transactions are added to this account (created if it does not
                exist).
              </p>
            </div>

            <div>
              <label
                htmlFor={`${formId}-cash-template`}
                className="text-sm font-medium"
              >
                Template
              </label>
              <select
                id={`${formId}-cash-template`}
                value={selectedTemplate}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Custom / Manual mapping</option>
                {categoryTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <CashColumnSelect
                label="Date"
                value={cashMapping.date}
                headers={csvResult.headers}
                onChange={(v) => setCashMapping({ ...cashMapping, date: v })}
              />
              <CashColumnSelect
                label="Amount (signed)"
                value={cashMapping.amount ?? null}
                headers={csvResult.headers}
                onChange={(v) => setCashMapping({ ...cashMapping, amount: v })}
              />
              <CashColumnSelect
                label="Debit (money out)"
                value={cashMapping.debit ?? null}
                headers={csvResult.headers}
                onChange={(v) => setCashMapping({ ...cashMapping, debit: v })}
              />
              <CashColumnSelect
                label="Credit (money in)"
                value={cashMapping.credit ?? null}
                headers={csvResult.headers}
                onChange={(v) => setCashMapping({ ...cashMapping, credit: v })}
              />
              <CashColumnSelect
                label="Type (optional)"
                value={cashMapping.type ?? null}
                headers={csvResult.headers}
                onChange={(v) => setCashMapping({ ...cashMapping, type: v })}
              />
              <CashColumnSelect
                label="Description (optional)"
                value={cashMapping.description ?? null}
                headers={csvResult.headers}
                onChange={(v) =>
                  setCashMapping({ ...cashMapping, description: v })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor={`${formId}-cash-date-format`}
                  className="text-sm font-medium"
                >
                  Date Format
                </label>
                <select
                  id={`${formId}-cash-date-format`}
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                  <option value="mm/dd/yyyy">MM/DD/YYYY</option>
                  <option value="yyyy-mm-dd">YYYY-MM-DD</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor={`${formId}-cash-decimal-separator`}
                  className="text-sm font-medium"
                >
                  Decimal Separator
                </label>
                <select
                  id={`${formId}-cash-decimal-separator`}
                  value={decimalSeparator}
                  onChange={(e) => setDecimalSeparator(e.target.value)}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value=".">Period (.)</option>
                  <option value=",">Comma (,)</option>
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={handleCashMapAndReview}
            disabled={
              !cashMapping.date ||
              (!cashMapping.amount && !cashMapping.debit && !cashMapping.credit)
            }
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Next: Review
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── CASH REVIEW ─────────────────────────────────────────────────── */}
      {step === "cash-review" && (
        <div className="space-y-6">
          <div className="flex gap-4 text-sm">
            <span className="rounded-md bg-success/10 px-3 py-1 text-success">
              {cashParsed.length} valid
            </span>
            <span className="rounded-md bg-destructive/10 px-3 py-1 text-destructive">
              {errors.length} errors
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    Description
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cashParsed.slice(0, 100).map((t, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2">
                      {t.date.toISOString().split("T")[0]}
                    </td>
                    <td className="px-4 py-2 capitalize">
                      {t.type.replace("_", " ")}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {t.description}
                    </td>
                    <td className="px-4 py-2 text-right">${t.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("cash-configure")}
              className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={handleCashImport}
              disabled={importing || cashParsed.length === 0}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {importing
                ? "Importing..."
                : `Import ${cashParsed.length} transactions`}
            </button>
          </div>
        </div>
      )}

      {/* ── COMPLETE ────────────────────────────────────────────────────── */}
      {step === "complete" && result && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <Check className="mx-auto h-12 w-12 text-success" />
            <h2 className="mt-4 text-xl font-medium">Import Complete</h2>
            <div className="mt-4 flex justify-center gap-6 text-sm">
              <div>
                <p className="text-2xl font-bold text-success">
                  {result.imported}
                </p>
                <p className="text-muted-foreground">Imported</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">
                  {result.rejected}
                </p>
                <p className="text-muted-foreground">Rejected</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">
                  {result.duplicates}
                </p>
                <p className="text-muted-foreground">Duplicates skipped</p>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setResult(null);
                setStep("hub");
              }}
              className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Import More
            </button>
            <Link
              href={`/portfolio/${portfolioId}`}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              View Portfolio
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function CashColumnSelect({
  label,
  value,
  headers,
  onChange,
}: {
  label: string;
  value: string | null;
  headers: string[];
  onChange: (value: string | null) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
      >
        <option value="">— None —</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </div>
  );
}
