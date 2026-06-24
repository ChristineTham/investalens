import {
  type BankStatementParseResult,
  type BankStatementTransaction,
} from "./bank-statement";

/**
 * Parse a QIF date. Quicken uses several forms; this assumes day-first (AU)
 * for slash-separated dates and also accepts ISO. The apostrophe form
 * (`MM/DD'YY`) and 2-digit years are handled.
 */
function parseQifDate(raw: string): Date | null {
  const s = raw.trim().replace(/'/g, "/").replace(/\s+/g, "");
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const parts = s.split(/[/.-]/).map((p) => Number(p));
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    let [day, month, year] = parts;
    if (year < 100) year += year < 70 ? 2000 : 1900;
    if (month > 12 && day <= 12) [day, month] = [month, day]; // tolerate MM/DD
    const d = new Date(year, month - 1, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseAmount(raw: string): number {
  return Number(raw.replace(/[^0-9.-]/g, ""));
}

/** Parse a QIF (Quicken Interchange Format) bank statement. */
export function parseQif(content: string): BankStatementParseResult {
  const transactions: BankStatementTransaction[] = [];
  const lines = content.split(/\r?\n/);

  let date: Date | null = null;
  let amount = 0;
  let payee = "";
  let memo = "";

  const flush = () => {
    if (date && Number.isFinite(amount) && amount !== 0) {
      const description = [payee, memo].filter(Boolean).join(" — ").trim();
      transactions.push({
        date,
        amount,
        type: amount >= 0 ? "deposit" : "withdrawal",
        description,
      });
    }
    date = null;
    amount = 0;
    payee = "";
    memo = "";
  };

  for (const line of lines) {
    if (!line) continue;
    const code = line[0];
    const value = line.slice(1).trim();
    switch (code) {
      case "!": // header (e.g. !Type:Bank) — ignore
        break;
      case "D":
        date = parseQifDate(value);
        break;
      case "T":
      case "U":
        amount = parseAmount(value);
        break;
      case "P":
        payee = value;
        break;
      case "M":
        memo = value;
        break;
      case "^":
        flush();
        break;
      default:
        break;
    }
  }
  flush();

  return { transactions };
}
