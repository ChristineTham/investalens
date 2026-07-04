"use client";

import { CHART_RANGE_OPTIONS, type ChartRange } from "@/lib/constants/chart-ranges";
import { useChartRange } from "@/lib/stores/chart-range";

interface RangeSelectorProps {
  value: ChartRange;
  onChange: (range: ChartRange) => void;
  /** Optional label shown before the buttons. */
  label?: string;
}

/**
 * Universal timescale selector shared by the dashboard and portfolio-detail
 * charts. Includes calendar/financial-year ranges (YTD, FYTD, previous FY).
 */
export function RangeSelector({ value, onChange, label }: RangeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <div className="flex flex-wrap rounded-md border border-border">
        {CHART_RANGE_OPTIONS.map((opt, i) => (
          <button
            key={opt.value}
            type="button"
            title={opt.title}
            aria-pressed={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
              value === opt.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            } ${i === 0 ? "rounded-l-md" : ""} ${
              i === CHART_RANGE_OPTIONS.length - 1 ? "rounded-r-md" : ""
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * `RangeSelector` bound to the global, persisted timescale store. Drop this in
 * anywhere and every page's range stays in sync. Read the same value with
 * `useChartRange()` to drive the page's data fetch.
 */
export function GlobalRangeSelector({ label }: { label?: string }) {
  const [range, setRange] = useChartRange();
  return <RangeSelector value={range} onChange={setRange} label={label} />;
}
