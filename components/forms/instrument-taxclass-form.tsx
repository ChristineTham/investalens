"use client";

import { useState } from "react";
import {
  updateInstrumentTaxClass,
  type TaxClassOverride,
} from "@/lib/actions/instrument";

interface InstrumentTaxClassFormProps {
  instrumentId: string;
  value: string | null;
}

export function InstrumentTaxClassForm({
  instrumentId,
  value,
}: InstrumentTaxClassFormProps) {
  const [val, setVal] = useState(value ?? "auto");
  const [saving, setSaving] = useState(false);

  async function handleChange(next: string) {
    const previous = val;
    setVal(next);
    setSaving(true);
    try {
      const override: TaxClassOverride =
        next === "auto" ? null : (next as "cgt" | "income");
      await updateInstrumentTaxClass(instrumentId, override);
    } catch {
      setVal(previous); // revert on failure
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={val}
      disabled={saving}
      onChange={(e) => handleChange(e.target.value)}
      className="h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
      aria-label="Tax treatment"
    >
      <option value="auto">Auto</option>
      <option value="cgt">CGT</option>
      <option value="income">Income</option>
    </select>
  );
}
