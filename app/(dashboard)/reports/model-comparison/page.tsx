import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getModelsForUser } from "@/lib/services/model-list";
import {
  getConsolidatedValueSeries,
  getModelValueSeries,
} from "@/lib/services/model-analytics";
import { buildComparison } from "@/lib/services/model-compare";
import {
  totalReturn,
  cagr,
  maxDrawdown,
  annualisedVol,
} from "@/lib/calculations/series-metrics";
import { MultiLineChart } from "@/components/charts/multi-line-chart";
import { holdingColor } from "@/lib/constants/chart-colors";
import { formatPercent } from "@/lib/utils";
import { ModelComparisonControls } from "./model-comparison-controls";

export const metadata: Metadata = {
  title: "Model Comparison",
};

type Range = "1Y" | "3Y" | "5Y" | "10Y" | "MAX";
const RANGES: Range[] = ["1Y", "3Y", "5Y", "10Y", "MAX"];
const RANGE_YEARS: Record<Range, number> = {
  "1Y": 1,
  "3Y": 3,
  "5Y": 5,
  "10Y": 10,
  MAX: 0,
};

function dateRangeToFrom(range: Range): Date {
  if (range === "MAX") return new Date(2000, 0, 1);
  const now = new Date();
  now.setFullYear(now.getFullYear() - parseInt(range, 10));
  return now;
}

export default async function ModelComparisonReportPage({
  searchParams,
}: {
  searchParams: Promise<{ model?: string; range?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sp = await searchParams;
  const models = await getModelsForUser(session.user.id);

  if (models.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-bold">Model Comparison</h1>
        <p className="text-muted-foreground">No models available.</p>
      </div>
    );
  }

  const range: Range = RANGES.includes(sp.range as Range)
    ? (sp.range as Range)
    : "3Y";
  const modelId = models.some((m) => m.id === sp.model)
    ? sp.model!
    : models[0].id;
  const model = models.find((m) => m.id === modelId)!;

  const from = dateRangeToFrom(range);
  const consolidated = await getConsolidatedValueSeries(session.user.id, range);
  const { valueSeries } = await getModelValueSeries(modelId, { from });
  const dataset = buildComparison(consolidated, [
    { id: modelId, name: model.name, valueSeries },
  ]);

  // Per-series chart data + metrics.
  const series = dataset.series.map((s, i) => {
    const c = holdingColor(i);
    return {
      key: s.key,
      colorVar: c.var,
      colorSwatch: c.swatch,
      values: dataset.points.map((p) =>
        typeof p[s.key] === "number" ? (p[s.key] as number) : NaN
      ),
    };
  });
  const dates = dataset.points.map((p) => String(p.date));

  const years = RANGE_YEARS[range] || Math.max(1, dataset.points.length / 252);
  const stats = dataset.series.map((s) => {
    const values = dataset.points
      .map((p) => p[s.key])
      .filter((v): v is number => typeof v === "number");
    return {
      key: s.key,
      totalReturn: totalReturn(values),
      cagr: cagr(values, years),
      maxDrawdown: maxDrawdown(values),
      vol: annualisedVol(values),
    };
  });

  const hasConsolidated = consolidated.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">Model Comparison</h1>
          <p className="text-sm text-muted-foreground">
            How your money would have performed in {model.name} vs your actual
            portfolio over the selected period (rebased to a common start).
          </p>
        </div>
        <ModelComparisonControls
          models={models.map((m) => ({ id: m.id, name: m.name }))}
          modelId={modelId}
          range={range}
        />
      </div>

      {!hasConsolidated && (
        <p className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          You have no holdings yet — the report shows the model only.
        </p>
      )}

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium">Value over time</h2>
        <MultiLineChart dates={dates} series={series} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Series</th>
              <th className="px-3 py-2 text-right font-medium">Total return</th>
              <th className="px-3 py-2 text-right font-medium">CAGR</th>
              <th className="px-3 py-2 text-right font-medium">Max drawdown</th>
              <th className="px-3 py-2 text-right font-medium">Volatility</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.key} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{s.key}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatPercent(s.totalReturn * 100)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatPercent(s.cagr * 100)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatPercent(s.maxDrawdown * 100)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatPercent(s.vol * 100)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
