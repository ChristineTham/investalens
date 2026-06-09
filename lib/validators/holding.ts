import { z } from "zod";

export const createHoldingSchema = z.object({
  portfolioId: z.string().cuid(),
  instrumentCode: z.string().min(1).max(20),
  marketCode: z.string().min(1).max(10).default("ASX"),
  instrumentName: z.string().min(1).max(200).optional(),
  instrumentType: z
    .enum([
      "equity",
      "etf",
      "lic",
      "managed_fund",
      "bond",
      "fixed_interest",
      "crypto",
      "fx",
      "custom",
    ])
    .default("equity"),
});

export type CreateHoldingInput = z.infer<typeof createHoldingSchema>;
