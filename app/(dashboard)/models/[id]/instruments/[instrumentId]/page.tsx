import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getModelForUser } from "@/lib/services/model-list";
import {
  StockInfoPanel,
  type StockInfoData,
} from "@/components/analytics/stock-info-panel";
import { ModelInstrumentDetailClient } from "./instrument-detail-client";
import type {
  StockProfile,
  StockStats,
  AnalystTargets,
  RecommendationRow,
  UpgradeRow,
  StockCalendar,
  NewsItem,
  StockFinancials,
} from "@/lib/services/stock-info";

export const metadata = {
  title: "Instrument Details",
};

export default async function ModelInstrumentDetailPage({
  params,
}: {
  params: Promise<{ id: string; instrumentId: string }>;
}) {
  const { id, instrumentId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const model = await getModelForUser(session.user.id, id);
  if (!model) redirect("/models");

  const constituent = model.constituents.find(
    (c) => c.instrumentId === instrumentId
  );
  if (!constituent) redirect(`/models/${id}`);

  const instrument = await db.instrument.findUnique({
    where: { id: instrumentId },
    include: { info: true },
  });
  if (!instrument) redirect(`/models/${id}`);

  const latestPrice = await db.price.findFirst({
    where: { instrumentId },
    orderBy: { date: "desc" },
    select: { close: true },
  });
  const currentPrice = latestPrice ? Number(latestPrice.close) : null;

  const info = instrument.info;
  const stockInfo: StockInfoData | null = info
    ? {
        profile: {
          longName: info.longName,
          shortName: info.shortName,
          summary: info.summary,
          website: info.website,
          sector: info.sector,
          industry: info.industry,
          country: info.country,
          city: info.city,
          employees: info.employees,
          exchange: info.exchange,
          quoteType: info.quoteType,
          currency: info.currency,
        } as StockProfile,
        stats: (info.stats as StockStats | null) ?? null,
        analystTargets: (info.analystTargets as AnalystTargets | null) ?? null,
        recommendations:
          (info.recommendations as RecommendationRow[] | null) ?? null,
        upgrades: (info.upgrades as UpgradeRow[] | null) ?? null,
        calendar: (info.calendar as StockCalendar | null) ?? null,
        news: (info.news as NewsItem[] | null) ?? null,
        financials: (info.financials as StockFinancials | null) ?? null,
        fetchedAt: info.fetchedAt ? info.fetchedAt.toISOString() : null,
        currency: info.currency ?? instrument.currency,
      }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/models/${id}`}
            className="rounded-md p-2 hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-serif text-2xl font-bold">
              {instrument.code}
            </h1>
            <p className="text-sm text-muted-foreground">
              {instrument.name} · {instrument.marketCode}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-medium">Instrument Summary</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Type</p>
            <p className="font-medium capitalize">
              {instrument.instrumentType}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Currency</p>
            <p className="font-medium">{instrument.currency}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Target Weight</p>
            <p className="font-medium">{(Number(constituent.targetWeight) * 100).toFixed(2)}%</p>
          </div>
          {instrument.sector && (
            <div>
              <p className="text-sm text-muted-foreground">Sector</p>
              <p className="font-medium">{instrument.sector}</p>
            </div>
          )}
        </div>
      </div>

      <ModelInstrumentDetailClient
        modelId={id}
        instrumentId={instrumentId}
        currency={instrument.currency}
      />

      {/* Rich company / instrument information from Yahoo Finance */}
      {stockInfo && (
        <StockInfoPanel data={stockInfo} currentPrice={currentPrice} />
      )}
    </div>
  );
}
