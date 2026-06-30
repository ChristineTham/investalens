import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import type { Instantiation } from "@/lib/services/model-portfolio";

interface InstantiationTableProps {
  modelId: string;
  instantiation: Instantiation;
  currency: string;
}

export function InstantiationTable({
  modelId,
  instantiation,
  currency,
}: InstantiationTableProps) {
  const { holdings, residualCash, notionalCapital, asOfDate } = instantiation;
  const residualWeight =
    notionalCapital > 0 ? residualCash / notionalCapital : 0;

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-sm">
        <caption className="border-b border-border bg-muted/30 px-3 py-2 text-left text-xs text-muted-foreground">
          Instantiated on {asOfDate} with{" "}
          {formatCurrency(notionalCapital, currency)} notional capital
        </caption>
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Instrument</th>
            <th className="px-3 py-2 text-right font-medium">Target %</th>
            <th className="px-3 py-2 text-right font-medium">Price @ date</th>
            <th className="px-3 py-2 text-right font-medium">Units</th>
            <th className="px-3 py-2 text-right font-medium">Cost</th>
            <th className="px-3 py-2 text-right font-medium">Actual %</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => (
            <tr
              key={h.instrumentId}
              className={
                h.invalid
                  ? "border-t border-border bg-amber-500/5"
                  : "border-t border-border"
              }
            >
              <td className="px-3 py-2">
                <div className="flex items-center gap-1.5 font-medium">
                  {h.invalid && (
                    <AlertTriangle
                      className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500"
                      aria-label="No usable price for this period"
                    />
                  )}
                  <Link
                    href={`/models/${modelId}/instruments/${h.instrumentId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {h.code}
                  </Link>
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {h.name}
                </div>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {(h.targetWeight * 100).toFixed(2)}%
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {h.price > 0 ? formatCurrency(h.price, currency) : "—"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {h.units.toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatCurrency(h.cost, currency)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {(h.actualWeight * 100).toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border bg-muted/30 font-medium">
            <td className="px-3 py-2">Residual cash</td>
            <td className="px-3 py-2" />
            <td className="px-3 py-2" />
            <td className="px-3 py-2" />
            <td className="px-3 py-2 text-right tabular-nums">
              {formatCurrency(residualCash, currency)}
            </td>
            <td className="px-3 py-2 text-right tabular-nums">
              {(residualWeight * 100).toFixed(2)}%
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
