// Shared CSV cell escaping. Lives outside csv-export.ts because that file is
// a "use server" module and may only export async server actions.

// Plain numeric strings (e.g. "-123.45") must not be treated as formulas.
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

export function escapeCsv(value: string): string {
  let v = value;
  // Neutralise spreadsheet formula injection: prefix cells starting with
  // =, +, -, @, tab, or CR with a single quote.
  if (/^[=+\-@\t\r]/.test(v) && !PLAIN_NUMBER.test(v)) {
    v = `'${v}`;
  }
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
