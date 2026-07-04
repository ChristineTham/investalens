import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getModelForUser } from "@/lib/services/model-list";
import { getModelValueSeries } from "@/lib/services/model-analytics";
import { getModelHealth } from "@/lib/services/share-checker";
import { getModelLookThrough } from "@/lib/services/etf-xray";
import { holdingColor } from "@/lib/constants/chart-colors";
import type { SeriesMeta } from "@/components/charts/portfolio-chart-utils";
import {
  ModelDetailClient,
  type ModelWeightSlice,
} from "@/app/(dashboard)/models/[id]/model-detail-client";

export const metadata = {
  title: "Model Details",
};

export default async function ModelDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ asOf?: string; capital?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const model = await getModelForUser(session.user.id, id);
  if (!model) notFound();

  const asOfDate = sp.asOf ? new Date(sp.asOf) : undefined;
  const notionalCapital = sp.capital ? Number(sp.capital) : undefined;

  const { valueSeries, instantiation } = await getModelValueSeries(id, {
    asOfDate,
    notionalCapital,
  });

  // Colour-coded series for the value chart — one per priced holding.
  const priced = instantiation.holdings.filter((h) => h.units > 0 && !h.invalid);
  const series: SeriesMeta[] = priced.map((h, i) => {
    const c = holdingColor(i);
    return { id: h.code, code: h.code, colorVar: c.var, colorSwatch: c.swatch };
  });

  // Target-weight slices (all constituents) for the allocation pie.
  const weights: ModelWeightSlice[] = model.constituents.map((c, i) => {
    const colour = holdingColor(i);
    return {
      code: c.instrument.code,
      weight: Number(c.targetWeight),
      colorVar: colour.var,
      colorSwatch: colour.swatch,
    };
  });

  const health = await getModelHealth(id);
  const lookThrough = await getModelLookThrough(id);

  return (
    <ModelDetailClient
      id={model.id}
      name={model.name}
      description={model.description}
      category={model.category}
      provider={model.provider}
      isSystem={model.isSystem}
      owned={model.userId === session.user.id}
      currency={model.baseCurrency}
      lookbackYears={model.defaultLookbackYears}
      instantiation={instantiation}
      valueSeries={valueSeries}
      series={series}
      weights={weights}
      health={health}
      lookThrough={lookThrough}
    />
  );
}
