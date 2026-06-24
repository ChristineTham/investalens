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
  // Broker / account administrative details.
  brokerName: z.string().max(200).nullable().optional(),
  brokerWebsite: z.string().max(300).nullable().optional(),
  clientNumber: z.string().max(100).nullable().optional(),
  accountNumber: z.string().max(100).nullable().optional(),
  // Proposed 2027 CGT regime projection settings.
  cgtRegime: z.enum(["current", "proposed_2027"]).optional(),
  cgtTransitionMethod: z.enum(["market_value", "apportionment"]).optional(),
  incomeSupportRecipient: z.boolean().optional(),
  isForeignResident: z.boolean().optional(),
  marginalTaxRate: z.number().min(0).max(1).nullable().optional(),
});

export type CreatePortfolioInput = z.infer<typeof createPortfolioSchema>;
export type UpdatePortfolioInput = z.infer<typeof updatePortfolioSchema>;
