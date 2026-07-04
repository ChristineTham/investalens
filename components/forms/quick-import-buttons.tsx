"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fileToCsv } from "@/lib/import/file-to-csv";
import { getTemplate } from "@/lib/import/templates";
import {
  quickImportTransactions,
  importCashTransactions,
} from "@/lib/actions/import";
import type { ImportTemplate } from "@/lib/import/types";
import { Loader2, Check, Zap } from "lucide-react";

interface QuickImportButtonsProps {
  portfolioId: string;
  templates: ImportTemplate[];
}

interface QuickResult {
  templateName: string;
  imported: number;
  duplicates: number;
  rejected: number;
}

export function QuickImportButtons({
  portfolioId,
  templates,
}: QuickImportButtonsProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeTemplate, setActiveTemplate] = useState<ImportTemplate | null>(
    null
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [result, setResult] = useState<QuickResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pickFile(template: ImportTemplate) {
    setResult(null);
    setError(null);
    setActiveTemplate(template);
    inputRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file || !activeTemplate) return;

    const template = activeTemplate;
    setBusyId(template.id);
    setResult(null);
    setError(null);

    try {
      const csv = await fileToCsv(file);

      if (template.category === "cash") {
        const cashConfig = template.cashConfig;
        if (!cashConfig) throw new Error("Missing cash config");
        const res = await importCashTransactions(
          portfolioId,
          template.name,
          csv,
          cashConfig
        );
        setResult({
          templateName: template.name,
          imported: res.imported.length,
          duplicates: res.duplicates.length,
          rejected: res.rejected.length,
        });
      } else {
        const config = getTemplate(template.id)?.config;
        if (!config) throw new Error("Missing template config");
        const res = await quickImportTransactions(
          portfolioId,
          csv,
          config,
          template.id,
          file.name
        );
        setResult({
          templateName: template.name,
          imported: res.imported.length,
          duplicates: res.duplicates.length,
          rejected: res.rejected.length,
        });
      }
      router.refresh();
    } catch {
      setError(`Failed to import ${template.name}. Check the file format.`);
    } finally {
      setBusyId(null);
      setActiveTemplate(null);
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.txt,.xlsx,.xls"
        onChange={handleFile}
        className="hidden"
        aria-hidden="true"
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => pickFile(t)}
            disabled={busyId !== null}
            title={t.description}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
          >
            {busyId === t.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 text-primary" />
            )}
            {t.name}
          </button>
        ))}
      </div>

      {result && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success"
        >
          <Check className="h-4 w-4" />
          {result.templateName}: {result.imported} imported
          {result.duplicates > 0 && `, ${result.duplicates} duplicates skipped`}
          {result.rejected > 0 && `, ${result.rejected} rejected`}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}
    </div>
  );
}
