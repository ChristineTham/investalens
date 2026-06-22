import type {
  ParsedTransaction,
  ParsedFee,
  InstrumentMeta,
} from "../types";
import type { CustomImporter, CustomImportOutput } from "./index";

type Row = Record<string, string>;

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Parse FIIG date strings like "26-Mar-2024" (also tolerates ISO). */
function parseFiigDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  const str = String(value).trim();
  const parts = str.split("-");
  if (parts.length === 3 && isNaN(Number(parts[1]))) {
    const day = parseInt(parts[0], 10);
    const month = MONTHS[parts[1].toLowerCase().slice(0, 3)];
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function num(value: unknown): number {
  if (value == null || value === "") return 0;
  const cleaned = String(value).replace(/[$,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/** Extract a coupon rate fraction from a name like "AMPOL-5.85%-30Jan34c". */
function couponFromName(name: string): number | undefined {
  const match = name.match(/-(\d+(?:\.\d+)?)%/);
  if (!match) return undefined;
  return parseFloat(match[1]) / 100;
}

function assetClassToMarket(assetClass: string): string {
  const upper = (assetClass || "").toUpperCase();
  if (upper === "ASX") return "ASX";
  return "OTC";
}

/**
 * Dedicated importer for the FIIG Securities data-extract workbook.
 *
 * The file contains separate sheets for current holdings, transaction history,
 * income payments and custody fees. This importer consolidates:
 *   - TransactionHistory → BUY / SELL bond trades (with accrued interest)
 *   - IncomePayments      → COUPON income + RETURN_OF_CAPITAL principal
 *   - Fees                → portfolio custody fee invoices
 *   - SecurityStatic      → instrument metadata (type, sector, frequency, dates)
 */
export const fiigImporter: CustomImporter = {
  id: "fiig_extract",
  name: "FIIG Data Extract (.xls)",
  description:
    "Full FIIG bond portfolio workbook — trades, coupon income and custody fees across multiple sheets.",
  category: "bonds",
  accept: [".xls", ".xlsx"],

  async parse(file: File): Promise<CustomImportOutput> {
    const errors: CustomImportOutput["errors"] = [];
    const warnings: string[] = [];

    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

    const readSheet = (name: string): Row[] => {
      const match = workbook.SheetNames.find(
        (s) => s.toLowerCase() === name.toLowerCase()
      );
      if (!match) return [];
      return XLSX.utils.sheet_to_json<Row>(workbook.Sheets[match], {
        defval: "",
        raw: false,
      });
    };

    // ── Build instrument metadata + market lookup ─────────────────────────
    const marketByCode = new Map<string, string>();
    const instruments = new Map<string, InstrumentMeta>();

    const registerMarket = (code: string, assetClass: string) => {
      if (code && !marketByCode.has(code)) {
        marketByCode.set(code, assetClassToMarket(assetClass));
      }
    };

    for (const r of readSheet("CurrentHoldings")) {
      registerMarket(r["InstrumentCode"], r["AssetClass"]);
    }
    for (const r of readSheet("TransactionHistory")) {
      registerMarket(r["InstrumentCode"], r["AssetClass"]);
    }
    for (const r of readSheet("IncomePayments")) {
      registerMarket(r["InstrumentCode"], r["AssetClass"]);
    }

    const marketFor = (code: string) => marketByCode.get(code) || "OTC";

    for (const r of readSheet("SecurityStatic")) {
      const code = (r["InstrumentCode"] || "").trim();
      if (!code) continue;
      const name = (r["InstrumentName"] || "").trim();
      const marketCode = marketFor(code);
      instruments.set(`${code}|${marketCode}`, {
        code,
        marketCode,
        name,
        instrumentType: "bond",
        sector: (r["InstrumentSector"] || "").trim() || undefined,
        currency: (r["CurrencyCode"] || "AUD").trim() || "AUD",
        couponRate: couponFromName(name),
        paymentFrequency: (r["InterestFrequency"] || "").trim() || undefined,
        maturityDate:
          parseFiigDate(r["MaturityDate"]) ||
          parseFiigDate(r["CallDate"]) ||
          undefined,
        faceValue: 100,
      });
    }

    // Enrich coupon / maturity from CurrentHoldings where static is missing
    for (const r of readSheet("CurrentHoldings")) {
      const code = (r["InstrumentCode"] || "").trim();
      if (!code) continue;
      const key = `${code}|${marketFor(code)}`;
      const name = (r["InstrumentName"] || "").trim();
      const existing = instruments.get(key);
      if (!existing) {
        instruments.set(key, {
          code,
          marketCode: marketFor(code),
          name,
          instrumentType: "bond",
          currency: (r["CurrencyCode"] || "AUD").trim() || "AUD",
          couponRate: couponFromName(name),
          maturityDate: parseFiigDate(r["MaturityCallDate"]) || undefined,
          faceValue: 100,
        });
      }
    }

    const transactions: ParsedTransaction[] = [];

    // ── TransactionHistory → BUY / SELL ───────────────────────────────────
    readSheet("TransactionHistory").forEach((r, idx) => {
      const code = (r["InstrumentCode"] || "").trim();
      const tradeDate =
        parseFiigDate(r["SettlementDate"]) || parseFiigDate(r["TradeDate"]);
      const faceValue = num(r["FaceValue"]);
      const capitalValue = num(r["CapitalValue"]);
      const rawType = (r["TradeType"] || "").toUpperCase();

      if (!code || !tradeDate || faceValue === 0) {
        errors.push({
          row: idx + 2,
          message: `TransactionHistory: missing code/date/face value (${code})`,
        });
        return;
      }

      const type = rawType === "SELL" ? "SELL" : "BUY";
      // price expressed per $1 of face value so quantity*price = capital value
      const price = capitalValue / faceValue;
      const name = (r["InstrumentName"] || "").trim();

      transactions.push({
        tradeDate,
        instrumentCode: code.toUpperCase(),
        marketCode: marketFor(code),
        instrumentName: name,
        quantity: faceValue,
        price,
        transactionType: type,
        brokerage: 0,
        accruedInterest: num(r["AccruedInterest"]),
        currency: (r["CurrencyCode"] || "AUD").trim() || "AUD",
        exchangeRate: 1,
        comments:
          (r["TradeComments"] || "").trim() ||
          `${name} ${r["InstrumentIssuer"] || ""}`.trim(),
        couponRate: couponFromName(name),
        maturityDate: parseFiigDate(r["MaturityDate"]) || undefined,
        faceValue: 100,
      });
    });

    // ── IncomePayments → COUPON + RETURN_OF_CAPITAL ───────────────────────
    readSheet("IncomePayments").forEach((r, idx) => {
      const code = (r["InstrumentCode"] || "").trim();
      const payDate = parseFiigDate(r["PaymentDate"]);
      const interest = num(r["InterestPayment"]);
      const principal = num(r["PrincipalPayment"]);
      const name = (r["InstrumentName"] || "").trim();

      if (!code || !payDate) {
        errors.push({
          row: idx + 2,
          message: `IncomePayments: missing code/date (${code})`,
        });
        return;
      }

      if (interest !== 0) {
        transactions.push({
          tradeDate: payDate,
          instrumentCode: code.toUpperCase(),
          marketCode: marketFor(code),
          instrumentName: name,
          quantity: 1,
          price: interest,
          transactionType: "COUPON",
          brokerage: 0,
          currency: (r["Currency"] || "AUD").trim() || "AUD",
          exchangeRate: 1,
          comments: "Coupon payment",
        });
      }

      if (principal !== 0) {
        transactions.push({
          tradeDate: payDate,
          instrumentCode: code.toUpperCase(),
          marketCode: marketFor(code),
          instrumentName: name,
          quantity: 1,
          price: principal,
          transactionType: "RETURN_OF_CAPITAL",
          brokerage: 0,
          currency: (r["Currency"] || "AUD").trim() || "AUD",
          exchangeRate: 1,
          comments: "Principal repayment",
        });
      }
    });

    // ── Fees → custody fee invoices ───────────────────────────────────────
    const fees: ParsedFee[] = [];
    readSheet("Fees").forEach((r, idx) => {
      const invoiceDate = parseFiigDate(r["InvoiceDate"]);
      const total = num(r["InvoiceTotal"]);
      if (!invoiceDate) {
        errors.push({
          row: idx + 2,
          message: `Fees: missing invoice date`,
        });
        return;
      }
      if (total === 0 && num(r["ChargeAmount"]) === 0) return; // skip nil invoices

      // Parse "26 Mar 2024 - 31 Mar 2024" period
      let periodStart: Date | undefined;
      let periodEnd: Date | undefined;
      const period = (r["InvoicePeriod"] || "").split(" - ");
      if (period.length === 2) {
        periodStart = parseFiigDate(period[0].trim()) || undefined;
        periodEnd = parseFiigDate(period[1].trim()) || undefined;
      }

      fees.push({
        feeType: "custody",
        invoiceNumber: (r["InvoiceNumber"] || "").trim() || undefined,
        invoiceDate,
        periodStart,
        periodEnd,
        chargeAmount: num(r["ChargeAmount"]),
        gst: num(r["GST"]),
        total,
        currency: "AUD",
        comments: "FIIG custody fee",
      });
    });

    if (transactions.length === 0) {
      warnings.push("No transactions found in TransactionHistory sheet.");
    }

    return {
      category: "bonds",
      transactions,
      fees,
      instruments: [...instruments.values()],
      errors,
      warnings,
    };
  },
};
