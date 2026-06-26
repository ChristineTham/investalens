"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  ArrowLeft,
  Pencil,
  Copy,
  Trash2,
  Sparkles,
  LineChart,
  AlertTriangle,
  Lock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PortfolioAreaChart } from "@/components/charts/portfolio-area-chart";
import type {
  SeriesMeta,
  ValuePoint,
} from "@/components/charts/portfolio-chart-utils";
import { InstantiationTable } from "@/app/(dashboard)/models/_components/instantiation-table";
import { ModelHealthBadge } from "@/app/(dashboard)/models/_components/model-health-badge";
import { deleteModel, duplicateModel } from "@/lib/actions/model";
import type { Instantiation } from "@/lib/services/model-portfolio";
import type { ModelHealth } from "@/lib/services/share-checker";
import type { XrayResult } from "@/lib/services/etf-xray";
import { formatCurrency } from "@/lib/utils";

export interface ModelWeightSlice {
  code: string;
  weight: number;
  colorVar: string;
  colorSwatch: string;
}

interface ModelDetailClientProps {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  provider?: string | null;
  isSystem: boolean;
  owned: boolean;
  currency: string;
  lookbackYears: number;
  instantiation: Instantiation;
  valueSeries: ValuePoint[];
  series: SeriesMeta[];
  weights: ModelWeightSlice[];
  health: { level: ModelHealth; reasons: string[] };
  lookThrough: XrayResult;
}

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ModelWeightSlice }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const s = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-card p-2 text-xs shadow-md">
      <span className="font-medium">{s.code}</span>{" "}
      <span className="tabular-nums text-muted-foreground">
        {(s.weight * 100).toFixed(2)}%
      </span>
    </div>
  );
}

export function ModelDetailClient(props: ModelDetailClientProps) {
  const router = useRouter();
  const {
    id,
    name,
    description,
    category,
    provider,
    isSystem,
    owned,
    currency,
    instantiation,
    valueSeries,
    series,
    weights,
    health,
    lookThrough,
  } = props;

  const [asOf, setAsOf] = useState(instantiation.asOfDate);
  const [capital, setCapital] = useState(instantiation.notionalCapital);
  const [busy, setBusy] = useState(false);

  function applyControls() {
    const params = new URLSearchParams();
    params.set("asOf", asOf);
    params.set("capital", String(capital));
    router.push(`/models/${id}?${params.toString()}`);
    router.refresh();
  }

  async function handleDuplicate() {
    setBusy(true);
    try {
      const copy = await duplicateModel(id);
      router.push(`/models/${copy.id}`);
      router.refresh();
    } catch {
      setBusy(false);
      alert("Failed to duplicate model");
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete model "${name}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteModel(id);
      router.push("/models");
      router.refresh();
    } catch {
      setBusy(false);
      alert("Failed to delete model");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link href="/models" className="rounded-md p-2 hover:bg-accent">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="flex items-center gap-2 font-serif text-2xl font-bold">
              {name}
              {isSystem && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                  <Lock className="h-3 w-3" aria-hidden />
                  System
                </span>
              )}
              <ModelHealthBadge level={health.level} reasons={health.reasons} />
            </h1>
            <p className="text-sm text-muted-foreground">
              {category}
              {provider ? ` · ${provider}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {owned && (
            <Link
              href={`/models/${id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
          )}
          <button
            type="button"
            onClick={handleDuplicate}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </button>
          <Link
            href={`/analytics/optimize?model=${id}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Optimise
          </Link>
          <Link
            href={`/analytics/backtest?model=${id}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            <LineChart className="h-3.5 w-3.5" />
            Backtest
          </Link>
          {owned && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
        </div>
      </div>

      {description && (
        <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
      )}

      {!instantiation.valid && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
          <div>
            <p className="font-medium">
              Some constituents are delisted or lack prices for the selected
              period.
            </p>
            <p className="text-muted-foreground">
              Affected: {instantiation.invalidCodes.join(", ")}. Pick an earlier
              as-of date or replace the constituent
              {owned ? " via Edit." : "."}
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      <Card size="sm">
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label htmlFor="asOf" className="text-xs font-medium">
                As-of date
              </label>
              <input
                id="asOf"
                type="date"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="capital" className="text-xs font-medium">
                Notional capital
              </label>
              <input
                id="capital"
                type="number"
                min={1}
                step="1000"
                value={capital}
                onChange={(e) => setCapital(Number(e.target.value))}
                className="h-9 w-40 rounded-md border border-input bg-background px-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={applyControls}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Apply
            </button>
            <p className="ml-auto text-xs text-muted-foreground">
              Invested {formatCurrency(instantiation.investedCash, currency)} ·
              Residual {formatCurrency(instantiation.residualCash, currency)}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Target Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="min-w-0 flex-1">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={weights}
                      dataKey="weight"
                      nameKey="code"
                      cx="50%"
                      cy="50%"
                      innerRadius="45%"
                      outerRadius="80%"
                      paddingAngle={1}
                      stroke="var(--background)"
                      strokeWidth={1}
                    >
                      {weights.map((w) => (
                        <Cell key={w.code} fill={w.colorVar} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex max-h-64 min-w-32 flex-col gap-1 overflow-y-auto text-xs sm:w-2/5">
                {weights.map((w) => (
                  <li key={w.code} className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-sm ${w.colorSwatch}`}
                      aria-hidden
                    />
                    <span className="truncate">{w.code}</span>
                    <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
                      {(w.weight * 100).toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Value Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <PortfolioAreaChart
              data={valueSeries}
              series={series}
              currency={currency}
              range="MAX"
              height={260}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instantiation</CardTitle>
        </CardHeader>
        <CardContent>
          <InstantiationTable
            instantiation={instantiation}
            currency={currency}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Look-Through Exposure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                Top underlying holdings
              </h3>
              <ul className="space-y-1 text-sm">
                {lookThrough.topHoldings.slice(0, 10).map((h) => (
                  <li
                    key={h.name}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate font-medium">{h.name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {(h.totalWeight * 100).toFixed(2)}%
                    </span>
                  </li>
                ))}
                {lookThrough.topHoldings.length === 0 && (
                  <li className="text-muted-foreground">
                    No look-through data for these constituents.
                  </li>
                )}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                Sector exposure
              </h3>
              <ul className="space-y-1 text-sm">
                {Object.entries(lookThrough.sectorExposure)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 10)
                  .map(([sector, w]) => (
                    <li
                      key={sector}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{sector}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {(w * 100).toFixed(2)}%
                      </span>
                    </li>
                  ))}
                {Object.keys(lookThrough.sectorExposure).length === 0 && (
                  <li className="text-muted-foreground">
                    No sector breakdown available.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
