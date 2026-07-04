import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import { getPortfolioCards } from "@/lib/services/portfolio-cards";
import { PortfolioSummaryCard } from "@/components/portfolio/portfolio-summary-card";
import { ConsolidatedCard } from "@/components/portfolio/consolidated-card";

export const metadata: Metadata = {
  title: "Portfolios",
};

export default async function PortfolioPage() {
  const { cards, totalValue, totalHoldings, byPortfolio } =
    await getPortfolioCards();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">Portfolios</h1>
          <p className="text-sm text-muted-foreground">
            Manage your investment portfolios
          </p>
        </div>
        <Link
          href="/portfolio/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Portfolio
        </Link>
      </div>

      {cards.length === 0 ? (
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
        <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.length > 1 && (
            <ConsolidatedCard
              totalValue={totalValue}
              totalHoldings={totalHoldings}
              byPortfolio={byPortfolio}
            />
          )}
          {cards.map((card) => (
            <PortfolioSummaryCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
