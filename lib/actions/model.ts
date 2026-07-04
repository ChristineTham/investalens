"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  createModelSchema,
  updateModelSchema,
  assertWeightsSumToOne,
} from "@/lib/validators/model";
import {
  instantiateModel,
  defaultPurchaseDate,
  type Instantiation,
} from "@/lib/services/model-portfolio";

/** Find-or-create an instrument by code+market (mirrors holding.ts logic). */
async function resolveInstrument(
  code: string,
  marketCode: string,
  name?: string
) {
  return db.instrument.upsert({
    where: { code_marketCode: { code, marketCode } },
    create: {
      code,
      marketCode,
      name: name ?? code,
      currency: marketCode === "ASX" ? "AUD" : "USD",
    },
    update: {},
  });
}

export async function createModel(input: unknown) {
  const user = await requireUser();
  const data = createModelSchema.parse(input);
  assertWeightsSumToOne(data.constituents.map((c) => c.targetWeight));

  const constituents = await Promise.all(
    data.constituents.map(async (c) => {
      const instrument = await resolveInstrument(
        c.instrumentCode,
        c.marketCode,
        c.instrumentName
      );
      return { instrumentId: instrument.id, targetWeight: c.targetWeight };
    })
  );

  const model = await db.modelPortfolio.create({
    data: {
      userId: user.id,
      name: data.name,
      description: data.description,
      category: data.category,
      provider: data.provider ?? "Custom",
      baseCurrency: data.baseCurrency,
      notionalCapital: data.notionalCapital,
      minCashWeight: data.minCashWeight,
      defaultLookbackYears: data.defaultLookbackYears,
      constituents: { create: constituents },
    },
  });

  revalidatePath("/models");
  return model;
}

export async function updateModel(input: unknown) {
  const user = await requireUser();
  const data = updateModelSchema.parse(input);

  // Ownership: only the owner may edit; system models (userId null) are read-only.
  const existing = await db.modelPortfolio.findFirst({
    where: { id: data.id, userId: user.id },
  });
  if (!existing) throw new Error("Model not found or read-only");

  if (data.constituents) {
    assertWeightsSumToOne(data.constituents.map((c) => c.targetWeight));
  }

  // Replace constituents transactionally when supplied.
  await db.$transaction(async (tx) => {
    await tx.modelPortfolio.update({
      where: { id: data.id },
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        provider: data.provider,
        baseCurrency: data.baseCurrency,
        notionalCapital: data.notionalCapital,
        minCashWeight: data.minCashWeight,
        defaultLookbackYears: data.defaultLookbackYears,
      },
    });
    if (data.constituents) {
      await tx.modelConstituent.deleteMany({
        where: { modelPortfolioId: data.id },
      });
      for (const c of data.constituents) {
        const instrument = await resolveInstrument(
          c.instrumentCode,
          c.marketCode,
          c.instrumentName
        );
        await tx.modelConstituent.create({
          data: {
            modelPortfolioId: data.id!,
            instrumentId: instrument.id,
            targetWeight: c.targetWeight,
          },
        });
      }
    }
    // Invalidate cached instantiations after an edit.
    await tx.modelInstantiation.deleteMany({
      where: { modelPortfolioId: data.id },
    });
  });

  revalidatePath("/models");
  revalidatePath(`/models/${data.id}`);
}

export async function deleteModel(id: string) {
  const user = await requireUser();
  const existing = await db.modelPortfolio.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) throw new Error("Model not found or read-only");
  await db.modelPortfolio.delete({ where: { id } });
  revalidatePath("/models");
}

/** Clone a model (incl. system defaults) into the user's own editable copy. */
export async function duplicateModel(id: string, name?: string) {
  const user = await requireUser();
  const src = await db.modelPortfolio.findFirst({
    where: { id, OR: [{ userId: user.id }, { userId: null }] },
    include: { constituents: true },
  });
  if (!src) throw new Error("Model not found");
  const copy = await db.modelPortfolio.create({
    data: {
      userId: user.id,
      name: name ?? `${src.name} (copy)`,
      description: src.description,
      category: src.category,
      provider: "Custom",
      baseCurrency: src.baseCurrency,
      notionalCapital: src.notionalCapital,
      minCashWeight: src.minCashWeight,
      defaultLookbackYears: src.defaultLookbackYears,
      constituents: {
        create: src.constituents.map((c) => ({
          instrumentId: c.instrumentId,
          targetWeight: c.targetWeight,
        })),
      },
    },
  });
  revalidatePath("/models");
  return copy;
}

/**
 * Persist optimiser output (weights keyed by instrument code) as a new model.
 * Codes come straight from the source matrix columns, so they already match
 * existing instruments — the upsert is just a safety net.
 */
export async function createModelFromWeights(input: {
  name: string;
  description?: string;
  category?: string;
  baseCurrency?: string;
  notionalCapital?: number;
  minCashWeight?: number;
  weights: Record<string, number>;
  market?: string;
  sourceLabel?: string;
}) {
  const user = await requireUser();

  // Drop ~0 weights and renormalise (optimiser may leave a tiny residual).
  const entries = Object.entries(input.weights).filter(([, w]) => w > 1e-6);
  if (entries.length === 0) throw new Error("No non-zero weights to save");
  const total = entries.reduce((a, [, w]) => a + w, 0);

  const constituents = await Promise.all(
    entries.map(async ([code, w]) => {
      const market = input.market ?? "ASX";
      const instrument = await db.instrument.upsert({
        where: { code_marketCode: { code, marketCode: market } },
        create: {
          code,
          marketCode: market,
          name: code,
          currency: market === "ASX" ? "AUD" : "USD",
        },
        update: {},
      });
      return { instrumentId: instrument.id, targetWeight: w / total };
    })
  );

  const model = await db.modelPortfolio.create({
    data: {
      userId: user.id,
      name: input.name,
      description: input.description ?? input.sourceLabel,
      category: input.category ?? "growth",
      provider: "Custom",
      baseCurrency: input.baseCurrency ?? "AUD",
      notionalCapital: input.notionalCapital ?? 1_000_000,
      minCashWeight: input.minCashWeight ?? 0,
      constituents: { create: constituents },
    },
  });

  revalidatePath("/models");
  return model;
}

/** Re-instantiate a model for a chosen as-of date / notional capital. */
export async function reinstantiateModel(
  id: string,
  opts?: { asOfDate?: string; notionalCapital?: number }
): Promise<Instantiation> {
  const user = await requireUser();
  const model = await db.modelPortfolio.findFirst({
    where: { id, OR: [{ userId: user.id }, { userId: null }] },
    select: { id: true },
  });
  if (!model) throw new Error("Model not found");

  return instantiateModel(id, {
    asOfDate: opts?.asOfDate ? new Date(opts.asOfDate) : undefined,
    notionalCapital: opts?.notionalCapital,
  });
}

/** Models the user can pick from (own + system), for client-side pickers. */
export async function listModelsForPicker(): Promise<
  { id: string; name: string }[]
> {
  const user = await requireUser();
  const models = await db.modelPortfolio.findMany({
    where: { archived: false, OR: [{ userId: user.id }, { userId: null }] },
    select: { id: true, name: true },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
  return models;
}

/** Persist the user's preferred dashboard "vs model" comparison model. */
export async function setDashboardModel(modelId: string | null) {
  const user = await requireUser();
  if (modelId) {
    const model = await db.modelPortfolio.findFirst({
      where: { id: modelId, OR: [{ userId: user.id }, { userId: null }] },
      select: { id: true },
    });
    if (!model) throw new Error("Model not found");
  }
  await db.user.update({
    where: { id: user.id },
    data: { dashboardModelId: modelId },
  });
  revalidatePath("/dashboard");
}

/** Run the Share-Checker model health checks for a chosen model. */
export async function runModelHealthCheck(modelId: string) {
  const user = await requireUser();
  const model = await db.modelPortfolio.findFirst({
    where: { id: modelId, OR: [{ userId: user.id }, { userId: null }] },
    select: { id: true },
  });
  if (!model) throw new Error("Model not found");
  const { checkModel } = await import("@/lib/services/share-checker");
  return checkModel(modelId);
}

/** Estimate the CGT impact of rebalancing a portfolio to a model's weights. */
export async function estimateRebalanceAction(
  portfolioId: string,
  modelId: string
) {
  const user = await requireUser();
  const portfolio = await db.portfolio.findFirst({
    where: { id: portfolioId, userId: user.id },
    select: { id: true },
  });
  if (!portfolio) throw new Error("Portfolio not found");
  const model = await db.modelPortfolio.findFirst({
    where: { id: modelId, OR: [{ userId: user.id }, { userId: null }] },
    select: { id: true },
  });
  if (!model) throw new Error("Model not found");
  const { estimateRebalanceToModel } =
    await import("@/lib/reports/tax/rebalance-cgt");
  return estimateRebalanceToModel(portfolioId, modelId);
}

/** Compute target-vs-actual drift + buy/sell deltas for a portfolio and model. */
export async function computeDriftAction(portfolioId: string, modelId: string) {
  const user = await requireUser();
  const portfolio = await db.portfolio.findFirst({
    where: { id: portfolioId, userId: user.id },
    select: { id: true },
  });
  if (!portfolio) throw new Error("Portfolio not found");
  const model = await db.modelPortfolio.findFirst({
    where: { id: modelId, OR: [{ userId: user.id }, { userId: null }] },
    select: { id: true },
  });
  if (!model) throw new Error("Model not found");
  const { computeDrift } = await import("@/lib/services/rebalance");
  return computeDrift(portfolioId, modelId);
}

/**
 * Instantiate a model and shape its priced holdings as What-If rows
 * ({ code, value = instantiated cost, beta }). Beta is taken from
 * InstrumentInfo when available, defaulting to 1.0.
 */
export async function getModelWhatIfHoldings(
  id: string
): Promise<{ code: string; value: number; beta: number }[]> {
  const user = await requireUser();
  const model = await db.modelPortfolio.findFirst({
    where: { id, OR: [{ userId: user.id }, { userId: null }] },
    select: { id: true },
  });
  if (!model) throw new Error("Model not found");

  const inst = await instantiateModel(id);
  const priced = inst.holdings.filter((h) => h.cost > 0);

  const infos = await db.instrumentInfo.findMany({
    where: { instrumentId: { in: priced.map((h) => h.instrumentId) } },
    select: { instrumentId: true, beta: true },
  });
  const betaById = new Map(
    infos.map((i) => [i.instrumentId, i.beta != null ? Number(i.beta) : null])
  );

  return priced.map((h) => ({
    code: h.code,
    value: h.cost,
    beta: betaById.get(h.instrumentId) ?? 1.0,
  }));
}

export interface InstrumentCoverageResult {
  found: boolean;
  firstPrice: string | null;
  lastPrice: string | null;
  /** Earliest price ≤ the period start (instrument can be bought at t0). */
  coversStart: boolean;
  /** Latest price older than ~10 days ⇒ likely delisted/suspended. */
  stale: boolean;
  valid: boolean;
}

/**
 * Lightweight per-instrument coverage check for the create/edit form. Mirrors
 * getModelCoverage's per-instrument logic without requiring a persisted model.
 */
export async function checkInstrumentCoverage(
  code: string,
  marketCode: string,
  lookbackYears = 3
): Promise<InstrumentCoverageResult> {
  await requireUser();

  const instrument = await db.instrument.findUnique({
    where: { code_marketCode: { code, marketCode } },
    select: { id: true },
  });
  if (!instrument) {
    return {
      found: false,
      firstPrice: null,
      lastPrice: null,
      coversStart: false,
      stale: true,
      valid: false,
    };
  }

  const periodStart = defaultPurchaseDate(lookbackYears);
  const staleCutoff = new Date();
  staleCutoff.setDate(staleCutoff.getDate() - 10);

  const first = await db.price.findFirst({
    where: { instrumentId: instrument.id },
    orderBy: { date: "asc" },
    select: { date: true },
  });
  const last = await db.price.findFirst({
    where: { instrumentId: instrument.id },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  const coversStart = first ? first.date <= periodStart : false;
  const stale = last ? last.date < staleCutoff : true;

  return {
    found: true,
    firstPrice: first ? first.date.toISOString().slice(0, 10) : null,
    lastPrice: last ? last.date.toISOString().slice(0, 10) : null,
    coversStart,
    stale,
    valid: coversStart && !stale,
  };
}
