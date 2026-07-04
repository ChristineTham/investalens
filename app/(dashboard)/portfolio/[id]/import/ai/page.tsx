"use client";

import { useState, use } from "react";
import { Upload, Loader2, Check, FileText } from "lucide-react";

interface ParsedTransaction {
  tradeDate: string;
  instrumentCode: string;
  marketCode: string;
  transactionType: string;
  quantity: number;
  price: number;
  brokerage: number;
  currency: string;
  comments?: string;
}

interface AIImportResult {
  transactions: ParsedTransaction[];
  warnings: string[];
}

type Step = "upload" | "parsing" | "review" | "importing" | "complete";

export default function AIImportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: portfolioId } = use(params);
  const [step, setStep] = useState<Step>("upload");
  const [content, setContent] = useState("");
  const [documentType, setDocumentType] = useState("contract_note");
  const [result, setResult] = useState<AIImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importCount, setImportCount] = useState(0);

  async function handleParse() {
    if (!content.trim()) return;
    setStep("parsing");
    setError(null);

    try {
      const res = await fetch("/api/v1/ai-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, documentType }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "AI parsing failed");
      }

      const data = await res.json();
      setResult(data.data || data);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse document");
      setStep("upload");
    }
  }

  async function handleImport() {
    if (!result?.transactions.length) return;
    setStep("importing");

    try {
      const { importTransactions } = await import("@/lib/actions/import");

      // Convert AI result to CSV format for the existing import pipeline
      const headers = [
        "Date",
        "Code",
        "Market",
        "Type",
        "Quantity",
        "Price",
        "Brokerage",
        "Currency",
      ];
      const rows = result.transactions.map((tx) =>
        [
          tx.tradeDate,
          tx.instrumentCode,
          tx.marketCode,
          tx.transactionType,
          String(tx.quantity),
          String(tx.price),
          String(tx.brokerage),
          tx.currency,
        ].join(",")
      );
      const csv = [headers.join(","), ...rows].join("\n");

      const importResult = await importTransactions(portfolioId, csv, {
        dateFormat: "yyyy-mm-dd",
        decimalSeparator: ".",
        mapping: {
          tradeDate: "Date",
          instrumentCode: "Code",
          marketCode: "Market",
          transactionType: "Type",
          quantity: "Quantity",
          price: "Price",
          brokerage: "Brokerage",
          currency: "Currency",
        },
      });

      setImportCount(importResult.imported.length);
      setStep("complete");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
      setStep("review");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">AI Import</h1>
        <p className="text-muted-foreground">
          Paste contract notes, statements, or trade confirmations and let AI
          extract the transactions.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-destructive/10 text-destructive rounded-lg p-4"
        >
          {error}
        </div>
      )}

      {step === "upload" && (
        <div className="space-y-4">
          <div>
            <label htmlFor="doc-type" className="text-sm font-medium">Document Type</label>
            <select
              id="doc-type"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="bg-background border-input mt-1 block w-full rounded-md border px-3 py-2"
            >
              <option value="contract_note">Contract Note</option>
              <option value="trade_confirmation">Trade Confirmation</option>
              <option value="dividend_statement">Dividend Statement</option>
              <option value="holding_statement">Holding Statement</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="doc-content" className="text-sm font-medium">
              Paste document content
            </label>
            <textarea
              id="doc-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your contract note, trade confirmation, or statement text here..."
              className="bg-background border-input mt-1 block w-full rounded-md border px-3 py-2 font-mono text-sm"
              rows={12}
            />
          </div>

          <button
            onClick={handleParse}
            disabled={!content.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            Parse with AI
          </button>
        </div>
      )}

      {step === "parsing" && (
        <div className="flex items-center gap-3 py-12 text-center">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>AI is parsing your document...</span>
        </div>
      )}

      {step === "review" && result && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Parsed {result.transactions.length} transaction
            {result.transactions.length !== 1 ? "s" : ""}
          </h2>

          {result.warnings.length > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Warnings:
              </p>
              <ul className="mt-1 list-inside list-disc text-sm text-yellow-700 dark:text-yellow-300">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Market</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Price</th>
                  <th className="px-3 py-2 text-right">Brokerage</th>
                  <th className="px-3 py-2 text-left">Currency</th>
                </tr>
              </thead>
              <tbody>
                {result.transactions.map((tx, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{tx.tradeDate}</td>
                    <td className="px-3 py-2 font-mono">{tx.instrumentCode}</td>
                    <td className="px-3 py-2">{tx.marketCode}</td>
                    <td className="px-3 py-2">{tx.transactionType}</td>
                    <td className="px-3 py-2 text-right">{tx.quantity}</td>
                    <td className="px-3 py-2 text-right">
                      ${tx.price.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      ${tx.brokerage.toFixed(2)}
                    </td>
                    <td className="px-3 py-2">{tx.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("upload")}
              className="border-input rounded-md border px-4 py-2"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2"
            >
              <Upload className="h-4 w-4" />
              Import {result.transactions.length} transactions
            </button>
          </div>
        </div>
      )}

      {step === "importing" && (
        <div className="flex items-center gap-3 py-12 text-center">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Importing transactions...</span>
        </div>
      )}

      {step === "complete" && (
        <div className="space-y-4 py-8 text-center">
          <div className="bg-primary/10 text-primary mx-auto flex h-12 w-12 items-center justify-center rounded-full">
            <Check className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold">Import Complete</h2>
          <p className="text-muted-foreground">
            Successfully imported {importCount} transactions.
          </p>
          <a
            href={`/portfolio/${portfolioId}`}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-block rounded-md px-4 py-2"
          >
            View Portfolio
          </a>
        </div>
      )}
    </div>
  );
}
