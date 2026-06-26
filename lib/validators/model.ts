import { z } from "zod";

export const MODEL_CATEGORIES = [
  "conservative",
  "moderately_conservative",
  "balanced",
  "growth",
  "high_growth",
  "high_yield",
  "index",
] as const;

export const constituentSchema = z.object({
  instrumentCode: z.string().min(1),
  marketCode: z.string().min(1).default("ASX"),
  instrumentName: z.string().optional(),
  targetWeight: z.number().min(0).max(1),
});

export const createModelSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  category: z.enum(MODEL_CATEGORIES).default("balanced"),
  provider: z.string().max(40).optional(),
  baseCurrency: z.string().length(3).default("AUD"),
  notionalCapital: z.number().positive().default(1_000_000),
  minCashWeight: z.number().min(0).max(0.95).default(0),
  defaultLookbackYears: z.number().int().min(1).max(30).default(3),
  constituents: z.array(constituentSchema).min(1),
});

export const updateModelSchema = createModelSchema.partial().extend({
  id: z.string().min(1),
});

export type CreateModelInput = z.infer<typeof createModelSchema>;
export type UpdateModelInput = z.infer<typeof updateModelSchema>;
export type ConstituentInput = z.infer<typeof constituentSchema>;

/**
 * Non-cash weights must sum to ~1 (allow tiny float error). Validate in the
 * action before persisting.
 */
export function assertWeightsSumToOne(weights: number[], tolerance = 1e-4) {
  const total = weights.reduce((a, w) => a + w, 0);
  if (Math.abs(total - 1) > tolerance) {
    throw new Error(
      `Constituent weights must sum to 1 (got ${total.toFixed(4)}).`
    );
  }
}
