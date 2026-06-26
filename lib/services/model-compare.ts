import type { ValuePoint } from "@/components/charts/portfolio-chart-utils";
import { holdingColor } from "@/lib/constants/chart-colors";

export interface CompareSeries {
  key: string; // "Consolidated" | model name
  modelId?: string;
  colorVar: string;
  colorSwatch: string;
}

export interface CompareDataset {
  series: CompareSeries[];
  // [{ date, Consolidated: number, "Vanguard Balanced": number, ... }]
  points: Array<Record<string, string | number>>;
  baseValue: number; // consolidated value at t0 (the common start)
}

/** Consolidated line colour — the user's real portfolio. */
const CONSOLIDATED_COLOR = { var: "var(--rosely14)", swatch: "bg-[var(--rosely14)]" };

/** First model value found on the consolidated date grid (model value at t0). */
function firstNonNull(dates: string[], map: Map<string, number>): number | null {
  for (const d of dates) {
    const v = map.get(d);
    if (v != null) return v;
  }
  return null;
}

/** Look up a model's value at grid index `i`, forward-filling gaps. */
function lookupForwardFilled(
  map: Map<string, number>,
  dates: string[],
  i: number
): number | null {
  for (let j = i; j >= 0; j--) {
    const v = map.get(dates[j]);
    if (v != null) return v;
  }
  return null;
}

/**
 * Align all series on the consolidated date grid and scale each model so that
 * model(t0) == consolidated(t0). scale = consolidated[t0] / model[t0].
 */
export function buildComparison(
  consolidated: ValuePoint[],
  models: Array<{ id: string; name: string; valueSeries: ValuePoint[] }>
): CompareDataset {
  if (consolidated.length === 0) {
    // No consolidated portfolio — rebase models against each other so the chart
    // still renders (each model starts at its own first value).
    return buildModelsOnly(models);
  }

  const dates = consolidated.map((p) => p.date);
  const baseValue = Number(consolidated[0].Total);

  const modelMaps = models.map((m) => {
    const map = new Map(m.valueSeries.map((p) => [p.date, Number(p.Total)]));
    const firstOnGrid = firstNonNull(dates, map);
    const scale = firstOnGrid ? baseValue / firstOnGrid : 1;
    return { ...m, map, scale };
  });

  const points = dates.map((date, i) => {
    const row: Record<string, string | number> = {
      date,
      Consolidated: Number(consolidated[i].Total),
    };
    for (const m of modelMaps) {
      const raw = lookupForwardFilled(m.map, dates, i);
      if (raw != null) row[m.name] = raw * m.scale;
    }
    return row;
  });

  const series: CompareSeries[] = [
    {
      key: "Consolidated",
      colorVar: CONSOLIDATED_COLOR.var,
      colorSwatch: CONSOLIDATED_COLOR.swatch,
    },
    ...models.map((m, idx) => {
      const c = holdingColor(idx + 1);
      return {
        key: m.name,
        modelId: m.id,
        colorVar: c.var,
        colorSwatch: c.swatch,
      };
    }),
  ];

  return { series, points, baseValue };
}

/** Fallback when the user has no holdings: rebase every model to a common base. */
function buildModelsOnly(
  models: Array<{ id: string; name: string; valueSeries: ValuePoint[] }>
): CompareDataset {
  if (models.length === 0) return { series: [], points: [], baseValue: 0 };

  // Use the longest model's date grid as the shared axis.
  const grid = [...models].sort(
    (a, b) => b.valueSeries.length - a.valueSeries.length
  )[0].valueSeries;
  const dates = grid.map((p) => p.date);
  const baseValue = 100;

  const modelMaps = models.map((m) => {
    const map = new Map(m.valueSeries.map((p) => [p.date, Number(p.Total)]));
    const firstOnGrid = firstNonNull(dates, map);
    const scale = firstOnGrid ? baseValue / firstOnGrid : 1;
    return { ...m, map, scale };
  });

  const points = dates.map((date, i) => {
    const row: Record<string, string | number> = { date };
    for (const m of modelMaps) {
      const raw = lookupForwardFilled(m.map, dates, i);
      if (raw != null) row[m.name] = raw * m.scale;
    }
    return row;
  });

  const series: CompareSeries[] = models.map((m, idx) => {
    const c = holdingColor(idx + 1);
    return {
      key: m.name,
      modelId: m.id,
      colorVar: c.var,
      colorSwatch: c.swatch,
    };
  });

  return { series, points, baseValue };
}
