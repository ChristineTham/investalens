"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface Portfolio {
  id: string;
  name: string;
  financialYearEnd: number;
}

interface TaxFilterProps {
  portfolios: Portfolio[];
  selectedPortfolioId: string | null;
  selectedYear: number;
  availableYears: number[];
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function TaxFilter({
  portfolios,
  selectedPortfolioId,
  selectedYear,
  availableYears,
}: TaxFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "" || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  // Determine FY end month label based on selected portfolio
  const selectedPortfolio = portfolios.find(
    (p) => p.id === selectedPortfolioId
  );
  const fyEndMonth = selectedPortfolio?.financialYearEnd ?? 6;
  const fyLabel =
    fyEndMonth === 12
      ? "Calendar Year (Jan–Dec)"
      : `Financial Year (${MONTH_NAMES[fyEndMonth]}–${MONTH_NAMES[fyEndMonth - 1]})`;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label
          htmlFor="tax-portfolio"
          className="text-sm font-medium text-muted-foreground"
        >
          Portfolio:
        </label>
        <select
          id="tax-portfolio"
          value={selectedPortfolioId || "all"}
          onChange={(e) => updateParams("portfolio", e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <option value="all">All Portfolios (Consolidated)</option>
          {portfolios.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label
          htmlFor="tax-year"
          className="text-sm font-medium text-muted-foreground"
        >
          Tax Year:
        </label>
        <select
          id="tax-year"
          value={selectedYear}
          onChange={(e) => updateParams("year", e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>
              {fyEndMonth === 12
                ? `${y}`
                : `FY${y - 1}/${String(y).slice(2)}`}
            </option>
          ))}
        </select>
      </div>

      <span className="text-xs text-muted-foreground">({fyLabel})</span>
    </div>
  );
}
