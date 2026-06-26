"use client";

import { useEffect, useState } from "react";
import {
  listModelsForPicker,
  estimateRebalanceAction,
} from "@/lib/actions/model";
import { formatCurrency } from "@/lib/utils";
import type { RebalanceEstimate } from "@/lib/reports/tax/rebalance-cgt";

export function RebalanceToModel({
  portfolios,
  initialPortfolioId,
}: {
  portfolios: { id: string; name: string }[];
  initialPortfolioId?: string | null;
}) {
  const [portfolioId, setPortfolioId] = useState(
    initialPortfolioId || portfolios[0]?.id || ""
  );
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [modelId, setModelId] = useState("");
  const [running, setRunning] = useState(false);
  const [estimate, setEstimate] = useState<RebalanceEstimate | null>(null);
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
      setEstimate(await estimateRebalanceAction(portfolioId, modelId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Estimate failed");
      setEstimate(null);
    } finally {
      setRunning(false);
    }
  }

  if (models.length === 0 || portfolios.length === 0) return null;

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div>
        <h2 className="text-sm font-medium">Rebalance to model (CGT estimate)</h2>
        <p className="text-xs text-muted-foreground">
          Estimated sells and capital-gains tax to move this portfolio to a
          model&apos;s target weights. Estimate only — no trade tickets.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Portfolio to rebalance"
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
        <span className="text-xs text-muted-foreground">to</span>
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
          {running ? "Estimating..." : "Estimate"}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {estimate && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Sell value" value={formatCurrency(estimate.totalSellValue)} />
            <Stat
              label="Est. taxable gain"
              value={formatCurrency(estimate.estimatedTaxableGain)}
            />
            <Stat
              label={`Est. tax @ ${(estimate.marginalRate * 100).toFixed(0)}%`}
              value={formatCurrency(estimate.estimatedTax)}
            />
            <Stat
              label="Net to reinvest"
              value={formatCurrency(estimate.netProceeds)}
            />
          </div>

          {estimate.sells.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Sell</th>
                    <th className="px-3 py-2 text-right font-medium">Current</th>
                    <th className="px-3 py-2 text-right font-medium">Target</th>
                    <th className="px-3 py-2 text-right font-medium">Sell $</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Assessable gain
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {estimate.sells.map((s) => (
                    <tr key={s.code} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{s.code}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(s.currentValue)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(s.targetValue)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(s.sellValue)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(s.assessableGain)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {estimate.buys.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Buy</th>
                    <th className="px-3 py-2 text-right font-medium">Current</th>
                    <th className="px-3 py-2 text-right font-medium">Target</th>
                    <th className="px-3 py-2 text-right font-medium">Buy $</th>
                  </tr>
                </thead>
                <tbody>
                  {estimate.buys.map((b) => (
                    <tr key={b.code} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{b.code}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(b.currentValue)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(b.targetValue)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(b.buyValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
