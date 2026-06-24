import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CREDIT_TYPES } from "@/lib/services/accounts";

/** Portfolio side of a reconciliation: a transaction or a fee with its cash impact. */
export interface PortfolioTxCandidate {
  /** UI key, e.g. `tx:<id>` or `fee:<id>`. */
  key: string;
  kind: "transaction" | "fee";
  refId: string;
  date: string;
  portfolioName: string;
  label: string;
  /** Signed expected cash flow (+ inflow / − outflow). */
  cashAmount: number;
  instrumentCode: string | null;
  transactionType: string | null;
}

export interface ReconLink {
  reconciliationId: string;
  kind: "transaction" | "fee";
  targetLabel: string;
  portfolioName: string;
  cashAmount: number;
  matchType: string;
  transactionId: string | null;
  transactionType: string | null;
  franking: {
    frankedAmount: number | null;
    unfrankedAmount: number | null;
    frankingCredits: number | null;
    taxDeferred: number | null;
    foreignTax: number | null;
  } | null;
}

export interface ReconAccountTx {
  id: string;
  date: string;
  amount: number; // signed
  type: string;
  description: string;
  links: ReconLink[];
  /** Sum of linked candidate cash (signed). */
  linkedTotal: number;
  /** amount − linkedTotal (still to be matched). */
  remaining: number;
  status: "unreconciled" | "partial" | "reconciled";
  /** Suggested candidate keys to cover the remaining amount (single or split). */
  suggestion: { keys: string[]; confidence: number } | null;
}

export interface ReconciliationData {
  accountId: string;
  currency: string;
  accountTxs: ReconAccountTx[];
  candidates: PortfolioTxCandidate[];
}

const DAY = 86_400_000;
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

/** Signed bank-account amount (positive magnitude + type → signed). */
export function signedAccountAmount(type: string, amount: number): number {
  return CREDIT_TYPES.has(type) ? Math.abs(amount) : -Math.abs(amount);
}

/** Signed expected cash flow for a portfolio transaction. */
export function txCash(
  type: string,
  qty: number,
  price: number,
  brokerage: number
): number | null {
  const gross = qty * price;
  switch (type) {
    case "BUY":
    case "TRANSFER_IN":
      return -(gross + brokerage);
    case "SELL":
    case "TRANSFER_OUT":
      return gross - brokerage;
    case "DIVIDEND":
    case "INTEREST":
    case "COUPON":
    case "RETURN_OF_CAPITAL":
      return gross;
    default:
      return null;
  }
}

function tolerance(amount: number): number {
  return Math.max(0.5, Math.abs(amount) * 0.01);
}

/**
 * Settlement-aware date weight (0..1) or null if outside the plausible window.
 * Bank movements usually post on the settlement date — a few days **after** the
 * trade date (T+2/T+3) — so a small positive offset is expected and not
 * penalised; bank dates well before the trade date are unlikely.
 */
function dateWeight(bankDate: string, candDate: string): number | null {
  const days =
    (new Date(bankDate).getTime() - new Date(candDate).getTime()) / DAY;
  if (days < -3 || days > 7) return null;
  if (days >= 0 && days <= 4) return 1; // same day → ~T+4 settlement window
  if (days < 0) return Math.max(0, 1 - (Math.abs(days) / 3) * 0.6);
  return Math.max(0, 1 - ((days - 4) / 3) * 0.6);
}

function scoreSingle(
  target: number,
  bankDate: string,
  bankDesc: string,
  cand: PortfolioTxCandidate
): number | null {
  if (Math.sign(cand.cashAmount) !== Math.sign(target)) return null;
  const amtDiff = Math.abs(Math.abs(target) - Math.abs(cand.cashAmount));
  const amtTol = tolerance(cand.cashAmount);
  if (amtDiff > amtTol) return null;
  const dw = dateWeight(bankDate, cand.date);
  if (dw == null) return null;

  let conf = 0.55 + (1 - amtDiff / Math.max(amtTol, 0.01)) * 0.25 + dw * 0.1;
  if (
    cand.instrumentCode &&
    bankDesc.toUpperCase().includes(cand.instrumentCode.toUpperCase())
  ) {
    conf += 0.1;
  }
  return Math.min(conf, 0.99);
}

/** Find a small combination (2–3) of candidates that sums to the target. */
function findCombo(
  target: number,
  pool: PortfolioTxCandidate[]
): { keys: string[]; confidence: number } | null {
  const tol = tolerance(target);
  const arr = pool.slice(0, 24);

  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (Math.abs(arr[i].cashAmount + arr[j].cashAmount - target) <= tol) {
        return { keys: [arr[i].key, arr[j].key], confidence: 0.72 };
      }
    }
  }
  const cap = Math.min(arr.length, 14);
  for (let i = 0; i < cap; i++) {
    for (let j = i + 1; j < cap; j++) {
      for (let k = j + 1; k < cap; k++) {
        if (
          Math.abs(
            arr[i].cashAmount + arr[j].cashAmount + arr[k].cashAmount - target
          ) <= tol
        ) {
          return {
            keys: [arr[i].key, arr[j].key, arr[k].key],
            confidence: 0.62,
          };
        }
      }
    }
  }
  return null;
}

/**
 * Suggest candidates to cover `target` (the remaining unmatched amount): the
 * best single fuzzy match, otherwise a split combination.
 */
function suggest(
  target: number,
  bankDate: string,
  bankDesc: string,
  candidates: PortfolioTxCandidate[]
): { keys: string[]; confidence: number } | null {
  if (Math.abs(target) < 0.01) return null;
  const pool = candidates.filter(
    (c) =>
      Math.sign(c.cashAmount) === Math.sign(target) &&
      dateWeight(bankDate, c.date) != null
  );

  let best: { key: string; conf: number } | null = null;
  for (const c of pool) {
    const s = scoreSingle(target, bankDate, bankDesc, c);
    if (s != null && (!best || s > best.conf)) best = { key: c.key, conf: s };
  }
  if (best) return { keys: [best.key], confidence: best.conf };

  return findCombo(target, pool);
}

/** Build the reconciliation workspace for a (physical) account. */
export async function getReconciliationData(
  accountId: string
): Promise<ReconciliationData> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const account = await db.cashAccount.findFirst({
    where: { id: accountId, userId: session.user.id },
    select: { id: true, currency: true },
  });
  if (!account) throw new Error("Account not found");

  const links = await db.portfolioAccount.findMany({
    where: { cashAccountId: accountId },
    select: { portfolioId: true },
  });
  const portfolioIds = links.map((l) => l.portfolioId);

  const txs = await db.cashTransaction.findMany({
    where: { cashAccountId: accountId },
    orderBy: { date: "desc" },
    include: {
      reconciliations: {
        include: {
          transaction: {
            include: {
              holding: {
                include: {
                  instrument: true,
                  portfolio: { select: { name: true } },
                },
              },
            },
          },
          fee: { include: { portfolio: { select: { name: true } } } },
        },
      },
    },
  });

  // Candidates already linked anywhere on this account are excluded.
  const usedTxIds = new Set<string>();
  const usedFeeIds = new Set<string>();
  for (const t of txs)
    for (const rec of t.reconciliations) {
      if (rec.transactionId) usedTxIds.add(rec.transactionId);
      if (rec.feeId) usedFeeIds.add(rec.feeId);
    }

  // ── Candidate pool ──────────────────────────────────────────────────────────
  const candidates: PortfolioTxCandidate[] = [];
  if (portfolioIds.length > 0) {
    const [portfolioTxs, fees] = await Promise.all([
      db.transaction.findMany({
        where: {
          holding: { portfolioId: { in: portfolioIds } },
          transactionType: { in: CASH_TX_TYPES },
        },
        include: {
          holding: {
            include: { instrument: true, portfolio: { select: { name: true } } },
          },
        },
        orderBy: { tradeDate: "desc" },
        take: 500,
      }),
      db.fee.findMany({
        where: { portfolioId: { in: portfolioIds } },
        include: { portfolio: { select: { name: true } } },
        orderBy: { invoiceDate: "desc" },
        take: 200,
      }),
    ]);

    for (const tx of portfolioTxs) {
      if (usedTxIds.has(tx.id)) continue;
      const cash = txCash(
        tx.transactionType,
        num(tx.quantity),
        num(tx.price),
        num(tx.brokerage)
      );
      if (cash == null || cash === 0) continue;
      const isIncome = [
        "DIVIDEND",
        "INTEREST",
        "COUPON",
        "RETURN_OF_CAPITAL",
      ].includes(tx.transactionType);
      candidates.push({
        key: `tx:${tx.id}`,
        kind: "transaction",
        refId: tx.id,
        date: tx.tradeDate.toISOString().split("T")[0],
        portfolioName: tx.holding.portfolio.name,
        label: isIncome
          ? `${tx.holding.instrument.code} ${tx.transactionType}`
          : `${tx.holding.instrument.code} ${tx.transactionType} ${num(tx.quantity)} @ ${num(tx.price)}`,
        cashAmount: cash,
        instrumentCode: tx.holding.instrument.code,
        transactionType: tx.transactionType,
      });
    }

    for (const fee of fees) {
      if (usedFeeIds.has(fee.id)) continue;
      candidates.push({
        key: `fee:${fee.id}`,
        kind: "fee",
        refId: fee.id,
        date: fee.invoiceDate.toISOString().split("T")[0],
        portfolioName: fee.portfolio.name,
        label: `Custody fee${fee.invoiceNumber ? ` ${fee.invoiceNumber}` : ""}`,
        cashAmount: -num(fee.total),
        instrumentCode: null,
        transactionType: null,
      });
    }
  }

  // ── Account transactions with links, status and suggestions ─────────────────
  const accountTxs: ReconAccountTx[] = txs.map((t) => {
    const amount = signedAccountAmount(t.type, Number(t.amount));
    const date = t.date.toISOString().split("T")[0];

    const recLinks: ReconLink[] = t.reconciliations.map((rec) => {
      let cashAmount = 0;
      let targetLabel = "";
      let portfolioName = "";
      let transactionType: string | null = null;
      let franking: ReconLink["franking"] = null;

      if (rec.transaction) {
        const tx = rec.transaction;
        cashAmount =
          txCash(
            tx.transactionType,
            num(tx.quantity),
            num(tx.price),
            num(tx.brokerage)
          ) ?? 0;
        portfolioName = tx.holding.portfolio.name;
        transactionType = tx.transactionType;
        targetLabel = `${tx.holding.instrument.code} ${tx.transactionType}`;
        if (tx.transactionType === "DIVIDEND") {
          franking = {
            frankedAmount: tx.frankedAmount != null ? Number(tx.frankedAmount) : null,
            unfrankedAmount:
              tx.unfrankedAmount != null ? Number(tx.unfrankedAmount) : null,
            frankingCredits:
              tx.frankingCredits != null ? Number(tx.frankingCredits) : null,
            taxDeferred: tx.taxDeferred != null ? Number(tx.taxDeferred) : null,
            foreignTax: tx.foreignTax != null ? Number(tx.foreignTax) : null,
          };
        }
      } else if (rec.fee) {
        cashAmount = -num(rec.fee.total);
        portfolioName = rec.fee.portfolio.name;
        targetLabel = `Custody fee${rec.fee.invoiceNumber ? ` ${rec.fee.invoiceNumber}` : ""}`;
      }

      return {
        reconciliationId: rec.id,
        kind: (rec.transactionId ? "transaction" : "fee") as "transaction" | "fee",
        targetLabel,
        portfolioName,
        cashAmount,
        matchType: rec.matchType,
        transactionId: rec.transactionId,
        transactionType,
        franking,
      };
    });

    const linkedTotal = recLinks.reduce((s, l) => s + l.cashAmount, 0);
    const remaining = amount - linkedTotal;
    const tol = tolerance(amount);
    const status: ReconAccountTx["status"] =
      recLinks.length === 0
        ? "unreconciled"
        : Math.abs(remaining) <= tol
          ? "reconciled"
          : "partial";

    const suggestion =
      status === "reconciled"
        ? null
        : suggest(remaining, date, t.description ?? "", candidates);

    return {
      id: t.id,
      date,
      amount,
      type: t.type,
      description: t.description ?? "",
      links: recLinks,
      linkedTotal,
      remaining,
      status,
      suggestion,
    };
  });

  return { accountId, currency: account.currency, accountTxs, candidates };
}

/**
 * Recompute a cash transaction's `reconciled` flag: true when its linked
 * portfolio cash matches the bank amount within tolerance (supports splits).
 */
export async function recomputeReconciledFlag(cashTxId: string): Promise<void> {
  const t = await db.cashTransaction.findUnique({
    where: { id: cashTxId },
    select: {
      amount: true,
      type: true,
      reconciliations: {
        include: {
          transaction: {
            select: {
              transactionType: true,
              quantity: true,
              price: true,
              brokerage: true,
            },
          },
          fee: { select: { total: true } },
        },
      },
    },
  });
  if (!t) return;

  const amount = signedAccountAmount(t.type, Number(t.amount));
  let linked = 0;
  for (const rec of t.reconciliations) {
    if (rec.transaction) {
      linked +=
        txCash(
          rec.transaction.transactionType,
          num(rec.transaction.quantity),
          num(rec.transaction.price),
          num(rec.transaction.brokerage)
        ) ?? 0;
    } else if (rec.fee) {
      linked += -num(rec.fee.total);
    }
  }

  const reconciled =
    t.reconciliations.length > 0 &&
    Math.abs(amount - linked) <= tolerance(amount);
  await db.cashTransaction.update({
    where: { id: cashTxId },
    data: { reconciled },
  });
}

// ─── Auto-reconcile ────────────────────────────────────────────────────────────

/** Minimum confidence for an automatic (non-interactive) match. */
const AUTO_RECON_THRESHOLD = 0.80;

/** Map a portfolio transactionType to the canonical cash account type. */
export const PORTFOLIO_TO_CASH_TYPE: Record<string, string> = {
  BUY: "buy_settlement",
  SELL: "sell_settlement",
  TRANSFER_IN: "transfer_in",
  TRANSFER_OUT: "transfer_out",
  DIVIDEND: "dividend_received",
  INTEREST: "interest",
  COUPON: "interest",
  RETURN_OF_CAPITAL: "distribution",
};

/** Map a portfolio transactionType to the preferred category name (case-insensitive lookup). */
export const PORTFOLIO_TO_CATEGORY_NAME: Record<string, string> = {
  BUY: "Purchase",
  SELL: "Sale",
  TRANSFER_IN: "Transfer In",
  TRANSFER_OUT: "Transfer Out",
  DIVIDEND: "Dividends",
  INTEREST: "Interest",
  COUPON: "Interest",
  RETURN_OF_CAPITAL: "Distributions",
};

/** Fee candidate preferred category name. */
export const FEE_CATEGORY_NAME = "Management Fee";

/**
 * Write-back derived `type` and `categoryId` onto a cash transaction after
 * reconciliation. Only updates fields that are currently unclassified:
 * - `type`       — only if currently `withdrawal` or `deposit`
 * - `categoryId` — only if currently null
 *
 * `userId` is required to scope the category lookup to the user's own categories.
 */
export async function writeBackCategoryAndType(
  cashTxId: string,
  userId: string,
  kind: "transaction" | "fee",
  portfolioTxType: string | null
): Promise<void> {
  const cashTx = await db.cashTransaction.findUnique({
    where: { id: cashTxId },
    select: { type: true, categoryId: true },
  });
  if (!cashTx) return;

  const isGenericType = cashTx.type === "withdrawal" || cashTx.type === "deposit";
  const needsCategory = cashTx.categoryId === null;
  if (!isGenericType && !needsCategory) return;

  const newCashType =
    kind === "transaction" && portfolioTxType
      ? (PORTFOLIO_TO_CASH_TYPE[portfolioTxType] ?? null)
      : null;
  const categoryName =
    kind === "fee"
      ? FEE_CATEGORY_NAME
      : portfolioTxType
        ? (PORTFOLIO_TO_CATEGORY_NAME[portfolioTxType] ?? null)
        : null;

  let resolvedCategoryId: string | null = null;
  if (categoryName) {
    const cat = await db.cashCategory.findFirst({
      where: { userId, name: { equals: categoryName, mode: "insensitive" } },
      select: { id: true },
    });
    resolvedCategoryId = cat?.id ?? null;
  }

  const update: Record<string, unknown> = {};
  if (isGenericType && newCashType) update.type = newCashType;
  if (needsCategory && resolvedCategoryId) update.categoryId = resolvedCategoryId;
  if (Object.keys(update).length > 0) {
    await db.cashTransaction.update({ where: { id: cashTxId }, data: update });
  }
}

/**
 * Runs the reconciliation scoring engine for every unreconciled account
 * transaction and commits all single-candidate suggestions whose confidence
 * meets or exceeds {@link AUTO_RECON_THRESHOLD}.
 *
 * Safe to call repeatedly — already-matched candidates are excluded via
 * `usedTxIds` / `usedFeeIds` and the scorer only proposes same-direction
 * single matches (no speculative combos).
 *
 * Returns the count of links created.
 */
export async function autoReconcileAccount(accountId: string): Promise<number> {
  // Need the account's userId for category lookup.
  const account = await db.cashAccount.findUnique({
    where: { id: accountId },
    select: { userId: true },
  });
  if (!account) return 0;

  const data = await getReconciliationData(accountId);
  const unmatched = data.accountTxs.filter(
    (t) => t.status !== "reconciled" && t.suggestion !== null
  );

  let linked = 0;
  for (const t of unmatched) {
    const suggestion = t.suggestion!;
    // Only commit single-candidate high-confidence matches automatically.
    if (suggestion.keys.length !== 1) continue;
    if (suggestion.confidence < AUTO_RECON_THRESHOLD) continue;

    const [kind, refId] = suggestion.keys[0].split(":");

    await db.reconciliation.create({
      data: {
        cashTransactionId: t.id,
        transactionId: kind === "transaction" ? refId : null,
        feeId: kind === "fee" ? refId : null,
        matchType: "auto",
      },
    });

    // Derive portfolio transaction type for write-back.
    let portfolioTxType: string | null = null;
    if (kind === "transaction") {
      const candidate = data.candidates.find((c) => c.key === suggestion.keys[0]);
      portfolioTxType = candidate?.transactionType ?? null;
    }
    await writeBackCategoryAndType(
      t.id,
      account.userId,
      kind as "transaction" | "fee",
      portfolioTxType
    );

    await recomputeReconciledFlag(t.id);
    linked++;
  }
  return linked;
}
