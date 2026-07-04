"use client";

import { useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CompareDataset } from "@/lib/services/model-compare";
import {
  totalReturn,
  cagr,
  maxDrawdown,
  annualisedVol,
} from "@/lib/calculations/series-metrics";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

type DashboardRange = "1Y" | "3Y" | "5Y" | "10Y" | "MAX";
const RANGES: DashboardRange[] = ["1Y", "3Y", "5Y", "10Y", "MAX"];

const RANGE_YEARS: Record<DashboardRange, number> = {
  "1Y": 1,
  "3Y": 3,
  "5Y": 5,
  "10Y": 10,
  MAX: 0, // computed from the series span
};

interface ModelLite {
  id: string;
  name: string;
  category: string;
  isSystem: boolean;
}

interface ModelsClientProps {
  models: ModelLite[];
  dataset: CompareDataset;
  range: DashboardRange;
  selectedIds: string[];
  currency: string;
  hasConsolidated: boolean;
}

function CompareTooltip({
  active,
  payload,
  label,
  currency,
  swatchByKey,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number; color?: string }[];
  label?: string;
  currency: string;
  swatchByKey: Record<string, string>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const consolidated = payload.find((p) => p.dataKey === "Consolidated")?.value;
  return (
    <div className="rounded-md border border-border bg-card p-2.5 text-xs shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      <ul className="space-y-0.5">
        {payload
          .filter((p) => p.value != null)
          .map((p) => {
            const delta =
              consolidated && p.dataKey !== "Consolidated" && consolidated !== 0
                ? (Number(p.value) / consolidated - 1) * 100
                : null;
            return (
              <li key={String(p.dataKey)} className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-sm",
                    swatchByKey[String(p.dataKey)]
                  )}
                  aria-hidden
                />
                <span className="truncate">{String(p.dataKey)}</span>
                <span className="ml-auto tabular-nums">
                  {formatCurrency(Number(p.value), currency)}
                </span>
                {delta != null && (
                  <span
                    className={cn(
                      "tabular-nums",
                      delta >= 0
                        ? "text-emerald-600 dark:text-emerald-500"
                        : "text-destructive"
                    )}
                  >
                    {formatPercent(delta)}
                  </span>
                )}
              </li>
            );
          })}
      </ul>
    </div>
  );
}

export function ModelsClient({
  models,
  dataset,
  range,
  selectedIds,
  currency,
  hasConsolidated,
}: ModelsClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pushParams(next: { range?: DashboardRange; compare?: string[] }) {
    const params = new URLSearchParams();
    params.set("range", next.range ?? range);
    const compare = next.compare ?? selectedIds;
    if (compare.length > 0) params.set("compare", compare.join(","));
    startTransition(() => {
      router.push(`/models?${params.toString()}`);
      router.refresh();
    });
  }

  function toggleModel(id: string) {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    pushParams({ compare: next });
  }

  // Compute per-series stat-card metrics from the dataset columns.
  const stats = useMemo(() => {
    const years =
      RANGE_YEARS[range] ||
      Math.max(1, dataset.points.length / 252); // MAX → span estimate
    return dataset.series.map((s) => {
      const values = dataset.points
        .map((p) => p[s.key])
        .filter((v): v is number => typeof v === "number");
      return {
        key: s.key,
        colorSwatch: s.colorSwatch,
        totalReturn: totalReturn(values),
        cagr: cagr(values, years),
        maxDrawdown: maxDrawdown(values),
        vol: annualisedVol(values),
      };
    });
  }, [dataset, range]);

  const hasChart = dataset.points.length > 0 && dataset.series.length > 0;

  const swatchByKey = useMemo(
    () =>
      Object.fromEntries(dataset.series.map((s) => [s.key, s.colorSwatch])),
    [dataset.series]
  );

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Compare:</span>
          {models.map((m) => {
            const active = selectedIds.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleModel(m.id)}
                disabled={pending}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-50",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                {m.name}
              </button>
            );
          })}
          {models.length === 0 && (
            <span className="text-xs text-muted-foreground">
              No models available yet.
            </span>
          )}
        </div>

        <div className="flex rounded-md border border-border">
          {RANGES.map((r, i) => (
            <button
              key={r}
              type="button"
              onClick={() => pushParams({ range: r })}
              disabled={pending}
              aria-pressed={range === r}
              className={cn(
                "px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                range === r
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent",
                i === 0 && "rounded-l-md",
                i === RANGES.length - 1 && "rounded-r-md"
              )}
            >
              {r === "MAX" ? "All" : r}
            </button>
          ))}
        </div>
      </div>

      {!hasConsolidated && (
        <p className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          You have no holdings yet — the chart shows models only.{" "}
          <Link href="/portfolio/new" className="text-primary underline">
            Create a portfolio
          </Link>{" "}
          to overlay your consolidated value.
        </p>
      )}

      {/* Comparison chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            {hasConsolidated ? "Consolidated vs Models" : "Model Comparison"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasChart ? (
            <ResponsiveContainer width="100%" height={340}>
              <LineChart
                data={dataset.points}
                margin={{ top: 5, right: 8, left: 8, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickFormatter={(d: string) => String(d).slice(0, 7)}
                  minTickGap={28}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickFormatter={(v) =>
                    `$${(Number(v) / 1000).toFixed(0)}k`
                  }
                  width={48}
                />
                <Tooltip
                  content={
                    <CompareTooltip
                      currency={currency}
                      swatchByKey={swatchByKey}
                    />
                  }
                />
                {dataset.series.map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.key}
                    stroke={s.colorVar}
                    dot={false}
                    strokeWidth={s.key === "Consolidated" ? 2.5 : 1.75}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[340px] items-center justify-center text-sm text-muted-foreground">
              Select a model above to compare.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stat cards */}
      {stats.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.key} size="sm">
              <CardContent>
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-sm ${s.colorSwatch}`}
                    aria-hidden
                  />
                  <span className="truncate text-sm font-medium">{s.key}</span>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <dt className="text-muted-foreground">Total return</dt>
                  <dd className="text-right tabular-nums">
                    {formatPercent(s.totalReturn * 100)}
                  </dd>
                  <dt className="text-muted-foreground">CAGR</dt>
                  <dd className="text-right tabular-nums">
                    {formatPercent(s.cagr * 100)}
                  </dd>
                  <dt className="text-muted-foreground">Max drawdown</dt>
                  <dd className="text-right tabular-nums">
                    {formatPercent(s.maxDrawdown * 100)}
                  </dd>
                  <dt className="text-muted-foreground">Volatility</dt>
                  <dd className="text-right tabular-nums">
                    {formatPercent(s.vol * 100)}
                  </dd>
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
