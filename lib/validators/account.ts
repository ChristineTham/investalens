import { z } from "zod";

export const ACCOUNT_TYPES = [
  "transaction",
  "savings",
  "offset",
  "term_deposit",
  "credit_card",
  "cash",
] as const;

export const CATEGORY_KINDS = [
  "income",
  "expense",
  "transfer",
  "investment",
  "fee",
  "interest",
] as const;

/** Canonical cash transaction types (see CASH_CREDIT_TYPES for direction). */
export const CASH_TRANSACTION_TYPES = [
  "deposit",
  "withdrawal",
  "interest",
  "fee",
  "transfer_in",
  "transfer_out",
  "dividend_received",
  "buy_settlement",
  "sell_settlement",
  "other",
] as const;

export const createAccountSchema = z.object({
  name: z.string().min(1).max(120),
  institution: z.string().max(120).nullable().optional(),
  bsb: z
    .string()
    .max(7)
    .regex(/^\d{3}-?\d{3}$/, "BSB must be 6 digits (nnn-nnn)")
    .nullable()
    .optional(),
  accountNumber: z.string().max(40).nullable().optional(),
  accountType: z.enum(ACCOUNT_TYPES).default("transaction"),
  currency: z.string().length(3).default("AUD"),
  openingBalance: z.number().default(0),
  interestRate: z.number().min(0).max(1).nullable().optional(),
  website: z.string().max(300).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateAccountSchema = createAccountSchema.partial().extend({
  archived: z.boolean().optional(),
});

export const cashTransactionSchema = z.object({
  type: z.enum(CASH_TRANSACTION_TYPES),
  amount: z.number().positive(),
  date: z.coerce.date(),
  description: z.string().max(500).nullable().optional(),
  categoryId: z.string().nullable().optional(),
});

export const debitCardSchema = z.object({
  label: z.string().max(80).nullable().optional(),
  last4: z
    .string()
    .regex(/^\d{4}$/, "Enter the last 4 digits")
    .nullable()
    .optional(),
  network: z.enum(["visa", "mastercard", "eftpos", "amex"]).nullable().optional(),
  expiry: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Use MM/YY")
    .nullable()
    .optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1).max(80),
  kind: z.enum(CATEGORY_KINDS).default("expense"),
  color: z.string().max(32).nullable().optional(),
  parentId: z.string().nullable().optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type CashTransactionInput = z.infer<typeof cashTransactionSchema>;
export type DebitCardInput = z.infer<typeof debitCardSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
