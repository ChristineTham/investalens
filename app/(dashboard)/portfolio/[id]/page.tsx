import Link from "next/link";
import { ArrowLeft, Plus, Upload, Banknote, Landmark } from "lucide-react";
import { getPortfolioDetail } from "@/lib/services/portfolio-detail";
import { getPortfolios } from "@/lib/actions/portfolio";
import { PortfolioActions } from "@/components/forms/portfolio-actions";
import { PortfolioDetailClient } from "@/components/portfolio/portfolio-detail-client";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-context";
import { formatCurrency } from "@/lib/utils";

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
        {value == null ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`}
      </p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "pos" | "neg" | "neutral";
}) {
  const color =
    tone === "pos" ? "text-green-600" : tone === "neg" ? "text-red-600" : "";
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default async function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getPortfolioDetail(id);
  const allPortfolios = await getPortfolios();
  const otherPortfolios = allPortfolios
    .filter((p) => p.id !== id)
    .map((p) => ({ id: p.id, name: p.name }));

  const { returns } = detail;

  const hasDetails =
    detail.brokerName ||
    detail.brokerWebsite ||
    detail.clientNumber ||
    detail.accountNumber;

  return (
    <div className="space-y-6">
      <BreadcrumbLabel id={id} label={detail.name} />

      <div className="flex flex-wrap items-center gap-4">
        <Link href="/portfolio" className="rounded-md p-2 hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="font-serif text-2xl font-bold">{detail.name}</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {detail.entityType} · {detail.currency} · {detail.holdingsCount}{" "}
            holding{detail.holdingsCount === 1 ? "" : "s"}
          </p>
        </div>
        <PortfolioActions
          portfolioId={id}
          portfolio={{
            name: detail.name,
            brokerName: detail.brokerName,
            brokerWebsite: detail.brokerWebsite,
            clientNumber: detail.clientNumber,
            accountNumber: detail.accountNumber,
          }}
          otherPortfolios={otherPortfolios}
        />
        <Link
          href={`/portfolio/${id}/bonds`}
          className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          <Landmark className="h-4 w-4" />
          Bonds
        </Link>
        <Link
          href={`/portfolio/${id}/cash`}
          className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          <Banknote className="h-4 w-4" />
          Cash
        </Link>
        <Link
          href={`/portfolio/${id}/import`}
          className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          <Upload className="h-4 w-4" />
          Import
        </Link>
        <Link
          href={`/portfolio/${id}/add-holding`}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Holding
        </Link>
      </div>

      {/* Broker / account details */}
      {hasDetails && (
        <div className="flex flex-wrap gap-x-8 gap-y-2 rounded-lg border border-border bg-card p-4 text-sm">
          {detail.brokerName && (
            <div>
              <p className="text-xs text-muted-foreground">Broker</p>
              <p className="font-medium">
                {detail.brokerWebsite ? (
                  <a
                    href={detail.brokerWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {detail.brokerName}
                  </a>
                ) : (
                  detail.brokerName
                )}
              </p>
            </div>
          )}
          {!detail.brokerName && detail.brokerWebsite && (
            <div>
              <p className="text-xs text-muted-foreground">Broker website</p>
              <a
                href={detail.brokerWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                {detail.brokerWebsite}
              </a>
            </div>
          )}
          {detail.clientNumber && (
            <div>
              <p className="text-xs text-muted-foreground">Client number</p>
              <p className="font-medium tabular-nums">{detail.clientNumber}</p>
            </div>
          )}
          {detail.accountNumber && (
            <div>
              <p className="text-xs text-muted-foreground">Account number</p>
              <p className="font-medium tabular-nums">{detail.accountNumber}</p>
            </div>
          )}
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Current value"
          value={formatCurrency(detail.currentValue, detail.currency)}
          sub={`Cost ${formatCurrency(detail.costBase, detail.currency)}`}
        />
        <KpiCard
          label="Capital gain"
          value={formatCurrency(detail.capitalGain, detail.currency)}
          tone={detail.capitalGain >= 0 ? "pos" : "neg"}
          sub="Since inception"
        />
        <KpiCard
          label="Income"
          value={formatCurrency(detail.income, detail.currency)}
          tone="pos"
          sub="Since inception"
        />
        <KpiCard
          label="Total gain"
          value={`${formatCurrency(detail.totalGain, detail.currency)} (${
            detail.totalGainPercent >= 0 ? "+" : ""
          }${detail.totalGainPercent.toFixed(1)}%)`}
          tone={detail.totalGain >= 0 ? "pos" : "neg"}
          sub="Capital + income"
        />
      </div>

      {/* Trailing returns */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Trailing returns
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
          <ReturnTile label="1M" value={returns.m1} />
          <ReturnTile label="6M" value={returns.m6} />
          <ReturnTile label="1Y" value={returns.y1} />
          <ReturnTile label="3Y" value={returns.y3} />
          <ReturnTile label="5Y" value={returns.y5} />
          <ReturnTile label="10Y" value={returns.y10} />
          <ReturnTile label="Max" value={returns.max} />
        </div>
      </div>

      {/* Charts, performers and holdings table */}
      <PortfolioDetailClient detail={detail} />
    </div>
  );
}
