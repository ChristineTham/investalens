"use client";

import { useRouter } from "next/navigation";

type Range = "1Y" | "3Y" | "5Y" | "10Y" | "MAX";
const RANGES: Range[] = ["1Y", "3Y", "5Y", "10Y", "MAX"];

export function ModelComparisonControls({
  models,
  modelId,
  range,
}: {
  models: { id: string; name: string }[];
  modelId: string;
  range: Range;
}) {
  const router = useRouter();

  function push(next: { model?: string; range?: string }) {
    const params = new URLSearchParams();
    params.set("model", next.model ?? modelId);
    params.set("range", next.range ?? range);
    router.push(`/reports/model-comparison?${params.toString()}`);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3 print:hidden">
      <select
        aria-label="Model"
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        value={modelId}
        onChange={(e) => push({ model: e.target.value })}
      >
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <div className="flex rounded-md border border-border">
        {RANGES.map((r, i) => (
          <button
            key={r}
            type="button"
            aria-pressed={range === r}
            onClick={() => push({ range: r })}
            className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
              range === r
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            } ${i === 0 ? "rounded-l-md" : ""} ${
              i === RANGES.length - 1 ? "rounded-r-md" : ""
            }`}
          >
            {r === "MAX" ? "All" : r}
          </button>
        ))}
      </div>
    </div>
  );
}
