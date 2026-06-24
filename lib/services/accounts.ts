import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Cash-account data-access layer.
 *
 * Direction convention: `CashTransaction.amount` is stored as a positive
 * magnitude; the sign is derived from `type` via {@link CREDIT_TYPES}. A virtual
 * account is an auto-maintained portfolio cash ledger (read-only, excluded from
 * total portfolio value — income is still counted via the underlying portfolio
 * transactions).
 */

/** Canonical types that increase the account balance (money in). */
export const CREDIT_TYPES = new Set([
  "deposit",
  "interest",
  "dividend_received",
  "transfer_in",
  "sell_settlement",
]);

export function signedAmount(type: string, amount: number): number {
  return CREDIT_TYPES.has(type) ? amount : -amount;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LinkedPortfolio {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface AccountSummary {
  id: string;
  name: string;
  institution: string | null;
  accountType: string;
  isVirtual: boolean;
  currency: string;
  balance: number;
  maskedNumber: string | null;
  cardCount: number;
  transactionCount: number;
  lastActivity: string | null;
  linkedPortfolios: LinkedPortfolio[];
}

export interface AccountsOverview {
  accounts: AccountSummary[];
  /** Total of real (non-virtual, non-archived) account balances, base currency. */
  totalCash: number;
}

function maskNumber(n: string | null): string | null {
  if (!n) return null;
  const digits = n.replace(/\s/g, "");
  return digits.length <= 4 ? digits : `•••• ${digits.slice(-4)}`;
}

// ─── Reads ─────────────────────────────────────────────────────────────────────

/** All accounts for the current user, with derived summary fields. */
export async function getAccountsOverview(
  includeArchived = false
): Promise<AccountsOverview> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const accounts = await db.cashAccount.findMany({
    where: {
      userId: session.user.id,
      ...(includeArchived ? {} : { archived: false }),
    },
    include: {
      cards: { select: { id: true } },
      portfolioLinks: {
        include: { portfolio: { select: { id: true, name: true } } },
      },
      transactions: {
        select: { date: true },
        orderBy: { date: "desc" },
        take: 1,
      },
      _count: { select: { transactions: true } },
    },
    orderBy: [{ isVirtual: "asc" }, { name: "asc" }],
  });

  const summaries: AccountSummary[] = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    institution: a.institution,
    accountType: a.accountType,
    isVirtual: a.isVirtual,
    currency: a.currency,
    balance: Number(a.balance),
    maskedNumber: maskNumber(a.accountNumber),
    cardCount: a.cards.length,
    transactionCount: a._count.transactions,
    lastActivity: a.transactions[0]
      ? a.transactions[0].date.toISOString().split("T")[0]
      : null,
    linkedPortfolios: a.portfolioLinks.map((l) => ({
      id: l.portfolio.id,
      name: l.portfolio.name,
      isDefault: l.isDefault,
    })),
  }));

  const totalCash = summaries
    .filter((s) => !s.isVirtual)
    .reduce((sum, s) => sum + s.balance, 0);

  return { accounts: summaries, totalCash };
}

/** A single account with its cards, linked portfolios and recent transactions. */
export async function getAccountDetail(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const account = await db.cashAccount.findFirst({
    where: { id, userId: session.user.id },
    include: {
      cards: true,
      portfolioLinks: {
        include: { portfolio: { select: { id: true, name: true } } },
      },
      transactions: {
        include: { category: true },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!account) throw new Error("Account not found");
  return account;
}

/** Running-balance time series between two dates (for the balance chart). */
export async function getAccountBalanceSeries(
  id: string,
  from: Date,
  to: Date
): Promise<{ date: string; balance: number }[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const account = await db.cashAccount.findFirst({
    where: { id, userId: session.user.id },
    select: { openingBalance: true },
  });
  if (!account) throw new Error("Account not found");

  const txs = await db.cashTransaction.findMany({
    where: { cashAccountId: id },
    select: { date: true, amount: true, type: true },
    orderBy: { date: "asc" },
  });

  // Opening balance carried into the window: opening + everything before `from`.
  let running = Number(account.openingBalance);
  const series: { date: string; balance: number }[] = [];
  const byDate = new Map<string, number>();

  for (const tx of txs) {
    running += signedAmount(tx.type, Number(tx.amount));
    if (tx.date >= from && tx.date <= to) {
      byDate.set(tx.date.toISOString().split("T")[0], running);
    }
  }
  for (const [date, balance] of byDate) series.push({ date, balance });
  return series;
}

// ─── Derived maintenance ───────────────────────────────────────────────────────

/** Recompute and persist an account's cached balance from its transactions. */
export async function recomputeAccountBalance(id: string): Promise<number> {
  const [account, txs] = await Promise.all([
    db.cashAccount.findUnique({ where: { id }, select: { openingBalance: true } }),
    db.cashTransaction.findMany({
      where: { cashAccountId: id },
      select: { amount: true, type: true },
    }),
  ]);
  if (!account) throw new Error("Account not found");

  const balance = txs.reduce(
    (sum, t) => sum + signedAmount(t.type, Number(t.amount)),
    Number(account.openingBalance)
  );
  await db.cashAccount.update({ where: { id }, data: { balance } });
  return balance;
}

/**
 * Find (or create) the virtual cash ledger for a portfolio. Used when a portfolio
 * has no physical settlement account linked, so auto-posted portfolio cash
 * movements still have a home.
 */
export async function ensureVirtualAccount(portfolioId: string) {
  const existing = await db.cashAccount.findFirst({
    where: { portfolioId, isVirtual: true },
  });
  if (existing) return existing;

  const portfolio = await db.portfolio.findUnique({
    where: { id: portfolioId },
    select: { userId: true, name: true, baseCurrency: true },
  });
  if (!portfolio) throw new Error("Portfolio not found");

  return db.cashAccount.create({
    data: {
      userId: portfolio.userId,
      portfolioId,
      name: `${portfolio.name} — Cash`,
      accountType: "cash",
      isVirtual: true,
      currency: portfolio.baseCurrency,
    },
  });
}

/** Total real (non-virtual, non-archived) cash for the current user. */
export async function getUserCashTotal(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) return 0;

  const accounts = await db.cashAccount.findMany({
    where: { userId: session.user.id, isVirtual: false, archived: false },
    select: { balance: true },
  });
  return accounts.reduce((sum, a) => sum + Number(a.balance), 0);
}

// ─── Portfolio ↔ account links ──────────────────────────────────────────────

export interface PortfolioAccountLinks {
  linked: {
    linkId: string;
    accountId: string;
    name: string;
    isDefault: boolean;
    balance: number;
    currency: string;
  }[];
  available: { id: string; name: string }[];
  virtualAccountId: string | null;
}

/** Linked physical accounts + available accounts + the virtual ledger id. */
export async function getPortfolioAccountLinks(
  portfolioId: string
): Promise<PortfolioAccountLinks> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const portfolio = await db.portfolio.findFirst({
    where: { id: portfolioId, userId: session.user.id },
    select: { id: true },
  });
  if (!portfolio) throw new Error("Portfolio not found");

  const [links, virtual, available] = await Promise.all([
    db.portfolioAccount.findMany({
      where: { portfolioId },
      include: {
        cashAccount: {
          select: { id: true, name: true, balance: true, currency: true },
        },
      },
      orderBy: { isDefault: "desc" },
    }),
    db.cashAccount.findFirst({
      where: { portfolioId, isVirtual: true },
      select: { id: true },
    }),
    db.cashAccount.findMany({
      where: {
        userId: session.user.id,
        isVirtual: false,
        archived: false,
        portfolioLinks: { none: { portfolioId } },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    linked: links.map((l) => ({
      linkId: l.id,
      accountId: l.cashAccount.id,
      name: l.cashAccount.name,
      isDefault: l.isDefault,
      balance: Number(l.cashAccount.balance),
      currency: l.cashAccount.currency,
    })),
    available: available.map((a) => ({ id: a.id, name: a.name })),
    virtualAccountId: virtual?.id ?? null,
  };
}

