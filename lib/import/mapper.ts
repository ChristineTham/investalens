import type { ImportConfig, ParsedTransaction, RawCsvRow } from "./types";
import { transactionTypes } from "@/lib/validators/transaction";

interface MappingResult {
  transactions: ParsedTransaction[];
  errors: Array<{ row: number; data: RawCsvRow; errors: string[] }>;
}

export function mapRows(
  rows: RawCsvRow[],
  config: ImportConfig
): MappingResult {
  const transactions: ParsedTransaction[] = [];
  const errors: MappingResult["errors"] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowErrors: string[] = [];

    const tradeDate = parseDate(
      getField(row, config.mapping.tradeDate),
      config.dateFormat
    );
    if (!tradeDate) rowErrors.push("Invalid or missing trade date");
    if (tradeDate && tradeDate > new Date())
      rowErrors.push("Trade date is in the future");

    let instrumentCode = getField(row, config.mapping.instrumentCode);
    let marketCode = getField(row, config.mapping.marketCode) || "ASX";

    // Handle combined code (e.g. "TLS.ASX")
    if (!instrumentCode && config.mapping.combinedCode) {
      const combined = getField(row, config.mapping.combinedCode);
      if (combined) {
        const parts = combined.split(".");
        instrumentCode = parts[0];
        if (parts.length > 1) marketCode = parts[1];
      }
    }

    if (!instrumentCode) rowErrors.push("Missing instrument code");

    const quantity = parseNumber(
      getField(row, config.mapping.quantity),
      config.decimalSeparator
    );

    const rawType = getField(row, config.mapping.transactionType);
    const transactionType = mapTransactionType(
      rawType,
      config.transactionTypeMap
    );

    // Allow zero quantity for non-purchase/sale transaction types
    const zeroQuantityAllowed = [
      "DIVIDEND",
      "INTEREST",
      "COUPON",
      "RETURN_OF_CAPITAL",
      "BONUS",
      "FEE",
      "ADJUSTMENT",
      "MATURITY",
    ].includes(transactionType || "");

    if (quantity === null) {
      rowErrors.push("Invalid quantity");
    } else if (quantity === 0 && !zeroQuantityAllowed) {
      rowErrors.push("Invalid or zero quantity");
    } else if (quantity < 0) {
      rowErrors.push("Quantity cannot be negative");
    }

    const price = parseNumber(
      getField(row, config.mapping.price),
      config.decimalSeparator
    );
    if (price === null || price < 0) rowErrors.push("Invalid price");

    if (!transactionType)
      rowErrors.push(`Unknown transaction type: "${rawType}"`);

    const brokerage =
      parseNumber(
        getField(row, config.mapping.brokerage),
        config.decimalSeparator
      ) || 0;

    const currency = getField(row, config.mapping.currency) || "AUD";

    const exchangeRate =
      parseNumber(
        getField(row, config.mapping.exchangeRate),
        config.decimalSeparator
      ) || 1;

    const comments = getField(row, config.mapping.comments) || "";

    // Bond / fixed-interest fields (optional)
    const couponRate =
      parseNumber(
        getField(row, config.mapping.couponRate),
        config.decimalSeparator
      ) ?? undefined;
    const maturityDate =
      parseDate(
        getField(row, config.mapping.maturityDate),
        config.dateFormat
      ) ?? undefined;
    const faceValue =
      parseNumber(
        getField(row, config.mapping.faceValue),
        config.decimalSeparator
      ) ?? undefined;
    const paymentFrequency =
      getField(row, config.mapping.paymentFrequency) || undefined;

    if (rowErrors.length > 0) {
      errors.push({ row: i + 1, data: row, errors: rowErrors });
    } else {
      transactions.push({
        tradeDate: tradeDate!,
        instrumentCode: instrumentCode!.toUpperCase(),
        marketCode: marketCode.toUpperCase(),
        quantity: quantity!,
        price: price!,
        transactionType: transactionType!,
        brokerage,
        currency: currency.toUpperCase(),
        exchangeRate,
        comments,
        ...(couponRate !== undefined ? { couponRate } : {}),
        ...(maturityDate !== undefined ? { maturityDate } : {}),
        ...(faceValue !== undefined ? { faceValue } : {}),
        ...(paymentFrequency !== undefined ? { paymentFrequency } : {}),
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

function parseDate(value: string, format: string): Date | null {
  if (!value) return null;

  const cleaned = value.trim();

  // ISO format or wordy date formats
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

  // Handle 2-digit years
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

  // Handle parentheses as negative (accounting format)
  if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
    cleaned = "-" + cleaned.slice(1, -1);
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function mapTransactionType(
  raw: string,
  typeMap?: Record<string, string>
): string | null {
  if (!raw) return null;

  const upper = raw.toUpperCase().trim();

  // Check custom map first
  if (typeMap) {
    const mapped = typeMap[raw] || typeMap[upper];
    if (mapped) return mapped;
  }

  // Direct match
  if ((transactionTypes as readonly string[]).includes(upper)) return upper;

  // Common aliases
  const aliases: Record<string, string> = {
    B: "BUY",
    BUY: "BUY",
    PURCHASE: "BUY",
    S: "SELL",
    SELL: "SELL",
    SALE: "SELL",
    D: "DIVIDEND",
    DIV: "DIVIDEND",
    DIVIDEND: "DIVIDEND",
    DRP: "BUY", // Dividend reinvestment is a purchase of new units
    INT: "INTEREST",
    INTEREST: "INTEREST",
    SPLIT: "SPLIT",
    BONUS: "BONUS",
    FEE: "FEE",
    TRANSFER: "TRANSFER_IN",
  };

  return aliases[upper] || null;
}
