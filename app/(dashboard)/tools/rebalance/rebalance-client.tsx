"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  listModelsForPicker,
  computeDriftAction,
} from "@/lib/actions/model";
import { WeightComparison } from "@/components/charts/weight-comparison";
import { formatCurrency, cn } from "@/lib/utils";
import type { DriftResult } from "@/lib/services/rebalance";

export function RebalanceClient({
  portfolios,
}: {
  portfolios: { id: string; name: string }[];
}) {
  const [portfolioId, setPortfolioId] = useState(portfolios[0]?.id ?? "");
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [modelId, setModelId] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DriftResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listModelsForPicker()
      .then((list) => {
        setModels(list);
        if (list[0]) setModelId(list[0].id);
      })
      .catch(() => {});
  }, []);

  async function run() {
    if (!portfolioId || !modelId) return;
    setRunning(true);
    setError(null);
    try {
      setResult(await computeDriftAction(portfolioId, modelId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to compute drift");
      setResult(null);
    } finally {
      setRunning(false);
    }
  }

  const actualWeights: Record<string, number> = {};
  const targetWeights: Record<string, number> = {};
  if (result) {
    for (const r of result.rows) {
      actualWeights[r.code] = r.actualWeight;
      targetWeights[r.code] = r.targetWeight;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Rebalancing & Drift</h1>
        <p className="text-sm text-muted-foreground">
          Compare a portfolio&apos;s actual weights against a model&apos;s
          targets and see the buy/sell deltas to realign.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Portfolio"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={portfolioId}
          onChange={(e) => setPortfolioId(e.target.value)}
        >
          {portfolios.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">vs model</span>
        <select
          aria-label="Target model"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={run}
          disabled={running || !portfolioId || !modelId}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {running ? "Computing..." : "Compute drift"}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Stat
              label="Portfolio value"
              value={formatCurrency(result.totalValue)}
            />
            <Stat label="To buy" value={formatCurrency(result.totalBuyValue)} />
            <Stat
              label="To sell"
              value={formatCurrency(result.totalSellValue)}
            />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">Actual vs Target Weights</h3>
            <WeightComparison
              current={actualWeights}
              recommended={targetWeights}
            />
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Holding</th>
                  <th className="px-3 py-2 text-right font-medium">Actual</th>
                  <th className="px-3 py-2 text-right font-medium">Target</th>
                  <th className="px-3 py-2 text-right font-medium">Drift</th>
                  <th className="px-3 py-2 text-right font-medium">Δ Value</th>
                  <th className="px-3 py-2 text-right font-medium">Δ Units</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r) => (
                  <tr key={r.code} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{r.code}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {(r.actualWeight * 100).toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {(r.targetWeight * 100).toFixed(1)}%
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right tabular-nums",
                        Math.abs(r.drift) > 0.05
                          ? "text-amber-600 dark:text-amber-500"
                          : "text-muted-foreground"
                      )}
                    >
                      {r.drift >= 0 ? "+" : ""}
                      {(r.drift * 100).toFixed(1)}%
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right tabular-nums",
                        r.deltaValue >= 0
                          ? "text-emerald-600 dark:text-emerald-500"
                          : "text-destructive"
                      )}
                    >
                      {r.deltaValue >= 0 ? "Buy " : "Sell "}
                      {formatCurrency(Math.abs(r.deltaValue))}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.price > 0
                        ? `${r.deltaUnits >= 0 ? "+" : ""}${r.deltaUnits.toFixed(0)}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">
            Estimate the tax cost of these trades in{" "}
            <Link href="/tax/unrealised" className="text-primary underline">
              Unrealised CGT → Rebalance to model
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-bold tabular-nums">{value}</p>
    </div>
  );
}
