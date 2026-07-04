import Link from "next/link";
import {
  AllocationDonut,
  ALLOCATION_SWATCH,
} from "@/components/charts/allocation-donut";
import type { PortfolioCard } from "@/lib/services/portfolio-cards";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { portfolioIdentity } from "@/lib/constants/portfolio-identity";
import { PortfolioIcon } from "@/components/ui/portfolio-icon";
import { Badge } from "@/components/ui/badge";

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
        ? "text-gain"
        : "text-loss";
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
  const identity = portfolioIdentity(card);

  return (
    <Link
      href={`/portfolio/${card.id}`}
      className="group flex h-full flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white",
            identity.swatch
          )}
          aria-hidden
        >
          <PortfolioIcon icon={identity.icon} className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium group-hover:text-primary">
              {card.name}
            </h3>
            {card.isShared && <Badge variant="secondary">Shared</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="capitalize">{card.entityType}</span> ·{" "}
            {card.currency} · {card.holdingsCount} holding
            {card.holdingsCount === 1 ? "" : "s"}
          </p>
        </div>
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
        <ReturnTile label="1Y p.a." value={card.returns.y1} />
        <ReturnTile label="3Y p.a." value={card.returns.y3} />
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
                  aria-hidden="true"
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
