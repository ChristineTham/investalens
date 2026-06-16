import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BarChart3, TrendingUp, Shuffle, Globe } from "lucide-react";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const tools = [
    {
      href: "/analytics/risk",
      icon: BarChart3,
      title: "Risk Metrics",
      desc: "Sharpe, Sortino, Beta, Alpha, Volatility, and Information Ratio.",
    },
    {
      href: "/analytics/monte-carlo",
      icon: TrendingUp,
      title: "Monte Carlo Simulation",
      desc: "Project portfolio value with probabilistic outcomes over time.",
    },
    {
      href: "/analytics/what-if",
      icon: Shuffle,
      title: "What-If Scenarios",
      desc: "Model the impact of market moves, trades, or allocation changes.",
    },
    {
      href: "/analytics/exposure",
      icon: Globe,
      title: "Exposure Report",
      desc: "Geographic and sector treemap of portfolio allocation.",
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

      <div className="grid gap-4 md:grid-cols-2">
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
