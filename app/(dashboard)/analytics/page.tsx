import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Shuffle,
  Globe,
  FlaskConical,
  GitCompare,
  Target,
  LineChart,
  CircleDot,
  Layers,
  Network,
  Compass,
} from "lucide-react";

export const metadata = {
  title: "Analytics",
};

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const tools = [
    {
      href: "/analytics/risk",
      icon: BarChart3,
      title: "Risk Metrics",
      desc: "VaR, CVaR, Sharpe, Sortino, Beta, Alpha, drawdowns, and rolling metrics.",
    },
    {
      href: "/analytics/backtest",
      icon: FlaskConical,
      title: "Backtesting",
      desc: "Walk-forward backtest with multiple allocation strategies.",
    },
    {
      href: "/analytics/backtest/compare",
      icon: GitCompare,
      title: "Strategy Comparison",
      desc: "Side-by-side comparison of backtest strategies.",
    },
    {
      href: "/analytics/model-selection",
      icon: Target,
      title: "Model Selection",
      desc: "Cross-validation and walk-forward model evaluation.",
    },
    {
      href: "/analytics/optimize",
      icon: Layers,
      title: "Portfolio Optimisation",
      desc: "Mean-Variance, HRP, Risk Parity, and CVaR optimisation.",
    },
    {
      href: "/analytics/frontier",
      icon: LineChart,
      title: "Efficient Frontier",
      desc: "Interactive efficient frontier with current portfolio position.",
    },
    {
      href: "/analytics/black-litterman",
      icon: CircleDot,
      title: "Black-Litterman",
      desc: "Incorporate market views into equilibrium-based allocation.",
    },
    {
      href: "/analytics/monte-carlo",
      icon: TrendingUp,
      title: "Monte Carlo Simulation",
      desc: "Project portfolio value with probabilistic outcomes over time.",
    },
    {
      href: "/analytics/stress-test",
      icon: Shuffle,
      title: "Stress Testing",
      desc: "Historical scenarios, custom shocks, and factor stress tests.",
    },
    {
      href: "/analytics/what-if",
      icon: Shuffle,
      title: "What-If Calculator",
      desc: "Quick market-move calculator: how a broad move affects your portfolio.",
    },
    {
      href: "/analytics/factors",
      icon: Network,
      title: "Factor Analysis",
      desc: "Fama-French factor regression and PCA decomposition.",
    },
    {
      href: "/analytics/correlations",
      icon: Globe,
      title: "Correlation Analysis",
      desc: "Correlation matrix, rolling correlations, and clustering.",
    },
    {
      href: "/analytics/tactical",
      icon: Compass,
      title: "Tactical Allocation",
      desc: "Momentum, mean reversion, vol targeting, and signal-based strategies.",
    },
    {
      href: "/analytics/exposure",
      icon: Globe,
      title: "ETF X-ray & Exposure",
      desc: "Look-through decomposition and sector/geography treemap.",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Advanced portfolio analysis, risk metrics, and simulation tools.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent"
          >
            <t.icon className="h-8 w-8 text-primary" />
            <h3 className="mt-3 font-medium">{t.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
