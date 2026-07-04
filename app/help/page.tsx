import Link from "next/link";
import { HelpSearch } from "./help-search";
import { PublicNavAuth } from "@/components/layout/public-nav-auth";
import {
  Rocket,
  Upload,
  Coins,
  FolderOpen,
  Target,
  BarChart3,
  Calculator,
  GitBranch,
  Search,
  LineChart,
  Download,
  Code,
  Wallet,
} from "lucide-react";

const HELP_SECTIONS = [
  { slug: "getting-started", title: "Getting Started", icon: Rocket, description: "Account setup, portfolio creation, first import" },
  { slug: "importing", title: "Adding &amp; Importing", icon: Upload, description: "CSV import, broker templates, AI importer" },
  { slug: "assets", title: "Supported Assets", icon: Coins, description: "Equities, ETFs, bonds, crypto, custom investments" },
  { slug: "portfolio", title: "Portfolio Management", icon: FolderOpen, description: "Detail charts, broker details, merge, groups, labels, sharing" },
  { slug: "models", title: "Model Portfolios", icon: Target, description: "Target-weight models, comparison dashboard, optimise & backtest, rebalancing" },
  { slug: "accounts", title: "Accounts &amp; Cash", icon: Wallet, description: "Bank accounts, statement import, categories, linking, reconciliation" },
  { slug: "reports", title: "Performance &amp; Reporting", icon: BarChart3, description: "11 reports, model comparison, risk analysis, drawdown" },
  { slug: "tax", title: "Tax Reporting", icon: Calculator, description: "CGT, taxable income, AMIT, allocation methods" },
  { slug: "corporate-actions", title: "Corporate Actions", icon: GitBranch, description: "Splits, bonus, mergers, rights issues" },
  { slug: "tools", title: "Research &amp; Planning", icon: Search, description: "Watchlist, FIRE calculator, market sentiment, AI assistant, rebalancing &amp; drift" },
  { slug: "analytics", title: "Advanced Analytics", icon: LineChart, description: "Backtesting, Monte Carlo, optimisation, stress testing" },
  { slug: "export", title: "Data Export &amp; Backup", icon: Download, description: "CSV and JSON export (automated backups planned)" },
  { slug: "api", title: "API Access", icon: Code, description: "REST API, authentication, rate limiting" },
] as const;

export const metadata = {
  title: "Help",
};

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to Main Content
      </a>

      <nav className="border-b border-border">
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
            <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">About</Link>
            <PublicNavAuth />
          </div>
        </div>
      </nav>

      <main id="main" className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="font-serif text-4xl font-bold" style={{ textWrap: "balance" }}>
          Help &amp;&nbsp;Documentation
        </h1>
        <p className="mt-3 text-muted-foreground">
          Everything you need to know about using InvestaLens.
        </p>

        <div className="mt-8">
          <HelpSearch sections={HELP_SECTIONS.map((s) => ({ slug: s.slug, title: s.title, description: s.description }))} />
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {HELP_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.slug}
                href={`/help/${section.slug}`}
                className="group rounded-lg border border-border p-5 transition-colors hover:border-primary/50 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="text-sm font-semibold group-hover:text-primary" dangerouslySetInnerHTML={{ __html: section.title }} />
                <p className="mt-1 text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: section.description }} />
              </Link>
            );
          })}
        </div>
      </main>

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
            <Link href="/about" className="hover:text-foreground">About</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
