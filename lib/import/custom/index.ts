import type {
  ImportCategory,
  ParsedTransaction,
  CashParsedTransaction,
  ParsedFee,
  InstrumentMeta,
} from "../types";
import { exampleMultiSheetImporter } from "./example-multisheet";
import { fiigImporter } from "./fiig";

/**
 * Normalized output produced by a custom importer. A custom importer fully owns
 * parsing of a complex file (e.g. a multi-sheet workbook) and emits the same
 * normalized shapes the template pipeline produces, so the result can flow
 * through the shared duplicate-resolution and persistence steps.
 */
export interface CustomImportOutput {
  category: ImportCategory;
  /** Equity / bond transactions (for category "transactions" | "bonds"). */
  transactions?: ParsedTransaction[];
  /** Cash transactions (for category "cash"). */
  cashTransactions?: CashParsedTransaction[];
  /** Target cash account name when category is "cash". */
  cashAccountName?: string;
  /** Custody / management fee invoices. */
  fees?: ParsedFee[];
  /** Static instrument metadata to enrich instruments on import. */
  instruments?: InstrumentMeta[];
  errors: Array<{ row: number; message: string }>;
  warnings?: string[];
}

/**
 * A dedicated importer for files that templates cannot handle — for example a
 * spreadsheet with multiple sheets, merged headers, or a bespoke layout.
 *
 * Custom importers run in the browser (they receive a `File`), parse it however
 * they need, and return normalized output. Register new importers by adding them
 * to {@link customImporters}.
 */
export interface CustomImporter {
  id: string;
  name: string;
  description: string;
  category: ImportCategory;
  /** Accepted file extensions, e.g. `[".xlsx", ".xls"]`. */
  accept: string[];
  /** Parse a file into normalized import output. */
  parse: (file: File) => Promise<CustomImportOutput>;
}

/** Registry of available custom importers. Add new dedicated routines here. */
export const customImporters: CustomImporter[] = [
  fiigImporter,
  exampleMultiSheetImporter,
];

export function listCustomImporters(): CustomImporter[] {
  return customImporters;
}

export function getCustomImporter(id: string): CustomImporter | null {
  return customImporters.find((c) => c.id === id) || null;
}
