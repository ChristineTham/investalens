"use client";

import { useId } from "react";
import type { FieldMapping } from "@/lib/import/types";

interface FieldMapperProps {
  headers: string[];
  mapping: FieldMapping;
  onMappingChange: (mapping: FieldMapping) => void;
}

const FIELDS: Array<{
  key: keyof FieldMapping;
  label: string;
  required: boolean;
}> = [
  { key: "tradeDate", label: "Trade Date", required: true },
  { key: "instrumentCode", label: "Instrument Code", required: true },
  { key: "quantity", label: "Quantity", required: true },
  { key: "price", label: "Price", required: true },
  { key: "transactionType", label: "Transaction Type", required: true },
  { key: "marketCode", label: "Market/Exchange", required: false },
  { key: "brokerage", label: "Brokerage", required: false },
  { key: "currency", label: "Currency", required: false },
  { key: "exchangeRate", label: "Exchange Rate", required: false },
  { key: "comments", label: "Comments/Notes", required: false },
  {
    key: "combinedCode",
    label: "Combined Code (e.g. TLS.ASX)",
    required: false,
  },
];

export function FieldMapper({
  headers,
  mapping,
  onMappingChange,
}: FieldMapperProps) {
  const baseId = useId();

  function handleChange(key: keyof FieldMapping, value: string) {
    onMappingChange({
      ...mapping,
      [key]: value || null,
    });
  }

  return (
    <div className="space-y-3">
      {FIELDS.map((field) => (
        <div key={field.key} className="flex items-center gap-4">
          <label
            htmlFor={`${baseId}-${field.key}`}
            className="w-48 text-sm font-medium"
          >
            {field.label}
            {field.required && <span className="text-destructive"> *</span>}
          </label>
          <select
            id={`${baseId}-${field.key}`}
            value={mapping[field.key] || ""}
            onChange={(e) => handleChange(field.key, e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <option value="">— Skip —</option>
            {headers.map((header) => (
              <option key={header} value={header}>
                {header}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
