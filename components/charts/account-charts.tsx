"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { holdingColor, roselySwatchClass } from "@/lib/constants/chart-colors";
import {
  type ChartRange,
  compactCurrency,
  formatAxisDate,
} from "@/components/charts/portfolio-chart-utils";

interface BalancePoint {
  date: string;
  balance: number;
}
interface FlowPoint {
  period: string;
  in: number;
  out: number; // negative
}
export interface CategoryDatum {
  name: string;
  value: number;
  color: string | null;
}

// ─── Balance over time ───────────────────────────────────────────────────────

export function AccountBalanceChart({
  data,
  currency,
  range,
  height,
}: {
  data: BalancePoint[];
  currency: string;
  range: ChartRange;
  height: number;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No balance history in this range.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="date"
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickFormatter={(d) => formatAxisDate(String(d), range)}
          minTickGap={28}
        />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickFormatter={(v) => compactCurrency(Number(v))}
          width={56}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontSize: "12px",
          }}
          formatter={(v) => [formatCurrency(Number(v), currency), "Balance"]}
        />
        <Area
          type="monotone"
          dataKey="balance"
          stroke="var(--rosely14)"
          fill="var(--rosely14)"
          fillOpacity={0.25}
          strokeWidth={2}
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Monthly cash flow ───────────────────────────────────────────────────────

export function AccountCashflowChart({
  data,
  currency,
  height,
}: {
  data: FlowPoint[];
  currency: string;
  height: number;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No cash flow in this range.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="period" stroke="var(--muted-foreground)" fontSize={11} minTickGap={20} />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickFormatter={(v) => compactCurrency(Number(v))}
          width={56}
        />
        <Tooltip
          cursor={{ fill: "var(--accent)", opacity: 0.3 }}
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontSize: "12px",
          }}
          formatter={(v, name) => [
            formatCurrency(Math.abs(Number(v)), currency),
            name === "in" ? "Money in" : "Money out",
          ]}
        />
        <ReferenceLine y={0} stroke="var(--muted-foreground)" />
        <Bar dataKey="in" fill="var(--rosely14)" isAnimationActive={false} />
        <Bar dataKey="out" fill="var(--rosely11)" isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Spending by category ────────────────────────────────────────────────────

function CategoryTooltip({
  active,
  payload,
  currency,
  total,
}: {
  active?: boolean;
  payload?: { payload: CategoryDatum }[];
  currency: string;
  total: number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  const pct = total > 0 ? (d.value / total) * 100 : 0;
  return (
    <div className="rounded-md border border-border bg-card p-2.5 text-xs shadow-md">
      <p className="font-medium">{d.name}</p>
      <p className="tabular-nums">
        {formatCurrency(d.value, currency)} ({pct.toFixed(0)}%)
      </p>
    </div>
  );
}

export function CategoryPie({
  data,
  currency,
  height,
}: {
  data: CategoryDatum[];
  currency: string;
  height: number;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No categorised spending in this range.
      </div>
    );
  }
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex h-full flex-col gap-3 sm:flex-row">
      <div className="min-w-0 flex-1">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="45%"
              outerRadius="80%"
              paddingAngle={1}
              stroke="var(--background)"
              strokeWidth={1}
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={d.color ?? holdingColor(i).var} />
              ))}
            </Pie>
            <Tooltip content={<CategoryTooltip currency={currency} total={total} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex max-h-full min-w-40 flex-col gap-1 overflow-y-auto text-xs sm:w-2/5">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-sm ${roselySwatchClass(d.color ?? holdingColor(i).var)}`}
              aria-hidden
            />
            <span className="truncate">{d.name}</span>
            <span className="ml-auto shrink-0 text-muted-foreground tabular-nums">
              {total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Spending by category as a horizontal bar chart, sorted largest-first. */
export function CategoryBar({
  data,
  currency,
  height,
}: {
  data: CategoryDatum[];
  currency: string;
  height: number;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No categorised spending in this range.
      </div>
    );
  }
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 12, left: 8, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis
          type="number"
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickFormatter={(v) => compactCurrency(Number(v))}
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke="var(--muted-foreground)"
          fontSize={11}
          width={112}
          tickFormatter={(v) => String(v)}
        />
        <Tooltip
          cursor={{ fill: "var(--accent)", opacity: 0.3 }}
          content={<CategoryTooltip currency={currency} total={total} />}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={d.name} fill={d.color ?? holdingColor(i).var} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
