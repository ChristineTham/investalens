import Link from "next/link";
import { Layers, ArrowRight } from "lucide-react";
import { AllocationBar } from "@/components/charts/allocation-bar";
import { ALLOCATION_SWATCH } from "@/components/charts/allocation-donut";
import { formatCurrency } from "@/lib/utils";

interface ConsolidatedCardProps {
  totalValue: number;
  totalHoldings: number;
  byPortfolio: { name: string; value: number }[];
}

export function ConsolidatedCard({
  totalValue,
  totalHoldings,
  byPortfolio,
}: ConsolidatedCardProps) {
  const data = byPortfolio.map((p) => ({ name: p.name, value: p.value }));

  return (
    <Link
      href="/portfolio/consolidated"
      className="group col-span-full flex flex-col rounded-lg border-2 border-primary/40 bg-primary/5 p-5 transition-colors hover:border-primary/70"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-primary">Consolidated View</h3>
        </div>
        <ArrowRight className="h-4 w-4 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        All portfolios combined
      </p>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Total value</p>
          <p className="text-3xl font-bold">{formatCurrency(totalValue)}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          {byPortfolio.length} portfolios · {totalHoldings} holdings
        </p>
      </div>

      {data.length > 0 && (
        <div className="mt-4">
          <div className="pointer-events-none">
            <AllocationBar data={data} />
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {data.map((a, i) => (
              <li key={a.name} className="flex items-center gap-2 text-xs">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-sm ${
                    ALLOCATION_SWATCH[i % ALLOCATION_SWATCH.length]
                  }`}
                />
                <span className="font-medium">{a.name}</span>
                <span className="text-muted-foreground">
                  {totalValue > 0
                    ? ((a.value / totalValue) * 100).toFixed(0)
                    : 0}
                  %
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Link>
  );
}
