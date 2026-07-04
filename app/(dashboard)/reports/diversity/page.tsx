import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateDiversityReport } from "@/lib/reports/diversity-report";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { redirect } from "next/navigation";
import { PortfolioSelector } from "@/components/reports/portfolio-selector";
import { GroupBySelect } from "@/components/reports/group-by-select";
import { DiversityPieChart } from "@/components/charts/diversity-pie";
import { ChartCard } from "@/components/charts/chart-card";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Diversity Report",
};

export default async function DiversityReportPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolio?: string; groupBy?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;

  const [portfolios, customGroups] = await Promise.all([
    db.portfolio.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true },
    }),
    db.customGroup.findMany({
      where: { userId: session.user.id },
      include: { categories: { include: { holdings: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (portfolios.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-bold">Diversity Report</h1>
        <p className="text-muted-foreground">Create a portfolio first.</p>
      </div>
    );
  }

  const selectedPortfolioId = params.portfolio || null;
  const groupByParam = params.groupBy || "type";
  // "custom:<groupId>" groups by one of the user's custom groups.
  const customGroup = groupByParam.startsWith("custom:")
    ? customGroups.find((g) => g.id === groupByParam.slice("custom:".length))
    : undefined;
  const standardDims = ["type", "sector", "market", "country"] as const;
  const groupBy = customGroup
    ? ("custom" as const)
    : standardDims.find((d) => d === groupByParam) ?? "type";

  // instrumentId -> category name for the selected custom group.
  let customAssignments: Record<string, string> | undefined;
  if (customGroup) {
    customAssignments = {};
    for (const cat of customGroup.categories) {
      for (const a of cat.holdings) {
        customAssignments[a.instrumentId] = cat.name;
      }
    }
  }

  const groupByLabel = customGroup ? customGroup.name : groupBy;

  let items: Awaited<ReturnType<typeof generateDiversityReport>>;

  if (selectedPortfolioId) {
    items = await generateDiversityReport(
      selectedPortfolioId,
      groupBy,
      customAssignments
    );
  } else {
    // Consolidated: merge across all portfolios
    const merged = new Map<string, { value: number }>();
    for (const p of portfolios) {
      const r = await generateDiversityReport(p.id, groupBy, customAssignments);
      for (const item of r) {
        const existing = merged.get(item.label);
        if (existing) {
          existing.value += item.value;
        } else {
          merged.set(item.label, { value: item.value });
        }
      }
    }
    const totalValue = Array.from(merged.values()).reduce(
      (s, i) => s + i.value,
      0
    );
    items = Array.from(merged.entries()).map(([label, { value }]) => ({
      label,
      value,
      percent: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">Diversity Report</h1>
          <p className="text-sm text-muted-foreground">
            Portfolio allocation breakdown by {groupByLabel}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Suspense>
            <GroupBySelect
              options={[
                { value: "type", label: "Investment Type" },
                { value: "sector", label: "Sector" },
                { value: "market", label: "Market" },
                { value: "country", label: "Country" },
              ]}
              customGroups={customGroups.map((g) => ({
                id: g.id,
                name: g.name,
              }))}
              value={groupByParam}
              defaultValue="type"
            />
          </Suspense>
          <Suspense>
            <PortfolioSelector
              portfolios={portfolios}
              selectedId={selectedPortfolioId}
            />
          </Suspense>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground">No holdings found.</p>
      ) : (
        <>
          {/* Diversity Pie Chart */}
          <ChartCard
            title={`Allocation by ${groupByLabel}`}
            description="Share of current value"
            height={320}
          >
            <DiversityPieChart data={items} height={320} />
          </ChartCard>

          <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Group
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Value
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Weight %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.label} className="hover:bg-accent/50">
                  <td className="px-4 py-3 font-medium capitalize">
                    {item.label}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatCurrency(item.value)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatPercent(item.percent)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
