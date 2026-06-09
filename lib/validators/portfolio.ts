import { z } from "zod";

export const createPortfolioSchema = z.object({
  name: z.string().min(1).max(100),
  taxResidency: z.string().length(2).default("AU"),
  financialYearEnd: z.number().int().min(1).max(12).default(6),
  performanceMethod: z.enum(["simple", "compound"]).default("compound"),
  taxEntityType: z
    .enum(["individual", "smsf", "company", "trust"])
    .default("individual"),
});

export const updatePortfolioSchema = createPortfolioSchema.partial().extend({
  saleAllocationMethod: z
    .enum(["fifo", "lifo", "min_gain", "max_gain", "min_tax"])
    .optional(),
});

export type CreatePortfolioInput = z.infer<typeof createPortfolioSchema>;
export type UpdatePortfolioInput = z.infer<typeof updatePortfolioSchema>;
