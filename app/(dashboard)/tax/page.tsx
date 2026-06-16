import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Calculator, FileText, TrendingUp } from "lucide-react";
import { TaxFilter } from "@/components/reports/tax-filter";
import { Suspense } from "react";

export default async function TaxPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolio?: string; year?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;

  const portfolios = await db.portfolio.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, financialYearEnd: true },
  });

  if (portfolios.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-bold">Tax Reports</h1>
        <p className="text-muted-foreground">Create a portfolio first.</p>
      </div>
    );
  }

  const selectedPortfolioId = params.portfolio || null;
  const fyEndMonth = selectedPortfolioId
    ? portfolios.find((p) => p.id === selectedPortfolioId)?.financialYearEnd ?? 6
    : 6;

  const now = new Date();
  const currentFY =
    fyEndMonth === 12
      ? now.getFullYear()
      : now.getMonth() >= fyEndMonth
        ? now.getFullYear() + 1
        : now.getFullYear();
  const selectedYear = params.year ? parseInt(params.year, 10) : currentFY;

  // Generate available years (last 5 years)
  const availableYears = Array.from({ length: 5 }, (_, i) => currentFY - i);

  // Build query params for links
  const linkParams = new URLSearchParams();
  if (selectedPortfolioId) linkParams.set("portfolio", selectedPortfolioId);
  if (params.year) linkParams.set("year", params.year);
  const queryStr = linkParams.toString() ? `?${linkParams.toString()}` : "";

  const reports = [
    {
      href: `/tax/taxable-income${queryStr}`,
      icon: FileText,
      title: "Taxable Income",
      desc: "Dividends, franking credits, interest, foreign income, tax-deferred amounts, and AMIT components.",
    },
    {
      href: `/tax/cgt${queryStr}`,
      icon: Calculator,
      title: "Capital Gains Tax",
      desc: "Realised CGT with parcel matching (FIFO/LIFO/min-gain), 50% discount for 12+ month holdings, loss carry-forward.",
    },
    {
      href: `/tax/unrealised${queryStr}`,
      icon: TrendingUp,
      title: "Unrealised CGT",
      desc: "Hypothetical tax liability if all open positions were sold today at current market price.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">Tax Reports</h1>
          <p className="text-sm text-muted-foreground">
            Investment income and capital gains for tax purposes.
          </p>
        </div>
      </div>

      <Suspense>
        <TaxFilter
          portfolios={portfolios}
          selectedPortfolioId={selectedPortfolioId}
          selectedYear={selectedYear}
          availableYears={availableYears}
        />
      </Suspense>

      <div className="grid gap-4 md:grid-cols-3">
        {reports.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent"
          >
            <r.icon className="h-8 w-8 text-primary" />
            <h3 className="mt-3 font-medium">{r.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
