import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Shield,
  Calculator,
  Brain,
  LineChart,
  PieChart,
  Target,
  Zap,
  Globe,
  FileText,
  Lock,
} from "lucide-react";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/portfolio");

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
          <Link href="/" className="font-serif text-xl font-bold">
            InvestaLens
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/about"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              About
            </Link>
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main id="main">
        {/* Hero */}
        <section className="px-6 py-24 text-center">
          <div className="mx-auto max-w-3xl space-y-6">
            <h1
              className="font-serif text-5xl font-bold leading-tight tracking-tight text-foreground md:text-6xl"
              style={{ textWrap: "balance" }}
            >
              Track, Analyse &amp;&nbsp;Optimise Your&nbsp;Portfolio
            </h1>
            <p className="mx-auto max-w-xl text-lg text-muted-foreground">
              A comprehensive investment tracker for Australian investors.
              Import from any broker, generate ATO-compliant tax reports, and
              run institutional-grade analytics&nbsp;&mdash;&nbsp;all in one place.
            </p>
            <div className="flex justify-center gap-4 pt-2">
              <Link
                href="/register"
                className="rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Create Free Account
              </Link>
              <Link
                href="/about"
                className="rounded-md border border-input px-8 py-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Learn More
              </Link>
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section className="border-t border-border bg-muted/30 px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <h2
              className="mb-12 text-center font-serif text-3xl font-bold"
              style={{ textWrap: "balance" }}
            >
              Everything You Need to Manage Your&nbsp;Investments
            </h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={<BarChart3 className="h-6 w-6" aria-hidden="true" />}
                title="Portfolio Tracking"
                description="Import from 9 brokers via CSV. Track equities, ETFs, bonds, crypto, and custom investments across 60+ exchanges."
              />
              <FeatureCard
                icon={<FileText className="h-6 w-6" aria-hidden="true" />}
                title="10 Performance Reports"
                description="Performance, contribution, diversity, drawdown, future income, sold securities, multi-period, calendar, and more."
              />
              <FeatureCard
                icon={<Calculator className="h-6 w-6" aria-hidden="true" />}
                title="ATO Tax Reports"
                description="Taxable income mapped to ATO codes, CGT with 5 allocation methods and discount, unrealised gains analysis."
              />
              <FeatureCard
                icon={<Shield className="h-6 w-6" aria-hidden="true" />}
                title="19 Risk Metrics"
                description="Sharpe, Sortino, VaR, CVaR, Calmar, Omega, capture ratios, R², skewness, kurtosis — with rolling analysis."
              />
              <FeatureCard
                icon={<TrendingUp className="h-6 w-6" aria-hidden="true" />}
                title="Walk-Forward Backtesting"
                description="Test 5 strategies with proper out-of-sample validation. Compare Equal Weight, Min Variance, Max Sharpe, HRP, and Risk Parity."
              />
              <FeatureCard
                icon={<Target className="h-6 w-6" aria-hidden="true" />}
                title="Portfolio Optimisation"
                description="Mean-Variance, HRP, Risk Parity with weight constraints. Efficient frontier visualisation and Black-Litterman model."
              />
              <FeatureCard
                icon={<LineChart className="h-6 w-6" aria-hidden="true" />}
                title="Monte Carlo Simulation"
                description="Bootstrap, parametric, and copula methods. Fan charts, withdrawal modelling, and distribution fitting."
              />
              <FeatureCard
                icon={<PieChart className="h-6 w-6" aria-hidden="true" />}
                title="Factor &amp; Correlation Analysis"
                description="PCA decomposition, correlation heatmaps, hierarchical clustering, and 6 tactical allocation strategies."
              />
              <FeatureCard
                icon={<Zap className="h-6 w-6" aria-hidden="true" />}
                title="Stress Testing"
                description="6 historical crisis scenarios (GFC, COVID, Black Monday), factor stress, and custom per-asset shocks."
              />
              <FeatureCard
                icon={<Brain className="h-6 w-6" aria-hidden="true" />}
                title="AI-Powered Tools"
                description="Parse broker statements with Gemini AI. Chat assistant for portfolio Q&A and strategy suggestions."
              />
              <FeatureCard
                icon={<Globe className="h-6 w-6" aria-hidden="true" />}
                title="Market Sentiment"
                description="Fear & Greed Index, VIX, ASX 200 summary, and sector heatmap — all updated in real time."
              />
              <FeatureCard
                icon={<Lock className="h-6 w-6" aria-hidden="true" />}
                title="FIRE Calculator"
                description="Model your path to financial independence with Coast FIRE, super integration, and scenario comparison."
              />
            </div>
          </div>
        </section>

        {/* Tech stack */}
        <section className="border-t border-border px-6 py-16">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="font-serif text-2xl font-bold">Built With Modern Technology</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Next.js&nbsp;16 &middot; React&nbsp;19 &middot; TypeScript &middot; Python&nbsp;3.12 &middot; PostgreSQL &middot; Prisma&nbsp;7 &middot; Tailwind&nbsp;CSS&nbsp;v4 &middot; Recharts &middot; FastAPI &middot; Vercel
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border bg-muted/30 px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2
              className="font-serif text-3xl font-bold"
              style={{ textWrap: "balance" }}
            >
              Start Tracking Your Portfolio&nbsp;Today
            </h2>
            <p className="mt-4 text-muted-foreground">
              Free to use. No credit card required. Your data stays yours.
            </p>
            <div className="mt-8">
              <Link
                href="/register"
                className="rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Create Free Account
              </Link>
            </div>
          </div>
        </section>
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
            <Link href="/about" className="hover:text-foreground">About</Link>
            <Link href="/help" className="hover:text-foreground">Help</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/login" className="hover:text-foreground">Sign In</Link>
            <Link href="/register" className="hover:text-foreground">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
