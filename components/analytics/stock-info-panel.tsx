"use client";

import { useState } from "react";
import { AnalystRecommendationsChart } from "@/components/charts/analyst-recommendations";
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
import {
  Building2,
  Newspaper,
  TrendingUp,
  CalendarDays,
  FileBarChart,
  ExternalLink,
  Globe,
} from "lucide-react";

export interface StockInfoData {
  profile: StockProfile | null;
  stats: StockStats | null;
  analystTargets: AnalystTargets | null;
  recommendations: RecommendationRow[] | null;
  upgrades: UpgradeRow[] | null;
  calendar: StockCalendar | null;
  news: NewsItem[] | null;
  financials: StockFinancials | null;
  fetchedAt: string | null;
  currency: string | null;
}

interface StockInfoPanelProps {
  data: StockInfoData;
  currentPrice: number | null;
}

type TabKey = "overview" | "analysts" | "financials" | "news" | "events";

const TABS: { key: TabKey; label: string; icon: typeof Building2 }[] = [
  { key: "overview", label: "Overview", icon: Building2 },
  { key: "analysts", label: "Analysts", icon: TrendingUp },
  { key: "financials", label: "Financials", icon: FileBarChart },
  { key: "news", label: "News", icon: Newspaper },
  { key: "events", label: "Events", icon: CalendarDays },
];

function fmtLargeNumber(v: number | null | undefined, currency?: string | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  const prefix = currency ? `${currency} ` : "$";
  if (abs >= 1e12) return `${prefix}${(v / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${prefix}${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${prefix}${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${prefix}${(v / 1e3).toFixed(2)}K`;
  return `${prefix}${v.toFixed(2)}`;
}

function fmtNum(v: unknown, decimals = 2): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(decimals);
}

function fmtPercent(v: unknown, decimals = 2): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(decimals)}%`;
}

function fmtDate(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

export function StockInfoPanel({ data, currentPrice }: StockInfoPanelProps) {
  const [tab, setTab] = useState<TabKey>("overview");
  const { profile, stats, analystTargets, recommendations, upgrades, calendar, news, financials } =
    data;
  const ccy = data.currency;

  return (
    <div className="rounded-lg border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
        <h2 className="font-medium">Company Information</h2>
        {data.fetchedAt && (
          <span className="text-xs text-muted-foreground">
            Updated {fmtDate(data.fetchedAt)}
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 border-b border-border p-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="p-4">
        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {profile?.sector && (
                <span className="rounded-full bg-muted px-2 py-0.5">
                  {profile.sector}
                </span>
              )}
              {profile?.industry && (
                <span className="rounded-full bg-muted px-2 py-0.5">
                  {profile.industry}
                </span>
              )}
              {profile?.country && (
                <span className="rounded-full bg-muted px-2 py-0.5">
                  {profile.country}
                </span>
              )}
              {profile?.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <Globe className="h-3 w-3" /> Website
                </a>
              )}
            </div>

            {profile?.summary && (
              <p className="text-sm leading-relaxed text-foreground/80">
                {profile.summary}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              <StatTile label="Market Cap" value={fmtLargeNumber(Number(stats?.marketCap), ccy)} />
              <StatTile label="P/E (TTM)" value={fmtNum(stats?.trailingPE)} />
              <StatTile label="Forward P/E" value={fmtNum(stats?.forwardPE)} />
              <StatTile label="Price/Book" value={fmtNum(stats?.priceToBook)} />
              <StatTile label="EPS (TTM)" value={fmtNum(stats?.trailingEps)} />
              <StatTile label="Beta" value={fmtNum(stats?.beta)} />
              <StatTile label="Dividend Yield" value={fmtPercent(stats?.dividendYield)} />
              <StatTile label="Profit Margin" value={fmtPercent(stats?.profitMargins)} />
              <StatTile label="ROE" value={fmtPercent(stats?.returnOnEquity)} />
              <StatTile label="Revenue Growth" value={fmtPercent(stats?.revenueGrowth)} />
              <StatTile label="52-wk High" value={fmtNum(stats?.fiftyTwoWeekHigh)} />
              <StatTile label="52-wk Low" value={fmtNum(stats?.fiftyTwoWeekLow)} />
            </div>

            {profile?.employees != null && (
              <p className="text-xs text-muted-foreground">
                {profile.employees.toLocaleString()} employees
                {profile.city ? ` · ${profile.city}` : ""}
                {profile.exchange ? ` · ${profile.exchange}` : ""}
              </p>
            )}
          </div>
        )}

        {/* ANALYSTS */}
        {tab === "analysts" && (
          <div className="space-y-5">
            {analystTargets && (
              <div>
                <h3 className="mb-2 text-sm font-medium">Price Targets</h3>
                <PriceTargetSummary targets={analystTargets} currentPrice={currentPrice} />
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <StatTile label="Low" value={fmtNum(analystTargets.low)} />
                  <StatTile label="Mean" value={fmtNum(analystTargets.mean)} />
                  <StatTile label="Median" value={fmtNum(analystTargets.median)} />
                  <StatTile label="High" value={fmtNum(analystTargets.high)} />
                </div>
              </div>
            )}

            {recommendations && recommendations.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium">Recommendation Trend</h3>
                <AnalystRecommendationsChart data={recommendations} />
              </div>
            )}

            {upgrades && upgrades.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium">Recent Rating Changes</h3>
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Firm</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Action</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">From → To</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {upgrades.slice(0, 10).map((u, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-muted-foreground">{fmtDate(u.date)}</td>
                          <td className="px-3 py-2">{u.firm ?? "—"}</td>
                          <td className="px-3 py-2 capitalize">{u.action ?? "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {u.fromGrade || "—"} → <span className="text-foreground">{u.toGrade || "—"}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!analystTargets &&
              (!recommendations || recommendations.length === 0) &&
              (!upgrades || upgrades.length === 0) && (
                <p className="text-sm text-muted-foreground">
                  No analyst data available for this instrument.
                </p>
              )}
          </div>
        )}

        {/* FINANCIALS */}
        {tab === "financials" && (
          <div>
            {financials && financials.years.length > 0 ? (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Year</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Revenue</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Gross Profit</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">EBITDA</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Net Income</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {financials.years.map((y, i) => (
                      <tr key={y}>
                        <td className="px-3 py-2 font-medium">{y.slice(0, 4)}</td>
                        <td className="px-3 py-2 text-right">{fmtLargeNumber(financials.revenue[i], ccy)}</td>
                        <td className="px-3 py-2 text-right">{fmtLargeNumber(financials.grossProfit[i], ccy)}</td>
                        <td className="px-3 py-2 text-right">{fmtLargeNumber(financials.ebitda[i], ccy)}</td>
                        <td className="px-3 py-2 text-right">{fmtLargeNumber(financials.netIncome[i], ccy)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No financial statements available for this instrument.
              </p>
            )}
          </div>
        )}

        {/* NEWS */}
        {tab === "news" && (
          <div className="space-y-3">
            {news && news.length > 0 ? (
              news.map((n, i) => (
                <a
                  key={i}
                  href={n.link ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-md border border-border p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{n.title}</p>
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </div>
                  {n.summary && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {n.summary}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {n.publisher ?? "—"}
                    {n.publishedAt ? ` · ${fmtDate(n.publishedAt)}` : ""}
                  </p>
                </a>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No recent news available for this instrument.
              </p>
            )}
          </div>
        )}

        {/* EVENTS / CALENDAR */}
        {tab === "events" && (
          <div className="space-y-4">
            {calendar ? (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <StatTile
                    label="Next Earnings"
                    value={fmtDate(calendar.earningsDates?.[0] ?? null)}
                  />
                  <StatTile label="Ex-Dividend" value={fmtDate(calendar.exDividendDate)} />
                  <StatTile label="Dividend Date" value={fmtDate(calendar.dividendDate)} />
                  <StatTile label="EPS Estimate" value={fmtNum(calendar.earningsAverage)} />
                  <StatTile label="EPS Low" value={fmtNum(calendar.earningsLow)} />
                  <StatTile label="EPS High" value={fmtNum(calendar.earningsHigh)} />
                </div>
                {calendar.earningsDates && calendar.earningsDates.length > 1 && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium">Upcoming Earnings Dates</h3>
                    <ul className="flex flex-wrap gap-2 text-sm">
                      {calendar.earningsDates.map((d, i) => (
                        <li
                          key={i}
                          className="rounded-full border border-border px-2 py-0.5 text-muted-foreground"
                        >
                          {fmtDate(d)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No upcoming events available for this instrument.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Concise analyst price-target summary (no positioned/inline styles). */
function PriceTargetSummary({
  targets,
  currentPrice,
}: {
  targets: AnalystTargets;
  currentPrice: number | null;
}) {
  const mean = targets.mean;
  let upside: string | null = null;
  let upsideClass = "text-muted-foreground";
  if (mean != null && currentPrice != null && currentPrice > 0) {
    const pct = ((mean - currentPrice) / currentPrice) * 100;
    const dir = pct >= 0 ? "upside" : "downside";
    upside = `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% ${dir}`;
    upsideClass = pct >= 0 ? "text-green-600" : "text-red-600";
  }

  return (
    <div className="rounded-md border border-border bg-background p-3 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-muted-foreground">
          Current{" "}
          <span className="font-semibold text-foreground">
            {currentPrice != null ? fmtNum(currentPrice) : "—"}
          </span>{" "}
          vs average target{" "}
          <span className="font-semibold text-foreground">{fmtNum(mean)}</span>
        </span>
        {upside && <span className={`font-semibold ${upsideClass}`}>{upside}</span>}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Analyst range {fmtNum(targets.low)} – {fmtNum(targets.high)}
      </p>
    </div>
  );
}
