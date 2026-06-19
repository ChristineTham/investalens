"use client";

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

export function DateRangeSelector({
  selected,
  onChange,
}: DateRangeSelectorProps) {
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
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
