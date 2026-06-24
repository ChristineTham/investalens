import Link from "next/link";
import {
  AllocationDonut,
  ALLOCATION_SWATCH,
} from "@/components/charts/allocation-donut";
import type { PortfolioCard } from "@/lib/services/portfolio-cards";
import { formatCurrency, formatDate } from "@/lib/utils";

/** Top 6 holdings + an aggregated "Other" slice. */
function buildAllocation(card: PortfolioCard) {
  const top = card.allocation.slice(0, 6);
  const restValue = card.allocation
    .slice(6)
    .reduce((s, a) => s + a.value, 0);
  const data = top.map((a) => ({ name: a.code, value: a.value }));
  if (restValue > 0) data.push({ name: "Other", value: restValue });
  return data;
}

function ReturnTile({ label, value }: { label: string; value: number | null }) {
  const color =
    value == null
      ? "text-muted-foreground"
      : value >= 0
        ? "text-green-600"
        : "text-red-600";
  return (
    <div className="rounded-md border border-border bg-background/50 p-2 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`text-sm font-semibold ${color}`}>
        {value == null
          ? "—"
          : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`}
      </p>
    </div>
  );
}

export function PortfolioSummaryCard({ card }: { card: PortfolioCard }) {
  const alloc = buildAllocation(card);

  return (
    <Link
      href={`/portfolio/${card.id}`}
      className="group flex h-full flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40"
    >
      <div>
        <h3 className="font-medium group-hover:text-primary">{card.name}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          <span className="capitalize">{card.entityType}</span> ·{" "}
          {card.currency} · {card.holdingsCount} holding
          {card.holdingsCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-3">
        <p className="text-xs text-muted-foreground">Current value</p>
        <p className="text-2xl font-bold">
          {formatCurrency(card.currentValue, card.currency)}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <ReturnTile label="1M" value={card.returns.m1} />
        <ReturnTile label="6M" value={card.returns.m6} />
        <ReturnTile label="1Y" value={card.returns.y1} />
        <ReturnTile label="3Y" value={card.returns.y3} />
      </div>

      {alloc.length > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <div className="pointer-events-none shrink-0">
            <AllocationDonut data={alloc} />
          </div>
          <ul className="min-w-0 flex-1 space-y-1">
            {alloc.map((a, i) => (
              <li key={a.name} className="flex items-center gap-2 text-xs">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-sm ${
                    ALLOCATION_SWATCH[i % ALLOCATION_SWATCH.length]
                  }`}
                />
                <span className="truncate font-medium">{a.name}</span>
                <span className="ml-auto text-muted-foreground">
                  {card.currentValue > 0
                    ? ((a.value / card.currentValue) * 100).toFixed(0)
                    : 0}
                  %
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {card.recent.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Recent activity
          </p>
          <ul className="space-y-1">
            {card.recent.map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">
                  {formatDate(t.date)}
                </span>
                <span className="font-medium">{t.code}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {t.type}
                </span>
                <span className="ml-auto">
                  {formatCurrency(t.amount, card.currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Link>
  );
}
