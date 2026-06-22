export interface FieldMapping {
  tradeDate: string | null;
  instrumentCode: string | null;
  quantity: string | null;
  price: string | null;
  transactionType: string | null;
  marketCode?: string | null;
  brokerage?: string | null;
  currency?: string | null;
  exchangeRate?: string | null;
  comments?: string | null;
  combinedCode?: string | null;
  couponRate?: string | null;
  maturityDate?: string | null;
  faceValue?: string | null;
  paymentFrequency?: string | null;
}

export interface ImportConfig {
  mapping: FieldMapping;
  dateFormat: string;
  decimalSeparator: string;
  transactionTypeMap?: Record<string, string>;
}

export interface ParsedTransaction {
  tradeDate: Date;
  instrumentCode: string;
  marketCode: string;
  quantity: number;
  price: number;
  transactionType: string;
  brokerage: number;
  currency: string;
  exchangeRate: number;
  comments: string;
  accruedInterest?: number;
  instrumentName?: string;
  couponRate?: number;
  maturityDate?: Date;
  faceValue?: number;
  paymentFrequency?: string;
}

/** A custody / management fee invoice (portfolio level). */
export interface ParsedFee {
  feeType: string;
  invoiceNumber?: string;
  invoiceDate: Date;
  periodStart?: Date;
  periodEnd?: Date;
  chargeAmount: number;
  gst: number;
  total: number;
  currency: string;
  comments?: string;
}

/** Static instrument metadata used to enrich instruments on import. */
export interface InstrumentMeta {
  code: string;
  marketCode: string;
  name?: string;
  instrumentType?: string;
  sector?: string;
  currency?: string;
  couponRate?: number;
  paymentFrequency?: string;
  maturityDate?: Date;
  faceValue?: number;
  creditRating?: string;
}

export interface ImportResult {
  imported: ParsedTransaction[];
  rejected: Array<{
    row: number;
    data: Record<string, string>;
    errors: string[];
  }>;
  duplicates: Array<{ row: number; existingId: string }>;
}

export interface RawCsvRow {
  [key: string]: string;
}

// ─── Import categories ────────────────────────────────────────────────────────

/** The kind of data an import produces. */
export type ImportCategory = "transactions" | "bonds" | "cash";

// ─── Cash / bank statement imports ────────────────────────────────────────────

export interface CashFieldMapping {
  /** Transaction date column. */
  date: string | null;
  /** Signed amount column (positive = money in, negative = money out). */
  amount?: string | null;
  /** Separate debit (money out) column, used when there is no single signed amount. */
  debit?: string | null;
  /** Separate credit (money in) column. */
  credit?: string | null;
  /** Transaction type / category column (deposit, withdrawal, interest, fee...). */
  type?: string | null;
  /** Free-text description / narrative column. */
  description?: string | null;
}

export interface CashImportConfig {
  mapping: CashFieldMapping;
  dateFormat: string;
  decimalSeparator: string;
  /** Maps raw type strings to canonical cash transaction types. */
  typeMap?: Record<string, string>;
}

export interface CashParsedTransaction {
  date: Date;
  type: string;
  amount: number;
  description: string;
}

export interface CashImportResult {
  imported: CashParsedTransaction[];
  rejected: Array<{
    row: number;
    data: Record<string, string>;
    errors: string[];
  }>;
  duplicates: Array<{ row: number; existingId: string }>;
}

// ─── Template registry metadata ──────────────────────────────────────────────

export interface ImportTemplate {
  id: string;
  name: string;
  category: ImportCategory;
  /** Mapping config for transaction / bond templates. */
  config?: ImportConfig;
  /** Mapping config for cash templates. */
  cashConfig?: CashImportConfig;
  /** When true, this template can be run in one step without manual review. */
  quickImport?: boolean;
  /** Short hint shown in the UI. */
  description?: string;
}
