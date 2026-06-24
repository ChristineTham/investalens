import { db } from "@/lib/db";
import { ensureVirtualAccount, recomputeAccountBalance } from "@/lib/services/accounts";

/**
 * Auto-post a portfolio's cash activity to its virtual cash ledger.
 *
 * The virtual account is a derived, read-only ledger: it is fully rebuilt from
 * the portfolio's cash-affecting transactions and fees (idempotent). Physical
 * linked accounts are NOT auto-posted — their real movements are imported and
 * reconciled instead.
 */

const CASH_TX_TYPES = [
  "BUY",
  "SELL",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "DIVIDEND",
  "INTEREST",
  "COUPON",
  "RETURN_OF_CAPITAL",
];

function num(v: unknown): number {
  return v == null ? 0 : Number(v);
}

interface LedgerEntry {
  cashAccountId: string;
  type: string;
  amount: number; // positive magnitude
  date: Date;
  description: string;
  source: string;
}

function entryForTx(
  cashAccountId: string,
  tx: {
    transactionType: string;
    tradeDate: Date;
    quantity: unknown;
    price: unknown;
    brokerage: unknown;
    holding: { instrument: { code: string } };
  }
): LedgerEntry | null {
  const qty = num(tx.quantity);
  const price = num(tx.price);
  const broker = num(tx.brokerage);
  const gross = qty * price;
  const code = tx.holding.instrument.code;

  let type: string;
  let amount: number;
  switch (tx.transactionType) {
    case "BUY":
      type = "buy_settlement";
      amount = gross + broker;
      break;
    case "TRANSFER_IN":
      type = "transfer_in";
      amount = gross;
      break;
    case "SELL":
      type = "sell_settlement";
      amount = gross - broker;
      break;
    case "TRANSFER_OUT":
      type = "transfer_out";
      amount = gross;
      break;
    case "DIVIDEND":
      type = "dividend_received";
      amount = gross;
      break;
    case "INTEREST":
    case "COUPON":
      type = "interest";
      amount = gross;
      break;
    case "RETURN_OF_CAPITAL":
      type = "deposit";
      amount = gross;
      break;
    default:
      return null;
  }
  if (amount <= 0) return null;

  return {
    cashAccountId,
    type,
    amount,
    date: tx.tradeDate,
    description: `${code} ${tx.transactionType.replace(/_/g, " ").toLowerCase()}`,
    source: "portfolio",
  };
}

/** Rebuild the virtual cash ledger for a portfolio from its transactions + fees. */
export async function syncPortfolioLedger(portfolioId: string): Promise<void> {
  const account = await ensureVirtualAccount(portfolioId);

  const [txs, fees] = await Promise.all([
    db.transaction.findMany({
      where: {
        holding: { portfolioId },
        transactionType: { in: CASH_TX_TYPES },
      },
      include: { holding: { include: { instrument: { select: { code: true } } } } },
    }),
    db.fee.findMany({ where: { portfolioId } }),
  ]);

  const entries: LedgerEntry[] = [];
  for (const tx of txs) {
    const e = entryForTx(account.id, tx);
    if (e) entries.push(e);
  }
  for (const fee of fees) {
    const total = num(fee.total);
    if (total <= 0) continue;
    entries.push({
      cashAccountId: account.id,
      type: "fee",
      amount: total,
      date: fee.invoiceDate,
      description: `Custody fee${fee.invoiceNumber ? ` ${fee.invoiceNumber}` : ""}`,
      source: "portfolio",
    });
  }

  // Full idempotent rebuild of the auto-posted entries.
  await db.cashTransaction.deleteMany({
    where: { cashAccountId: account.id, source: "portfolio" },
  });
  if (entries.length > 0) {
    await db.cashTransaction.createMany({ data: entries });
  }
  await recomputeAccountBalance(account.id);
}
