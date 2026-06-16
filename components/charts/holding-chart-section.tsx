"use client";

import { useState, useMemo } from "react";
import {
  HoldingPriceChart,
  TimeRangeSelector,
  ChartControls,
} from "@/components/charts/holding-price-chart";

interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface DividendData {
  date: string;
  amount: number;
}

interface HoldingChartSectionProps {
  allPrices: PriceData[];
  dividends: DividendData[];
}

function filterByRange(prices: PriceData[], range: string): PriceData[] {
  if (range === "Max" || prices.length === 0) return prices;

  const now = new Date();
  let cutoff: Date;

  switch (range) {
    case "1W":
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "1M":
      cutoff = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    case "3M":
      cutoff = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
    case "6M":
      cutoff = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      break;
    case "1Y":
      cutoff = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    case "3Y":
      cutoff = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
      break;
    case "5Y":
      cutoff = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
      break;
    default:
      return prices;
  }

  const cutoffStr = cutoff.toISOString().split("T")[0];
  return prices.filter((p) => p.date >= cutoffStr);
}

export function HoldingChartSection({
  allPrices,
  dividends,
}: HoldingChartSectionProps) {
  const [timeRange, setTimeRange] = useState("1Y");
  const [showVolume, setShowVolume] = useState(true);
  const [showMA20, setShowMA20] = useState(false);
  const [showMA50, setShowMA50] = useState(true);
  const [showMA200, setShowMA200] = useState(false);

  const filteredPrices = useMemo(
    () => filterByRange(allPrices, timeRange),
    [allPrices, timeRange]
  );

  // Price stats for the filtered range
  const stats = useMemo(() => {
    if (filteredPrices.length < 2) return null;
    const first = filteredPrices[0].close;
    const last = filteredPrices[filteredPrices.length - 1].close;
    const high = Math.max(...filteredPrices.map((p) => p.high || p.close));
    const low = Math.min(...filteredPrices.map((p) => p.low || p.close));
    const change = last - first;
    const changePercent = first > 0 ? (change / first) * 100 : 0;
    const avgVolume =
      filteredPrices.reduce((s, p) => s + p.volume, 0) / filteredPrices.length;

    return { first, last, high, low, change, changePercent, avgVolume };
  }, [filteredPrices]);

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      {/* Header with time range and controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TimeRangeSelector selected={timeRange} onChange={setTimeRange} />
        <ChartControls
          showVolume={showVolume}
          showMA20={showMA20}
          showMA50={showMA50}
          showMA200={showMA200}
          onToggleVolume={() => setShowVolume(!showVolume)}
          onToggleMA20={() => setShowMA20(!showMA20)}
          onToggleMA50={() => setShowMA50(!showMA50)}
          onToggleMA200={() => setShowMA200(!showMA200)}
        />
      </div>

      {/* Price stats bar */}
      {stats && (
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            Period:{" "}
            <span className="font-medium text-foreground">
              ${stats.first.toFixed(2)} → ${stats.last.toFixed(2)}
            </span>
          </span>
          <span
            className={
              stats.change >= 0 ? "text-rosely-teal" : "text-destructive"
            }
          >
            {stats.change >= 0 ? "+" : ""}${stats.change.toFixed(2)} (
            {stats.change >= 0 ? "+" : ""}
            {stats.changePercent.toFixed(2)}%)
          </span>
          <span className="text-muted-foreground">
            H: ${stats.high.toFixed(2)}
          </span>
          <span className="text-muted-foreground">
            L: ${stats.low.toFixed(2)}
          </span>
          <span className="text-muted-foreground">
            Avg Vol: {Math.round(stats.avgVolume).toLocaleString()}
          </span>
        </div>
      )}

      {/* Chart */}
      <HoldingPriceChart
        prices={filteredPrices}
        dividends={dividends}
        showVolume={showVolume}
        showMA20={showMA20}
        showMA50={showMA50}
        showMA200={showMA200}
      />

      {/* Dividend markers legend */}
      {dividends.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Dashed green lines indicate dividend payment dates (
          {dividends.length} payments in range)
        </p>
      )}
    </div>
  );
}
