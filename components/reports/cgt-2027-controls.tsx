"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { INCOME_BANDS } from "@/lib/calculations/income-tax";

interface Cgt2027ControlsProps {
  enabled: boolean;
  incomeIndex: number;
  /** True when no single portfolio is selected (projection needs one). */
  disabled?: boolean;
}

export function Cgt2027Controls({
  enabled,
  incomeIndex,
  disabled,
}: Cgt2027ControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setParam("proj", e.target.checked ? "1" : null)}
          className="h-4 w-4 rounded border-input"
        />
        Show proposed 2027 regime projection
      </label>

      {enabled && (
        <div className="flex items-center gap-2">
          <label
            htmlFor="cgt-income"
            className="text-sm text-muted-foreground"
          >
            Your other taxable income:
          </label>
          <select
            id="cgt-income"
            value={incomeIndex}
            disabled={disabled}
            onChange={(e) => setParam("income", e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
          >
            {INCOME_BANDS.map((b, i) => (
              <option key={b.label} value={i}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
