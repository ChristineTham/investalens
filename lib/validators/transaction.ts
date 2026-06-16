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

const zeroQuantityAllowedTypes = [
  "DIVIDEND",
  "INTEREST",
  "COUPON",
  "RETURN_OF_CAPITAL",
  "BONUS",
  "FEE",
  "ADJUSTMENT",
  "MATURITY",
] as const;

export const createTransactionSchema = z
  .object({
    holdingId: z.string().cuid(),
    transactionType: z.enum(transactionTypes),
    tradeDate: z.coerce.date(),
    quantity: z.number(),
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
  })
  .superRefine((data, ctx) => {
    if (
      data.quantity === 0 &&
      !zeroQuantityAllowedTypes.includes(
        data.transactionType as (typeof zeroQuantityAllowedTypes)[number]
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Quantity cannot be zero for this transaction type",
        path: ["quantity"],
      });
    }
    if (data.quantity < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Quantity cannot be negative",
        path: ["quantity"],
      });
    }
  });

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
