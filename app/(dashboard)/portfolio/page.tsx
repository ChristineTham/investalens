import Link from "next/link";
import { getPortfolios } from "@/lib/actions/portfolio";
import { Briefcase, Plus, Layers } from "lucide-react";

export default async function PortfolioPage() {
  const portfolios = await getPortfolios();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">Portfolios</h1>
          <p className="text-sm text-muted-foreground">
            Manage your investment portfolios
          </p>
        </div>
        <div className="flex items-center gap-2">
          {portfolios.length > 1 && (
            <Link
              href="/portfolio/consolidated"
              className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              <Layers className="h-4 w-4" />
              Consolidated View
            </Link>
          )}
          <Link
            href="/portfolio/new"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Portfolio
          </Link>
        </div>
      </div>

      {portfolios.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12">
          <Briefcase className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No portfolios yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first portfolio to start tracking investments.
          </p>
          <Link
            href="/portfolio/new"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create Portfolio
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {portfolios.map((portfolio) => (
            <Link
              key={portfolio.id}
              href={`/portfolio/${portfolio.id}`}
              className="rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent"
            >
              <h3 className="font-medium">{portfolio.name}</h3>
              <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                <span>{portfolio._count.holdings} holdings</span>
                <span>{portfolio.baseCurrency}</span>
                <span className="capitalize">{portfolio.taxEntityType}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
