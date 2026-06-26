"use client";

export type AnalyticsSource = "portfolio" | "model";

export interface SourceValue {
  source: AnalyticsSource;
  id: string;
}

interface SourcePickerProps {
  portfolios: { id: string; name: string }[];
  models: { id: string; name: string }[];
  value: SourceValue;
  onChange: (value: SourceValue) => void;
  label?: string;
}

/**
 * Segmented `Portfolio | Model` control plus a dependent dropdown. Lets any
 * analytics page analyse a real portfolio OR a model portfolio — both resolve
 * to the same returns-matrix shape via the shared matrix route.
 */
export function SourcePicker({
  portfolios,
  models,
  value,
  onChange,
  label = "Source",
}: SourcePickerProps) {
  const list = value.source === "model" ? models : portfolios;

  function setSource(source: AnalyticsSource) {
    if (source === value.source) return;
    const next = source === "model" ? models : portfolios;
    onChange({ source, id: next[0]?.id ?? "" });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <span className="text-sm font-medium">{label}</span>
        <div className="mt-1 flex rounded-md border border-input">
          <button
            type="button"
            onClick={() => setSource("portfolio")}
            disabled={portfolios.length === 0}
            className={`rounded-l-md px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40 ${
              value.source === "portfolio"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            Portfolio
          </button>
          <button
            type="button"
            onClick={() => setSource("model")}
            disabled={models.length === 0}
            className={`rounded-r-md px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40 ${
              value.source === "model"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            Model
          </button>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="source-select">
          {value.source === "model" ? "Model" : "Portfolio"}
        </label>
        <select
          id="source-select"
          className="mt-1 block rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={value.id}
          onChange={(e) => onChange({ source: value.source, id: e.target.value })}
        >
          {list.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
