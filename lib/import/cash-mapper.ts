import type {
  CashImportConfig,
  CashParsedTransaction,
  RawCsvRow,
} from "./types";

interface CashMappingResult {
  transactions: CashParsedTransaction[];
  errors: Array<{ row: number; data: RawCsvRow; errors: string[] }>;
}

/** Canonical cash transaction types that increase the account balance. */
export const CASH_CREDIT_TYPES = [
  "deposit",
  "interest",
  "dividend_received",
  "transfer_in",
];

/**
 * Map raw bank-statement rows to canonical cash transactions.
 *
 * Supports either a single signed `amount` column (positive = money in,
 * negative = money out) or separate `debit` / `credit` columns.
 */
export function mapCashRows(
  rows: RawCsvRow[],
  config: CashImportConfig
): CashMappingResult {
  const transactions: CashParsedTransaction[] = [];
  const errors: CashMappingResult["errors"] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowErrors: string[] = [];

    const date = parseDate(
      getField(row, config.mapping.date),
      config.dateFormat
    );
    if (!date) rowErrors.push("Invalid or missing date");
    if (date && date > new Date()) rowErrors.push("Date is in the future");

    // Resolve the signed amount and direction
    let signedAmount: number | null = null;

    if (config.mapping.amount) {
      signedAmount = parseNumber(
        getField(row, config.mapping.amount),
        config.decimalSeparator
      );
    } else {
      const debit = parseNumber(
        getField(row, config.mapping.debit),
        config.decimalSeparator
      );
      const credit = parseNumber(
        getField(row, config.mapping.credit),
        config.decimalSeparator
      );
      if (credit && credit !== 0) signedAmount = Math.abs(credit);
      else if (debit && debit !== 0) signedAmount = -Math.abs(debit);
      else signedAmount = 0;
    }

    if (signedAmount === null) {
      rowErrors.push("Invalid or missing amount");
    } else if (signedAmount === 0) {
      rowErrors.push("Zero amount");
    }

    const description = getField(row, config.mapping.description) || "";

    // Determine type: explicit type column wins, otherwise infer from sign
    const rawType = getField(row, config.mapping.type);
    let type = mapCashType(rawType, config.typeMap);
    if (!type && signedAmount !== null) {
      type = signedAmount >= 0 ? "deposit" : "withdrawal";
    }

    if (rowErrors.length > 0) {
      errors.push({ row: i + 1, data: row, errors: rowErrors });
    } else {
      transactions.push({
        date: date!,
        type: type!,
        amount: Math.abs(signedAmount!),
        description,
      });
    }
  }

  return { transactions, errors };
}

function getField(
  row: RawCsvRow,
  fieldName: string | null | undefined
): string {
  if (!fieldName) return "";
  return row[fieldName] || "";
}

function mapCashType(
  raw: string,
  typeMap?: Record<string, string>
): string | null {
  if (!raw) return null;
  const upper = raw.toUpperCase().trim();

  if (typeMap) {
    const mapped = typeMap[raw] || typeMap[upper];
    if (mapped) return mapped;
  }

  const aliases: Record<string, string> = {
    DEPOSIT: "deposit",
    CREDIT: "deposit",
    WITHDRAWAL: "withdrawal",
    DEBIT: "withdrawal",
    INTEREST: "interest",
    FEE: "fee",
    DIVIDEND: "dividend_received",
    "DIVIDEND RECEIVED": "dividend_received",
    "TRANSFER IN": "transfer_in",
    "TRANSFER OUT": "transfer_out",
  };

  return aliases[upper] || null;
}

function parseDate(value: string, format: string): Date | null {
  if (!value) return null;
  const cleaned = value.trim();

  if (
    format === "yyyy-mm-dd" ||
    format === "yyyy/mm/dd" ||
    format === "dd mmm yyyy" ||
    format === "dd mmm yyyy hh:mm"
  ) {
    const d = new Date(cleaned);
    return isNaN(d.getTime()) ? null : d;
  }

  const separators = cleaned.match(/[/\-.]/);
  const sep = separators ? separators[0] : "/";
  const parts = cleaned.split(sep);
  if (parts.length !== 3) return null;

  let day: number, month: number, year: number;
  if (format.startsWith("dd")) {
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    year = parseInt(parts[2], 10);
  } else if (format.startsWith("mm")) {
    month = parseInt(parts[0], 10) - 1;
    day = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  } else {
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  }

  if (year < 100) year += year > 50 ? 1900 : 2000;

  const date = new Date(year, month, day);
  if (isNaN(date.getTime())) return null;
  if (date.getDate() !== day || date.getMonth() !== month) return null;
  return date;
}

function parseNumber(value: string, decimalSeparator: string): number | null {
  if (!value) return null;
  let cleaned = value.replace(/[$ ,]/g, "");

  if (decimalSeparator === ",") {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  }

  if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
    cleaned = "-" + cleaned.slice(1, -1);
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}
