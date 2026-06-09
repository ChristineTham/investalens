import Papa from "papaparse";
import type { RawCsvRow } from "./types";

export interface CsvParseResult {
  headers: string[];
  rows: RawCsvRow[];
  delimiter: string;
  rowCount: number;
}

export function parseCsv(content: string): CsvParseResult {
  // Remove BOM if present
  const cleaned = content.replace(/^\uFEFF/, "");

  const result = Papa.parse<RawCsvRow>(cleaned, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim(),
  });

  return {
    headers: result.meta.fields || [],
    rows: result.data,
    delimiter: result.meta.delimiter,
    rowCount: result.data.length,
  };
}

export async function parseCsvFile(file: File): Promise<CsvParseResult> {
  const text = await file.text();
  return parseCsv(text);
}
