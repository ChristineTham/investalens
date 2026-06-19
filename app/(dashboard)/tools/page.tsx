import Link from "next/link";

const tools = [
  {
    href: "/tools/watchlist",
    title: "Watchlist",
    desc: "Track instruments with price alerts.",
  },
  {
    href: "/tools/fire",
    title: "FIRE Calculator",
    desc: "Financial independence retirement projections and Monte Carlo.",
  },
  {
    href: "/tools/checker",
    title: "Share Checker",
    desc: "Portfolio health checks — duplicates, concentration, stale data.",
  },
  {
    href: "/tools/sentiment",
    title: "Market Sentiment",
    desc: "Fear & Greed index, VIX, and market breadth indicators.",
  },
  {
    href: "/tools/assistant",
    title: "AI Assistant",
    desc: "Chat with AI about your portfolio and investment questions.",
  },
];

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Tools</h1>
        <p className="text-sm text-muted-foreground">
          Investment tools and utilities.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {tools.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
          >
            <h3 className="font-medium">{t.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
