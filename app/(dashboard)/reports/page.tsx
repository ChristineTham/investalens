import Link from "next/link";

const reports = [
  {
    href: "/reports/performance",
    title: "Performance",
    desc: "Returns by holding with grouping and date ranges",
  },
  {
    href: "/reports/contribution",
    title: "Contribution Analysis",
    desc: "How each holding drives portfolio return",
  },
  {
    href: "/reports/multi-period",
    title: "Multi-Period",
    desc: "Compare performance across time periods",
  },
  {
    href: "/reports/sold-securities",
    title: "Sold Securities",
    desc: "Realised gains and losses",
  },
  {
    href: "/reports/future-income",
    title: "Future Income",
    desc: "Projected dividends and distributions",
  },
  {
    href: "/reports/calendar",
    title: "Dividend Calendar",
    desc: "Month-by-month payment schedule",
  },
  {
    href: "/reports/diversity",
    title: "Diversity",
    desc: "Portfolio allocation breakdown",
  },
  {
    href: "/reports/drawdown",
    title: "Drawdown Risk",
    desc: "Maximum drawdown and RoMaD analysis",
  },
  {
    href: "/reports/historical-cost",
    title: "Historical Cost",
    desc: "Opening/closing cost base",
  },
  {
    href: "/reports/all-trades",
    title: "All Trades",
    desc: "Complete transaction history",
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Portfolio performance, income, and analysis reports.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
          >
            <h3 className="font-medium">{r.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
