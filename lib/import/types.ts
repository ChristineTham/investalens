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
  couponRate?: number;
  maturityDate?: Date;
  faceValue?: number;
  paymentFrequency?: string;
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
