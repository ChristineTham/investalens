import Link from "next/link";
import { CheckCircle2, Clock, ArrowLeft, GitCommit, AlertTriangle } from "lucide-react";
import { getRecentCronLogs } from "@/lib/services/cron-logs";
import { PublicNavAuth } from "@/components/layout/public-nav-auth";

// Cron logs are live data — render at request time rather than prerendering.
export const dynamic = "force-dynamic";

interface ChangelogEntry {
  hash: string;
  date: string;
  subject: string;
}

function fmtWhen(d: Date): string {
  return (
    new Date(d).toLocaleString("en-AU", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    })
  );
}

function fmtDuration(ms: number | null): string {
  if (ms == null) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms} ms`;
}

function getBuildInfo() {
  const version = process.env.APP_VERSION ?? "dev";
  const buildTimeRaw = process.env.APP_BUILD_TIME ?? "";
  let buildTime = "—";
  if (buildTimeRaw) {
    buildTime =
      new Date(buildTimeRaw).toLocaleString("en-AU", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }) + " UTC";
  }
  let changelog: ChangelogEntry[] = [];
  try {
    changelog = JSON.parse(process.env.APP_CHANGELOG ?? "[]") as ChangelogEntry[];
  } catch {
    changelog = [];
  }
  return { version, buildTime, changelog };
}

export default async function AboutPage() {
  const { version, buildTime, changelog } = getBuildInfo();
  const cronLogs = await getRecentCronLogs();
  return (
    <div className="min-h-screen bg-background">
      {/* Skip link */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to Main Content
      </a>

      {/* Nav */}
      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-serif text-xl font-bold">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" className="h-7 w-7" aria-hidden="true">
              <circle cx="14" cy="14" r="10" stroke="#85677b" strokeWidth="2.5" fill="#f4eee8"/>
              <polyline points="8,18 11,15 14,16 18,10" stroke="#b565a7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <line x1="21.5" y1="21.5" x2="29" y2="29" stroke="#85677b" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="18" cy="10" r="1.5" fill="#64bfa4"/>
            </svg>
            InvestaLens
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Home
            </Link>
            <PublicNavAuth showGetStarted />
          </div>
        </div>
      </nav>

      <main id="main" className="mx-auto max-w-4xl px-6 py-16">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Home
        </Link>

        <h1
          className="font-serif text-4xl font-bold"
          style={{ textWrap: "balance" }}
        >
          About InvestaLens
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Version <span className="font-medium text-foreground tabular-nums">{version}</span>
          {" · "}Built <span className="font-medium text-foreground">{buildTime}</span>
        </p>

        <div className="mt-8 space-y-12">
          {/* Purpose */}
          <section>
            <h2 className="font-serif text-2xl font-bold">Purpose</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              InvestaLens is a comprehensive portfolio tracker and optimiser
              designed for Australian investors. It consolidates holdings from
              any broker, generates ATO-compliant tax reports, and provides
              institutional-grade analytics&nbsp;&mdash;&nbsp;all through a
              modern web interface powered by Next.js, Python, and PostgreSQL.
            </p>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Unlike simple spreadsheets or broker-specific tools, InvestaLens
              gives you a unified view across all your investments with
              quantitative analysis tools previously available only to
              professional fund managers.
            </p>
          </section>

          {/* What&rsquo;s Implemented */}
          <section>
            <h2 className="font-serif text-2xl font-bold">
              What&rsquo;s Implemented
            </h2>

            <div className="mt-6 space-y-8">
              <ReleaseBlock
                title="R1 &mdash; Core Platform"
                status="complete"
                items={[
                  "Email/password & Google OAuth authentication",
                  "Portfolio CRUD with tax entity settings (Individual, SMSF, Company)",
                  "CSV import wizard with 9 broker templates (CommSec, SelfWealth, Stake, CMC, Bell Direct, nabtrade, FIIG, IB)",
                  "Market data via Yahoo Finance (60+ exchanges, daily cron)",
                  "10 performance reports (Performance, Contribution, Diversity, Future Income, Sold Securities, All Trades, Drawdown, Multi-Period, Calendar, Historical Cost)",
                  "3 tax reports (Taxable Income with ATO codes, CGT with 5 allocation methods & discount, Unrealised CGT)",
                  "Corporate actions (splits, bonus, return of capital, rights, mergers)",
                  "Bond analytics (YTM, duration, maturity ladder, coupon schedule, credit ratings)",
                  "Organisation tools (custom groups, labels, consolidated view, sharing)",
                  "Watchlist with price alerts",
                  "Data export (CSV trades/holdings/dividends, JSON backup)",
                  "REST API with bearer token auth and rate limiting",
                ]}
              />

              <ReleaseBlock
                title="R2 &mdash; Advanced Analytics"
                status="complete"
                items={[
                  "Risk metrics dashboard (19 metrics, 5 tabs: Overview, Drawdowns, Distribution, Rolling, Decomposition)",
                  "Walk-forward backtesting (5 strategies: Equal Weight, Min Variance, Max Sharpe, Risk Parity, Mean-Variance)",
                  "Portfolio optimisation (Mean-Variance, HRP, Risk Parity with weight constraints)",
                  "Efficient frontier visualisation (interactive scatter plot with Max Sharpe & Min Risk points)",
                  "Black-Litterman model (absolute & relative views with confidence sliders)",
                  "Monte Carlo simulation (bootstrap, parametric, copula with fan charts & withdrawal modelling)",
                  "FIRE calculator (Coast FIRE, super integration, scenario comparison)",
                  "Stress testing (6 historical crises, factor stress, custom shocks)",
                  "Factor analysis (PCA + Fama-French regression)",
                  "Correlation analysis (heatmap, hierarchical clustering)",
                  "6 tactical allocation strategies (momentum, mean reversion, vol targeting, MA crossover, dual momentum)",
                  "ETF X-ray (look-through to underlying holdings, overlap detection, concentration alerts)",
                  "Share checker (automated health checks: stale data, concentration, duplicates, missing cost base)",
                  "Market sentiment dashboard (Fear & Greed Index, VIX, ASX summary, sector heatmap)",
                  "AI-powered document importer (Gemini, optional)",
                  "AI chat assistant for portfolio Q&A (Gemini, optional)",
                  "Python analytics backend via FastAPI on Vercel Services",
                  "6 benchmark indices seeded with 5 years of daily prices",
                  "Return & covariance estimation (4 return methods, 5 covariance methods)",
                ]}
              />
            </div>
          </section>

          {/* Roadmap */}
          <section>
            <h2 className="font-serif text-2xl font-bold">Roadmap</h2>

            <div className="mt-6 space-y-8">
              <ReleaseBlock
                title="R3 &mdash; Multi-Market & Currency"
                status="planned"
                items={[
                  "Exchange registry (60+ global exchanges with metadata)",
                  "FX rate provider (Open Exchange Rates integration)",
                  "Multi-currency valuation (portfolio in any of 67+ currencies)",
                  "Currency gain/loss calculation (separate CGT event for AU tax)",
                  "International ticker mapping improvements",
                  "Multi-currency performance report",
                  "International tax considerations",
                ]}
              />

              <ReleaseBlock
                title="R4 &mdash; Polish & Integrations"
                status="planned"
                items={[
                  "PDF report export (any report as formatted PDF)",
                  "Automated backups (daily/weekly/monthly via email or cloud)",
                  "Webhooks for real-time notifications",
                  "Emergency fund tracker",
                  "Net worth tracker (assets minus liabilities)",
                  "Broker API integrations (automatic sync)",
                  "SDKs for API consumers",
                  "Sharesight data import",
                  "Mobile-responsive optimisation",
                ]}
              />
            </div>
          </section>

          {/* Tech Stack */}
          <section>
            <h2 className="font-serif text-2xl font-bold">Technology</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-6 font-medium">Layer</th>
                    <th className="py-2 font-medium">Technology</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <TechRow layer="Framework" tech="Next.js 16 (App Router, RSC, Server Actions)" />
                  <TechRow layer="UI" tech="shadcn/ui (Base UI), Tailwind CSS v4, Recharts" />
                  <TechRow layer="Database" tech="PostgreSQL (Neon Serverless) via Prisma ORM 7" />
                  <TechRow layer="Auth" tech="NextAuth.js v5 (JWT sessions)" />
                  <TechRow layer="Analytics" tech="Python 3.12, FastAPI, NumPy, SciPy, pandas, statsmodels" />
                  <TechRow layer="AI" tech="Vercel AI SDK + Google Gemini (optional)" />
                  <TechRow layer="Deployment" tech="Vercel (Services for Next.js + Python)" />
                  <TechRow layer="Design" tech="Rosely design system (warm cream/pink palette)" />
                </tbody>
              </table>
            </div>
          </section>

          {/* Pricing */}
          <section>
            <h2 className="font-serif text-2xl font-bold">Pricing</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              InvestaLens is <span className="font-medium text-foreground">free to use
              during beta testing</span>. Once the app is commercialised, continued
              access may require a paid subscription. Existing beta users will be
              given advance notice before any pricing takes effect.
            </p>
          </section>

          {/* Recent changes */}
          {changelog.length > 0 && (
            <section>
              <h2 className="font-serif text-2xl font-bold">Recent changes</h2>
              <ul className="mt-4 space-y-2.5">
                {changelog.map((c) => (
                  <li key={c.hash} className="flex items-start gap-3 text-sm">
                    <GitCommit
                      className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <span className="text-foreground">{c.subject}</span>
                      <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                        {c.date} · {c.hash}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Background jobs */}
          {cronLogs.length > 0 && (
            <section>
              <h2 className="font-serif text-2xl font-bold">Background jobs</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Recent scheduled (cron) runs that keep market data up to date.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-6 font-medium">When (UTC)</th>
                      <th className="py-2 pr-6 font-medium">Job</th>
                      <th className="py-2 pr-6 font-medium">Status</th>
                      <th className="py-2 pr-6 font-medium">Result</th>
                      <th className="py-2 font-medium">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {cronLogs.map((l) => (
                      <tr key={l.id}>
                        <td className="py-2 pr-6 text-muted-foreground tabular-nums">
                          {fmtWhen(l.startedAt)}
                        </td>
                        <td className="py-2 pr-6">{l.job}</td>
                        <td className="py-2 pr-6">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium ${
                              l.status === "success" ? "text-success" : "text-destructive"
                            }`}
                          >
                            {l.status === "success" ? (
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            {l.status}
                          </span>
                        </td>
                        <td className="py-2 pr-6 text-muted-foreground">{l.message ?? "—"}</td>
                        <td className="py-2 text-muted-foreground tabular-nums">
                          {fmtDuration(l.durationMs)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Credits */}
          <section>
            <h2 className="font-serif text-2xl font-bold">Credits</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              InvestaLens is created by{" "}
              <a
                href="https://hellotham.com"
                className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Hello Tham
              </a>
              , a boutique management consulting firm specialising in business and
              IT strategy.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <p>
            &copy; {new Date().getFullYear()} InvestaLens &middot; Created by{" "}
            <a
              href="https://hellotham.com"
              className="font-medium text-foreground underline-offset-4 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Hello Tham
            </a>
          </p>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <Link href="/help" className="hover:text-foreground">Help</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ReleaseBlock({
  title,
  status,
  items,
}: {
  title: string;
  status: "complete" | "planned";
  items: string[];
}) {
  const Icon = status === "complete" ? CheckCircle2 : Clock;
  const statusLabel = status === "complete" ? "Complete" : "Planned";
  const statusColor =
    status === "complete"
      ? "text-success"
      : "text-warning";

  return (
    <div>
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold" dangerouslySetInnerHTML={{ __html: title }} />
        <span className={`flex items-center gap-1 text-xs font-medium ${statusColor}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {statusLabel}
        </span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${status === "complete" ? "bg-success" : "bg-warning"}`} aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TechRow({ layer, tech }: { layer: string; tech: string }) {
  return (
    <tr>
      <td className="py-2 pr-6 font-medium">{layer}</td>
      <td className="py-2 text-muted-foreground">{tech}</td>
    </tr>
  );
}
