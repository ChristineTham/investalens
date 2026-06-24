"use client";

import type { HoldingMetric } from "@/lib/services/portfolio-detail";
import { formatCurrency } from "@/lib/utils";

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg" | "muted";
}) {
  const color =
    tone === "pos"
      ? "text-green-600"
      : tone === "neg"
        ? "text-red-600"
        : tone === "muted"
          ? "text-muted-foreground"
          : "";
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

/**
 * Rich tooltip body for a single holding — shared by the allocation pie and the
 * top/bottom performer lists so the hover detail is consistent everywhere.
 */
export function HoldingTooltipBody({ h }: { h: HoldingMetric }) {
  return (
    <div className="min-w-60 space-y-1.5 text-xs">
      <div className="flex items-center gap-2 border-b border-border pb-1.5">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-sm ${h.colorSwatch}`}
          aria-hidden
        />
        <span className="font-semibold">{h.code}</span>
        <span className="truncate text-muted-foreground">{h.name}</span>
      </div>
      <Row label="Type" value={h.instrumentType} tone="muted" />
      <Row label="Sector" value={h.sector} tone="muted" />
      <Row
        label="Purchase amount"
        value={formatCurrency(h.purchaseAmount, h.currency)}
      />
      <Row
        label="Current amount"
        value={formatCurrency(h.currentValue, h.currency)}
      />
      <Row
        label="Capital gain"
        value={formatCurrency(h.capitalGain, h.currency)}
        tone={h.capitalGain >= 0 ? "pos" : "neg"}
      />
      <Row label="Income" value={formatCurrency(h.income, h.currency)} tone="pos" />
      <Row
        label="Total gain"
        value={`${formatCurrency(h.totalGain, h.currency)} (${
          h.totalGainPercent >= 0 ? "+" : ""
        }${h.totalGainPercent.toFixed(1)}%)`}
        tone={h.totalGain >= 0 ? "pos" : "neg"}
      />
    </div>
  );
}

/** Card-styled wrapper used for Recharts custom tooltips. */
export function HoldingTooltipCard({ h }: { h: HoldingMetric }) {
  return (
    <div className="rounded-md border border-border bg-card p-2.5 shadow-md">
      <HoldingTooltipBody h={h} />
    </div>
  );
}
