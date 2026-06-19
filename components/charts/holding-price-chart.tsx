"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
} from "recharts";

interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface DividendMarker {
  date: string;
  amount: number;
}

interface HoldingChartProps {
  prices: PricePoint[];
  dividends?: DividendMarker[];
  showVolume?: boolean;
  showMA20?: boolean;
  showMA50?: boolean;
  showMA200?: boolean;
}

function calculateMA(data: PricePoint[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1);
    return slice.reduce((s, p) => s + p.close, 0) / period;
  });
}

export function HoldingPriceChart({
  prices,
  dividends = [],
  showVolume = true,
  showMA20 = false,
  showMA50 = false,
  showMA200 = false,
}: HoldingChartProps) {
  const chartData = useMemo(() => {
    const ma20 = showMA20 ? calculateMA(prices, 20) : [];
    const ma50 = showMA50 ? calculateMA(prices, 50) : [];
    const ma200 = showMA200 ? calculateMA(prices, 200) : [];

    return prices.map((p, i) => ({
      ...p,
      ma20: ma20[i] ?? undefined,
      ma50: ma50[i] ?? undefined,
      ma200: ma200[i] ?? undefined,
      isDividend: dividends.some((d) => d.date === p.date),
    }));
  }, [prices, dividends, showMA20, showMA50, showMA200]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center text-muted-foreground">
        No price data available. Run the price cron job to populate.
      </div>
    );
  }

  const minPrice = Math.min(...chartData.map((d) => d.low || d.close)) * 0.98;
  const maxPrice = Math.max(...chartData.map((d) => d.high || d.close)) * 1.02;

  return (
    <div className="space-y-2">
      {/* Price Chart */}
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickFormatter={(d) => {
              const date = new Date(d);
              return `${date.getDate()}/${date.getMonth() + 1}`;
            }}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={11}
            domain={[minPrice, maxPrice]}
            tickFormatter={(v) => `$${v.toFixed(0)}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              fontSize: "12px",
            }}
            formatter={(value, name) => {
              if (name === "volume") return [Number(value).toLocaleString(), "Volume"];
              return [`$${Number(value).toFixed(2)}`, String(name)];
            }}
            labelFormatter={(label) => {
              const d = new Date(label);
              return d.toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
            }}
          />
          <Legend />

          {/* Price line */}
          <Line
            type="monotone"
            dataKey="close"
            stroke="var(--rosely2)"
            strokeWidth={2}
            dot={false}
            name="Close"
          />

          {/* Moving averages */}
          {showMA20 && (
            <Line
              type="monotone"
              dataKey="ma20"
              stroke="var(--rosely14)"
              strokeWidth={1}
              dot={false}
              name="MA20"
              connectNulls={false}
            />
          )}
          {showMA50 && (
            <Line
              type="monotone"
              dataKey="ma50"
              stroke="var(--rosely7)"
              strokeWidth={1}
              dot={false}
              name="MA50"
              connectNulls={false}
            />
          )}
          {showMA200 && (
            <Line
              type="monotone"
              dataKey="ma200"
              stroke="var(--rosely12)"
              strokeWidth={1}
              dot={false}
              name="MA200"
              connectNulls={false}
            />
          )}

          {/* Dividend markers */}
          {dividends.map((d) => (
            <ReferenceLine
              key={d.date}
              x={d.date}
              stroke="var(--rosely14)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          ))}

          {/* Brush for zoom */}
          <Brush
            dataKey="date"
            height={30}
            stroke="var(--border)"
            fill="var(--muted)"
            tickFormatter={(d) => {
              const date = new Date(d);
              return `${date.getMonth() + 1}/${date.getFullYear().toString().slice(2)}`;
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Volume Chart */}
      {showVolume && (
        <ResponsiveContainer width="100%" height={100}>
          <ComposedChart
            data={chartData}
            margin={{ top: 0, right: 30, left: 20, bottom: 0 }}
          >
            <XAxis dataKey="date" hide />
            <YAxis
              stroke="var(--muted-foreground)"
              fontSize={10}
              tickFormatter={(v) =>
                v >= 1_000_000
                  ? `${(v / 1_000_000).toFixed(0)}M`
                  : `${(v / 1_000).toFixed(0)}K`
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: "12px",
              }}
              formatter={(value) => [Number(value).toLocaleString(), "Volume"]}
            />
            <Bar
              dataKey="volume"
              fill="var(--rosely3)"
              fillOpacity={0.5}
              name="Volume"
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// Time range selector
interface TimeRangeSelectorProps {
  selected: string;
  onChange: (range: string) => void;
}

const TIME_RANGES = ["1W", "1M", "3M", "6M", "1Y", "3Y", "5Y", "Max"];

export function TimeRangeSelector({ selected, onChange }: TimeRangeSelectorProps) {
  return (
    <div className="flex items-center gap-1">
      {TIME_RANGES.map((range) => (
        <button
          key={range}
          onClick={() => onChange(range)}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            selected === range
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          {range}
        </button>
      ))}
    </div>
  );
}

// Chart controls (MA toggles, volume toggle)
interface ChartControlsProps {
  showVolume: boolean;
  showMA20: boolean;
  showMA50: boolean;
  showMA200: boolean;
  onToggleVolume: () => void;
  onToggleMA20: () => void;
  onToggleMA50: () => void;
  onToggleMA200: () => void;
}

export function ChartControls({
  showVolume,
  showMA20,
  showMA50,
  showMA200,
  onToggleVolume,
  onToggleMA20,
  onToggleMA50,
  onToggleMA200,
}: ChartControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleChip label="Volume" active={showVolume} onToggle={onToggleVolume} />
      <ToggleChip label="MA 20" active={showMA20} onToggle={onToggleMA20} color="var(--rosely14)" />
      <ToggleChip label="MA 50" active={showMA50} onToggle={onToggleMA50} color="var(--rosely7)" />
      <ToggleChip label="MA 200" active={showMA200} onToggle={onToggleMA200} color="var(--rosely12)" />
    </div>
  );
}

function ToggleChip({
  label,
  active,
  onToggle,
  color,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-border bg-accent text-foreground"
          : "border-transparent text-muted-foreground hover:border-border"
      }`}
    >
      {color && (
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </button>
  );
}
