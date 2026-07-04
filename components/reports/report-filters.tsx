"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useId, useState } from "react";

interface Portfolio {
  id: string;
  name: string;
}

interface ReportFiltersProps {
  portfolios: Portfolio[];
  selectedPortfolioId: string | null;
  from: string;
  to: string;
}

export function ReportFilters({
  portfolios,
  selectedPortfolioId,
  from,
  to,
}: ReportFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [startDate, setStartDate] = useState(from);
  const [endDate, setEndDate] = useState(to);

  const baseId = useId();
  const portfolioId = `${baseId}-portfolio`;
  const presetId = `${baseId}-preset`;
  const startId = `${baseId}-start`;
  const endId = `${baseId}-end`;

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  function handlePresetChange(preset: string) {
    const now = new Date();
    let start = new Date();

    switch (preset) {
      case "3m":
        start.setMonth(now.getMonth() - 3);
        break;
      case "6m":
        start.setMonth(now.getMonth() - 6);
        break;
      case "1y":
        start.setFullYear(now.getFullYear() - 1);
        break;
      case "3y":
        start.setFullYear(now.getFullYear() - 3);
        break;
      case "5y":
        start.setFullYear(now.getFullYear() - 5);
        break;
      case "max":
        start = new Date("2010-01-01");
        break;
      default:
        return;
    }

    const startStr = start.toISOString().split("T")[0];
    const endStr = now.toISOString().split("T")[0];
    setStartDate(startStr);
    setEndDate(endStr);
    updateParams({
      from: startStr,
      to: endStr,
      preset: preset,
    });
  }

  function handleCustomDateApply() {
    updateParams({
      from: startDate,
      to: endDate,
      preset: "custom",
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4">
      {/* Portfolio Selector */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor={portfolioId}
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
        >
          Portfolio
        </label>
        <select
          id={portfolioId}
          value={selectedPortfolioId || "all"}
          onChange={(e) => updateParams({ portfolio: e.target.value })}
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

      {/* Date Presets */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor={presetId}
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
        >
          Range Preset
        </label>
        <select
          id={presetId}
          value={searchParams.get("preset") || "1y"}
          onChange={(e) => handlePresetChange(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <option value="3m">Last 3 Months</option>
          <option value="6m">Last 6 Months</option>
          <option value="1y">Last 1 Year</option>
          <option value="3y">Last 3 Years</option>
          <option value="5y">Last 5 Years</option>
          <option value="max">Max</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {/* Custom Date Inputs */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor={startId}
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
        >
          Start Date
        </label>
        <input
          id={startId}
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          onBlur={handleCustomDateApply}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor={endId}
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
        >
          End Date
        </label>
        <input
          id={endId}
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          onBlur={handleCustomDateApply}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
      </div>
    </div>
  );
}
