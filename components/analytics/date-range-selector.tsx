"use client";

import { useEffect } from "react";
import { useChartRange, useChartRangeStore } from "@/lib/stores/chart-range";
import type { ChartRange } from "@/lib/constants/chart-ranges";

const DATE_RANGES = [
  { value: "1Y", label: "1 Year" },
  { value: "3Y", label: "3 Years" },
  { value: "5Y", label: "5 Years" },
  { value: "10Y", label: "10 Years" },
  { value: "MAX", label: "Max" },
] as const;

export type DateRange = "1Y" | "3Y" | "5Y" | "10Y" | "MAX";

interface DateRangeSelectorProps {
  selected: DateRange;
  onChange: (range: DateRange) => void;
}

/** Map the broader global ChartRange onto this selector's coarser options. */
function toDateRange(r: ChartRange): DateRange {
  return r === "3Y" || r === "5Y" || r === "10Y" || r === "MAX" ? r : "1Y";
}

/**
 * Analytics timescale selector, bound to the **global** range store so a choice
 * here applies to the dashboard/portfolio charts too (and vice versa). Pages
 * keep their own default until the shared range is deliberately set somewhere,
 * after which it propagates everywhere.
 */
export function DateRangeSelector({
  selected,
  onChange,
}: DateRangeSelectorProps) {
  const [globalRange, setGlobalRange] = useChartRange();
  const touched = useChartRangeStore((s) => s.touched);

  // Adopt the shared range once the user has set it anywhere.
  useEffect(() => {
    if (!touched) return;
    const mapped = toDateRange(globalRange);
    if (mapped !== selected) onChange(mapped);
    // We only want to react to changes in the shared range.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalRange, touched]);

  return (
    <div className="flex items-center gap-1 rounded-md border border-input p-0.5">
      {DATE_RANGES.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
            selected === value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setGlobalRange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
