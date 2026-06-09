import Link from "next/link";
import { Calculator, FileText, TrendingUp } from "lucide-react";

export default function TaxPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Tax Reports</h1>
        <p className="text-sm text-muted-foreground">
          Australian tax reporting for the financial year.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/tax/taxable-income"
          className="rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent"
        >
          <FileText className="h-8 w-8 text-primary" />
          <h3 className="mt-3 font-medium">Taxable Income</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Dividends, franking credits, interest, and foreign income.
          </p>
        </Link>
        <Link
          href="/tax/cgt"
          className="rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent"
        >
          <Calculator className="h-8 w-8 text-primary" />
          <h3 className="mt-3 font-medium">Capital Gains Tax</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Realised CGT with parcel matching and discount calculation.
          </p>
        </Link>
        <Link
          href="/tax/unrealised"
          className="rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent"
        >
          <TrendingUp className="h-8 w-8 text-primary" />
          <h3 className="mt-3 font-medium">Unrealised CGT</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Hypothetical tax liability if all positions sold today.
          </p>
        </Link>
      </div>
    </div>
  );
}
