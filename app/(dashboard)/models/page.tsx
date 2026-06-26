import Link from "next/link";
import { redirect } from "next/navigation";
import { Target, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { getModelsForUser } from "@/lib/services/model-list";
import {
  getConsolidatedValueSeries,
  getModelValueSeries,
} from "@/lib/services/model-analytics";
import { buildComparison } from "@/lib/services/model-compare";
import { ModelCard } from "@/app/(dashboard)/models/_components/model-card";
import { ModelsClient } from "@/app/(dashboard)/models/models-client";

type DashboardRange = "1Y" | "3Y" | "5Y" | "10Y" | "MAX";
const RANGES: DashboardRange[] = ["1Y", "3Y", "5Y", "10Y", "MAX"];

function dateRangeToFrom(range: DashboardRange): Date {
  if (range === "MAX") return new Date(2000, 0, 1);
  const now = new Date();
  now.setFullYear(now.getFullYear() - parseInt(range, 10));
  return now;
}

export default async function ModelsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; compare?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sp = await searchParams;
  const range: DashboardRange = RANGES.includes(sp.range as DashboardRange)
    ? (sp.range as DashboardRange)
    : "3Y";

  const models = await getModelsForUser(session.user.id);
  const systemModels = models.filter((m) => m.isSystem);
  const userModels = models.filter((m) => !m.isSystem);

  const selectedIds = (sp.compare ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((id) => id && models.some((m) => m.id === id));

  const from = dateRangeToFrom(range);
  const consolidated = await getConsolidatedValueSeries(session.user.id, range);

  const selectedSeries = await Promise.all(
    selectedIds.map(async (id) => {
      const model = models.find((m) => m.id === id)!;
      const { valueSeries } = await getModelValueSeries(id, { from });
      return { id, name: model.name, valueSeries };
    })
  );

  const dataset = buildComparison(consolidated, selectedSeries);
  const currency = models[0]?.baseCurrency ?? "AUD";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">Model Portfolios</h1>
          <p className="text-sm text-muted-foreground">
            Weight-based target portfolios to compare against your holdings
          </p>
        </div>
        <Link
          href="/models/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Model
        </Link>
      </div>

      {/* P1c: a scaled consolidated-vs-models comparison dashboard renders here. */}
      <ModelsClient
        models={models.map((m) => ({
          id: m.id,
          name: m.name,
          category: m.category,
          isSystem: m.isSystem,
        }))}
        dataset={dataset}
        range={range}
        selectedIds={selectedIds}
        currency={currency}
        hasConsolidated={consolidated.length > 0}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Your models
        </h2>
        {userModels.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12">
            <Target className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No custom models yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your own model, or duplicate a system default to edit.
            </p>
            <Link
              href="/models/new"
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Create Model
            </Link>
          </div>
        ) : (
          <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
            {userModels.map((model) => (
              <ModelCard key={model.id} model={model} />
            ))}
          </div>
        )}
      </section>

      {systemModels.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            System defaults
          </h2>
          <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
            {systemModels.map((model) => (
              <ModelCard key={model.id} model={model} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
