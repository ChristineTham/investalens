import type { ParsedTransaction } from "../types";
import type { CustomImporter, CustomImportOutput } from "./index";

/**
 * Example dedicated importer for a multi-sheet workbook.
 *
 * This demonstrates how to write a custom routine for a file that the
 * template-based mapper cannot handle. It reads a workbook that contains a
 * dedicated `Transactions` sheet and (optionally) a `Dividends` sheet, and
 * consolidates both into a single normalized transaction list.
 *
 * Use this as a starting point: copy it, adjust the sheet names / column
 * handling for your file, and register it in `customImporters`.
 */
export const exampleMultiSheetImporter: CustomImporter = {
  id: "example_multisheet",
  name: "Multi-sheet workbook (example)",
  description:
    "Reads an .xlsx with separate 'Transactions' and 'Dividends' sheets and merges them.",
  category: "transactions",
  accept: [".xlsx", ".xls"],

  async parse(file: File): Promise<CustomImportOutput> {
    const errors: CustomImportOutput["errors"] = [];
    const warnings: string[] = [];
    const transactions: ParsedTransaction[] = [];

    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    const readSheet = (name: string): Record<string, string>[] => {
      const match = workbook.SheetNames.find(
        (s) => s.toLowerCase() === name.toLowerCase()
      );
      if (!match) return [];
      const sheet = workbook.Sheets[match];
      return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
        defval: "",
        raw: false,
      });
    };

    const num = (v: unknown): number => {
      const n = parseFloat(String(v ?? "").replace(/[$ ,]/g, ""));
      return isNaN(n) ? 0 : n;
    };

    const parseDate = (v: unknown): Date | null => {
      const d = new Date(String(v ?? ""));
      return isNaN(d.getTime()) ? null : d;
    };

    // ── Transactions sheet ────────────────────────────────────────────────
    const txRows = readSheet("Transactions");
    if (txRows.length === 0) {
      warnings.push("No 'Transactions' sheet found in workbook.");
    }
    txRows.forEach((row, idx) => {
      const date = parseDate(row["Date"] ?? row["Trade Date"]);
      const code = String(row["Code"] ?? row["Symbol"] ?? "").trim();
      if (!date || !code) {
        errors.push({
          row: idx + 1,
          message: "Missing date or instrument code in Transactions sheet",
        });
        return;
      }
      transactions.push({
        tradeDate: date,
        instrumentCode: code.toUpperCase(),
        marketCode: String(row["Market"] ?? "ASX").toUpperCase(),
        quantity: num(row["Quantity"] ?? row["Units"]),
        price: num(row["Price"]),
        transactionType: String(row["Type"] ?? "BUY").toUpperCase(),
        brokerage: num(row["Brokerage"] ?? row["Fee"]),
        currency: String(row["Currency"] ?? "AUD").toUpperCase(),
        exchangeRate: num(row["FX"] ?? "1") || 1,
        comments: String(row["Notes"] ?? ""),
      });
    });

    // ── Dividends sheet (merged as DIVIDEND transactions) ─────────────────
    const divRows = readSheet("Dividends");
    divRows.forEach((row, idx) => {
      const date = parseDate(row["Date"] ?? row["Payment Date"]);
      const code = String(row["Code"] ?? row["Symbol"] ?? "").trim();
      if (!date || !code) {
        errors.push({
          row: idx + 1,
          message: "Missing date or code in Dividends sheet",
        });
        return;
      }
      transactions.push({
        tradeDate: date,
        instrumentCode: code.toUpperCase(),
        marketCode: String(row["Market"] ?? "ASX").toUpperCase(),
        quantity: 0,
        price: num(row["Amount"] ?? row["Total"]),
        transactionType: "DIVIDEND",
        brokerage: 0,
        currency: String(row["Currency"] ?? "AUD").toUpperCase(),
        exchangeRate: 1,
        comments: String(row["Notes"] ?? "Dividend"),
      });
    });

    return { category: "transactions", transactions, errors, warnings };
  },
};
