/**
 * Convert an uploaded file (CSV/TXT or Excel) into CSV text.
 *
 * For Excel files, leading title/metadata rows are stripped by locating the
 * first row that looks like a header (>= 4 non-empty cells). Runs in the
 * browser; the `xlsx` package is loaded lazily to keep it out of the bundle.
 */
export async function fileToCsv(file: File): Promise<string> {
  const isExcel =
    file.name.toLowerCase().endsWith(".xlsx") ||
    file.name.toLowerCase().endsWith(".xls");

  if (!isExcel) {
    return file.text();
  }

  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });

  let headerRowIndex = 0;
  for (let r = 0; r < rawRows.length; r++) {
    const nonNullCount = rawRows[r].filter(
      (cell: unknown) => cell !== null && cell !== undefined && cell !== ""
    ).length;
    if (nonNullCount >= 4) {
      headerRowIndex = r;
      break;
    }
  }

  const cleanRows = rawRows.slice(headerRowIndex);
  const cleanWorksheet = XLSX.utils.aoa_to_sheet(cleanRows);
  return XLSX.utils.sheet_to_csv(cleanWorksheet);
}
