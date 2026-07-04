import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";
import { db } from "@/lib/db";
import {
  getConsolidatedValueSeries,
  getModelValueSeries,
} from "@/lib/services/model-analytics";
import { buildComparison } from "@/lib/services/model-compare";
import { totalReturn } from "@/lib/calculations/series-metrics";
import { holdingColor } from "@/lib/constants/chart-colors";
import { MultiLineChart } from "@/components/charts/multi-line-chart";
import { DashboardModelPicker } from "@/components/dashboard/dashboard-model-picker";
import { formatPercent } from "@/lib/utils";

/** Default comparison model slug (seeded system model). */
const DEFAULT_MODEL_SLUG = "blend-balanced";

/**
 * Compact dashboard teaser overlaying the consolidated value series against the
 * user's chosen comparison model (persisted on User.dashboardModelId, falling
 * back to a seeded default), scaled to a common start and linking to /models.
 * Renders nothing when no model is seeded or the user has no holdings.
 */
export async function VsModelCard({ userId }: { userId: string }) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { dashboardModelId: true },
  });

  // Preferred model (if still visible), else default slug, else any system model.
  const preferred = user?.dashboardModelId
    ? await db.modelPortfolio.findFirst({
        where: {
          id: user.dashboardModelId,
          OR: [{ userId }, { userId: null }],
        },
        select: { id: true, name: true },
      })
    : null;
  const model =
    preferred ??
    (await db.modelPortfolio.findFirst({
      where: { isSystem: true, slug: DEFAULT_MODEL_SLUG },
      select: { id: true, name: true },
    })) ??
    (await db.modelPortfolio.findFirst({
      where: { isSystem: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }));
  if (!model) return null;

  const range = "1Y" as const;
  const from = new Date();
  from.setFullYear(from.getFullYear() - 1);

  const consolidated = await getConsolidatedValueSeries(userId, range);
  if (consolidated.length === 0) return null;

  const { valueSeries } = await getModelValueSeries(model.id, { from });
  const dataset = buildComparison(consolidated, [
    { id: model.id, name: model.name, valueSeries },
  ]);

  const dates = dataset.points.map((p) => String(p.date));
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

  // Headline: relative 1Y return of consolidated vs the model.
  const ret = (key: string) =>
    totalReturn(
      dataset.points
        .map((p) => p[key])
        .filter((v): v is number => typeof v === "number")
    );
  const youReturn = ret("Consolidated");
  const modelReturn = ret(model.name);
  const delta = (youReturn - modelReturn) * 100;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-sm font-medium">You vs {model.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <DashboardModelPicker currentId={model.id} />
          <Link
            href="/models"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Compare models
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        1-year, rebased to a common start.{" "}
        <span
          className={
            delta >= 0 ? "text-gain" : "text-loss"
          }
        >
          {delta >= 0 ? "Ahead" : "Behind"} by {formatPercent(Math.abs(delta))}
        </span>
      </p>
      <div className="mt-3">
        <MultiLineChart dates={dates} series={series} height={180} />
      </div>
    </div>
  );
}
