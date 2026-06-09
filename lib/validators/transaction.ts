import { z } from "zod";

export const transactionTypes = [
  "BUY",
  "SELL",
  "DIVIDEND",
  "INTEREST",
  "COUPON",
  "MATURITY",
  "SPLIT",
  "FEE",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "RETURN_OF_CAPITAL",
  "ADJUSTMENT",
  "MERGER_IN",
  "MERGER_OUT",
  "RIGHTS_ISSUE",
  "BONUS",
] as const;

export const createTransactionSchema = z.object({
  holdingId: z.string().cuid(),
  transactionType: z.enum(transactionTypes),
  tradeDate: z.coerce.date(),
  quantity: z.number().refine((n) => n !== 0, "Quantity cannot be zero"),
  price: z.number().min(0),
  brokerage: z.number().min(0).default(0),
  exchangeRate: z.number().positive().default(1),
  currency: z.string().length(3).default("AUD"),
  comments: z.string().max(500).optional(),
  frankedAmount: z.number().optional(),
  unfrankedAmount: z.number().optional(),
  frankingCredits: z.number().optional(),
  taxDeferred: z.number().optional(),
  foreignTax: z.number().optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
