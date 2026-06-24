import { parseStrict } from "ofx-js";
import {
  type BankStatementParseResult,
  type BankStatementTransaction,
  canonicalOfxType,
} from "./bank-statement";

// Loose shape of the parts of the ofx-js result we use. STMTTRN / statement
// responses may be a single object or an array.
interface OfxTxn {
  DTPOSTED?: string;
  TRNAMT?: string | number;
  FITID?: string | number;
  NAME?: string;
  MEMO?: string;
  TRNTYPE?: string;
}
interface OfxStmtRs {
  CURDEF?: string;
  BANKACCTFROM?: { BANKID?: string | number; ACCTID?: string | number };
  CCACCTFROM?: { ACCTID?: string | number };
  BANKTRANLIST?: { STMTTRN?: OfxTxn | OfxTxn[] };
}
interface OfxStmtTrnRs {
  STMTRS?: OfxStmtRs;
  CCSTMTRS?: OfxStmtRs;
}
interface OfxRoot {
  OFX?: {
    BANKMSGSRSV1?: { STMTTRNRS?: OfxStmtTrnRs | OfxStmtTrnRs[] };
    CREDITCARDMSGSRSV1?: { CCSTMTTRNRS?: OfxStmtTrnRs | OfxStmtTrnRs[] };
  };
}

function toArray<T>(v: T | T[] | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function parseOfxDate(raw: string | number | undefined): Date | null {
  if (raw == null) return null;
  const m = String(raw).match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Parse an OFX / QFX bank or credit-card statement file. */
export function parseOfx(content: string): BankStatementParseResult {
  const data = parseStrict(content) as unknown as OfxRoot;

  const responses: OfxStmtTrnRs[] = [
    ...toArray(data.OFX?.BANKMSGSRSV1?.STMTTRNRS),
    ...toArray(data.OFX?.CREDITCARDMSGSRSV1?.CCSTMTTRNRS),
  ];

  const transactions: BankStatementTransaction[] = [];
  let account: BankStatementParseResult["account"];

  for (const resp of responses) {
    const stmt = resp.STMTRS ?? resp.CCSTMTRS;
    if (!stmt) continue;

    if (!account) {
      const acct = stmt.BANKACCTFROM ?? stmt.CCACCTFROM;
      account = {
        bankId: acct && "BANKID" in acct ? String(acct.BANKID ?? "") : undefined,
        acctId: acct?.ACCTID != null ? String(acct.ACCTID) : undefined,
        currency: stmt.CURDEF,
      };
    }

    for (const t of toArray(stmt.BANKTRANLIST?.STMTTRN)) {
      const date = parseOfxDate(t.DTPOSTED);
      const amount = Number(t.TRNAMT);
      if (!date || !Number.isFinite(amount) || amount === 0) continue;
      const description = [t.NAME, t.MEMO].filter(Boolean).join(" — ").trim();
      transactions.push({
        date,
        amount,
        type: canonicalOfxType(t.TRNTYPE, amount),
        description,
        fitId: t.FITID != null ? String(t.FITID) : undefined,
      });
    }
  }

  return { transactions, account };
}
