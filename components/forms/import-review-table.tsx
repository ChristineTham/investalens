"use client";

import type { ParsedTransaction } from "@/lib/import/types";
import { formatDate } from "@/lib/utils";

interface ImportReviewTableProps {
  transactions: ParsedTransaction[];
  errors: Array<{ row: number; data: Record<string, string>; errors: string[] }>;
  duplicates: Array<{ row: number; existingId: string }>;
}

export function ImportReviewTable({
  transactions,
  errors,
  duplicates,
}: ImportReviewTableProps) {
  const duplicateRows = new Set(duplicates.map((d) => d.row));

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
              #
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
              Status
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
              Date
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
              Code
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
              Type
            </th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">
              Qty
            </th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">
              Price
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {transactions.map((tx, i) => {
            const isDuplicate = duplicateRows.has(i + 1);
            return (
              <tr
                key={i}
                className={isDuplicate ? "bg-warning/10" : "hover:bg-accent/50"}
              >
                <td className="px-3 py-2">{i + 1}</td>
                <td className="px-3 py-2">
                  {isDuplicate ? (
                    <span className="inline-flex rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium text-warning">
                      Duplicate
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-success/20 px-2 py-0.5 text-xs font-medium text-success">
                      Valid
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">{formatDate(tx.tradeDate)}</td>
                <td className="px-3 py-2 font-medium">
                  {tx.instrumentCode}.{tx.marketCode}
                </td>
                <td className="px-3 py-2">{tx.transactionType}</td>
                <td className="px-3 py-2 text-right">
                  {tx.quantity.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right">
                  ${tx.price.toFixed(4)}
                </td>
              </tr>
            );
          })}
          {errors.map((err) => (
            <tr key={`err-${err.row}`} className="bg-destructive/10">
              <td className="px-3 py-2">{err.row}</td>
              <td className="px-3 py-2" colSpan={6}>
                <span className="inline-flex rounded-full bg-destructive/20 px-2 py-0.5 text-xs font-medium text-destructive">
                  Error
                </span>
                <span className="ml-2 text-xs text-destructive">
                  {err.errors.join("; ")}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
