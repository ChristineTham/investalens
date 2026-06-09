import Link from "next/link";
import { getPortfolio } from "@/lib/actions/portfolio";
import { ArrowLeft, Plus, Upload } from "lucide-react";

export default async function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const portfolio = await getPortfolio(id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/portfolio" className="rounded-md p-2 hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="font-serif text-2xl font-bold">{portfolio.name}</h1>
          <p className="text-sm text-muted-foreground">
            {portfolio.baseCurrency} · {portfolio.taxEntityType} ·{" "}
            {portfolio.holdings.length} holdings
          </p>
        </div>
        <Link
          href={`/portfolio/${id}/import`}
          className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          <Upload className="h-4 w-4" />
          Import CSV
        </Link>
        <Link
          href={`/portfolio/${id}/add-holding`}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Holding
        </Link>
      </div>

      {portfolio.holdings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12">
          <h3 className="text-lg font-medium">No holdings yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your first holding to start tracking this portfolio.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Market
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Currency
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {portfolio.holdings.map((holding) => (
                <tr key={holding.id} className="hover:bg-accent/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/portfolio/${id}/holdings/${holding.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {holding.instrument.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {holding.instrument.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground capitalize">
                    {holding.instrument.instrumentType}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                    {holding.instrument.marketCode}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                    {holding.instrument.currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
