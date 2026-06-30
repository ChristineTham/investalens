"use client";

import Link from "next/link";
import { LineChart, Line, YAxis } from "recharts";
import type { HoldingMetric } from "@/lib/services/portfolio-detail";
import type { SparkPoint } from "@/components/charts/portfolio-chart-utils";
import { formatCurrency } from "@/lib/utils";

interface HoldingsTableProps {
  portfolioId: string;
  holdings: HoldingMetric[];
  sparklines: Record<string, SparkPoint[]>;
  loadingSparklines: boolean;
  showClosed: boolean;
}

function Sparkline({ data }: { data: SparkPoint[] | undefined }) {
  if (!data || data.length < 2) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const first = data[0].value;
  const last = data[data.length - 1].value;
  const stroke = last >= first ? "var(--rosely14)" : "var(--rosely11)";
  return (
    <LineChart width={120} height={32} data={data} margin={{ top: 4, bottom: 4 }}>
      <YAxis hide domain={["dataMin", "dataMax"]} />
      <Line
        type="monotone"
        dataKey="value"
        stroke={stroke}
        strokeWidth={1.5}
        dot={false}
        isAnimationActive={false}
      />
    </LineChart>
  );
}

function gainTone(v: number): string {
  return v >= 0 ? "text-green-600" : "text-red-600";
}

export function HoldingsTable({
  portfolioId,
  holdings,
  sparklines,
  loadingSparklines,
  showClosed,
}: HoldingsTableProps) {
  const activeHoldings = holdings.filter((h) => h.quantity > 0);
  const visibleHoldings = showClosed ? holdings : activeHoldings;

  if (holdings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12">
        <h3 className="text-lg font-medium">No holdings yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Add your first holding to start tracking this portfolio.
        </p>
      </div>
    );
  }

  if (visibleHoldings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12">
        <h3 className="text-lg font-medium">No active holdings</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Toggle &ldquo;Show closed holdings&rdquo; to view sold positions.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-240">
        <thead className="bg-muted/50">
          <tr className="text-xs font-medium text-muted-foreground">
            <th className="px-3 py-2.5 text-left">Code</th>
            <th className="px-3 py-2.5 text-left">Sector</th>
            <th className="px-3 py-2.5 text-left">Type</th>
            <th className="px-3 py-2.5 text-right">Price</th>
            <th className="px-3 py-2.5 text-right">Purchase</th>
            <th className="px-3 py-2.5 text-right">Value</th>
            <th className="px-3 py-2.5 text-right">Capital gain</th>
            <th className="px-3 py-2.5 text-right">Income</th>
            <th className="px-3 py-2.5 text-right">Total gain</th>
            <th className="px-3 py-2.5 text-right">p.a.</th>
            <th className="px-3 py-2.5 text-center">Trend</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {visibleHoldings.map((h) => (
            <tr key={h.id} className="hover:bg-accent/50">
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-3 w-1 shrink-0 rounded-sm ${h.colorSwatch}`}
                    aria-hidden
                  />
                  <Link
                    href={`/portfolio/${portfolioId}/holdings/${h.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {h.code}
                  </Link>
                </div>
                <span className="block max-w-48 truncate text-xs text-muted-foreground">
                  {h.name}
                </span>
              </td>
              <td className="px-3 py-2.5 text-sm text-muted-foreground">
                {h.sector}
              </td>
              <td className="px-3 py-2.5 text-sm capitalize text-muted-foreground">
                {h.instrumentType}
              </td>
              <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                {h.currentPrice > 0
                  ? formatCurrency(h.currentPrice, h.currency)
                  : "—"}
              </td>
              <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                {formatCurrency(h.purchaseAmount, h.currency)}
              </td>
              <td className="px-3 py-2.5 text-right text-sm font-medium tabular-nums">
                {formatCurrency(h.currentValue, h.currency)}
              </td>
              <td
                className={`px-3 py-2.5 text-right text-sm tabular-nums ${gainTone(h.capitalGain)}`}
              >
                {formatCurrency(h.capitalGain, h.currency)}
              </td>
              <td className="px-3 py-2.5 text-right text-sm tabular-nums text-green-600">
                {formatCurrency(h.income, h.currency)}
              </td>
              <td
                className={`px-3 py-2.5 text-right text-sm font-medium tabular-nums ${gainTone(h.totalGain)}`}
              >
                {formatCurrency(h.totalGain, h.currency)}
                <span className="block text-xs font-normal">
                  {h.totalGainPercent >= 0 ? "+" : ""}
                  {h.totalGainPercent.toFixed(1)}%
                </span>
              </td>
              <td
                className={`px-3 py-2.5 text-right text-sm tabular-nums ${
                  h.annualisedReturn == null
                    ? "text-muted-foreground"
                    : gainTone(h.annualisedReturn)
                }`}
              >
                {h.annualisedReturn == null
                  ? "—"
                  : `${h.annualisedReturn >= 0 ? "+" : ""}${h.annualisedReturn.toFixed(1)}%`}
              </td>
              <td className="px-3 py-2.5">
                <div className="flex justify-center">
                  {loadingSparklines ? (
                    <div className="h-8 w-[120px] animate-pulse rounded bg-muted" />
                  ) : (
                    <Sparkline data={sparklines[h.id]} />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
