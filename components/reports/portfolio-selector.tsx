"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface Portfolio {
  id: string;
  name: string;
}

interface PortfolioSelectorProps {
  portfolios: Portfolio[];
  selectedId: string | null;
}

export function PortfolioSelector({
  portfolios,
  selectedId,
}: PortfolioSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("portfolio");
    } else {
      params.set("portfolio", value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="portfolio-select"
        className="text-sm font-medium text-muted-foreground"
      >
        Portfolio:
      </label>
      <select
        id="portfolio-select"
        value={selectedId || "all"}
        onChange={(e) => handleChange(e.target.value)}
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
  );
}
