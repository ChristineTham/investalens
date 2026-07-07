/**
 * Seed a comprehensive, representative portfolio for the standing test user.
 *
 * Builds a realistic Australian retail investor portfolio on test@investalens.dev:
 * direct ASX shares, Australian + international ETFs, an LIC, two real FIIG
 * bonds (priced per $1 of face), and a delisted security (Afterpay), plus a
 * linked physical cash account with transactions, custom groups and labels.
 * It also sets a known password on the test user so the e2e suite can log in.
 *
 * Shared reference data is protected: existing instrument metadata is never
 * overwritten, and equity/ETF prices are left intact (the portfolio values on
 * real market data) — only instruments with no price history get a fallback.
 * Bonds and the delisted security are test-owned, so their prices are set
 * explicitly (bonds per $1 of par; the delisted security frozen at its last
 * traded price).
 *
 * Usage: npx tsx scripts/seed-sample-portfolio.ts
 * Overrides: SAMPLE_USER_EMAIL, SAMPLE_USER_PASSWORD.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import bcrypt from "bcryptjs";

const EMAIL = process.env.SAMPLE_USER_EMAIL ?? "test@investalens.dev";
const PASSWORD = process.env.SAMPLE_USER_PASSWORD ?? "investalens-test-2026";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const PRICE_DATE = d("2026-07-01");

// "preserve" — keep existing prices (real market data), add a fallback only if
//   the instrument has none. "set" — force today's price (test-owned bonds).
//   "history" — replace with an explicit historical series (delisted security).
type PriceStrategy = "preserve" | "set" | "history";

type InstrumentSeed = {
  code: string;
  marketCode: string;
  name: string;
  instrumentType: string;
  sector?: string;
  country: string;
  currency?: string;
  price: number; // per-share (equity/etf) or per-$1 of par (bond)
  priceStrategy: PriceStrategy;
  history?: { date: string; close: number }[];
  faceValue?: number;
  couponRate?: number; // fraction, e.g. 0.0585 — matches the FIIG importer
  paymentFrequency?: string;
  maturityDate?: Date;
  taxClass?: string;
  delisted?: {
    longName: string;
    industry: string;
    summary: string;
    isin: string;
    listingDate: string;
    delistingDate: string;
  };
};

const INSTRUMENTS: InstrumentSeed[] = [
  // --- Direct ASX shares ---
  { code: "BHP", marketCode: "ASX", name: "BHP Group Ltd", instrumentType: "equity", sector: "Materials", country: "AU", price: 44.5, priceStrategy: "preserve" },
  { code: "CBA", marketCode: "ASX", name: "Commonwealth Bank of Australia", instrumentType: "equity", sector: "Financials", country: "AU", price: 131.2, priceStrategy: "preserve" },
  { code: "WES", marketCode: "ASX", name: "Wesfarmers Ltd", instrumentType: "equity", sector: "Consumer Staples", country: "AU", price: 78.6, priceStrategy: "preserve" },
  { code: "CSL", marketCode: "ASX", name: "CSL Ltd", instrumentType: "equity", sector: "Health Care", country: "AU", price: 305.0, priceStrategy: "preserve" },
  { code: "TLS", marketCode: "ASX", name: "Telstra Group Ltd", instrumentType: "equity", sector: "Communication Services", country: "AU", price: 4.05, priceStrategy: "preserve" },
  { code: "AFI", marketCode: "ASX", name: "Australian Foundation Investment Co", instrumentType: "equity", sector: "Financials", country: "AU", price: 7.35, priceStrategy: "preserve" },
  // --- ETFs (Australian + international) ---
  { code: "VAS", marketCode: "ASX", name: "Vanguard Australian Shares Index ETF", instrumentType: "etf", sector: "Diversified", country: "AU", price: 96.4, priceStrategy: "preserve" },
  { code: "VGS", marketCode: "ASX", name: "Vanguard MSCI Index International Shares ETF", instrumentType: "etf", sector: "Diversified", country: "AU", price: 128.3, priceStrategy: "preserve" },
  // --- International direct (USD) ---
  { code: "AAPL", marketCode: "NASDAQ", name: "Apple Inc.", instrumentType: "equity", sector: "Technology", country: "US", currency: "USD", price: 214.0, priceStrategy: "preserve" },
  // --- FIIG bonds (code = ISIN so the FIIG rate sheet can price-match; per $1 of par) ---
  {
    code: "AU3CB0287541", marketCode: "OTC", name: "AMPOL-5.85%-30Jan34c", instrumentType: "fixed_interest",
    sector: "Energy", country: "AU", price: 0.985, priceStrategy: "set",
    faceValue: 100, couponRate: 0.0585, paymentFrequency: "semi-annual", maturityDate: d("2034-01-30"), taxClass: "income",
  },
  {
    code: "AU3CB0269713", marketCode: "OTC", name: "SGSPAU-4.25%-15Sep28", instrumentType: "fixed_interest",
    sector: "Utilities", country: "AU", price: 1.011, priceStrategy: "set",
    faceValue: 100, couponRate: 0.0425, paymentFrequency: "semi-annual", maturityDate: d("2028-09-15"), taxClass: "income",
  },
  // --- Delisted security (Afterpay — acquired by Block, delisted 02 Feb 2022) ---
  {
    code: "APT", marketCode: "ASX", name: "Afterpay Limited", instrumentType: "equity",
    sector: "Information Technology", country: "AU", price: 66.42, priceStrategy: "history",
    history: [
      { date: "2021-11-01", close: 108.5 },
      { date: "2021-12-01", close: 92.3 },
      { date: "2022-01-03", close: 88.1 },
      { date: "2022-01-31", close: 66.5 },
      { date: "2022-02-02", close: 66.42 },
    ],
    delisted: {
      longName: "Afterpay Limited",
      industry: "Financial Technology (BNPL)",
      summary: "Buy-now-pay-later provider; delisted following its acquisition by Block, Inc.",
      isin: "AU000000APT1",
      listingDate: "04 May 2016",
      delistingDate: "02 February 2022",
    },
  },
];

async function main() {
  const { db } = await import("../lib/db");

  const user = await db.user.findUnique({ where: { email: EMAIL } });
  if (!user) {
    throw new Error(
      `Target user ${EMAIL} not found. Create it first (register via the app).`
    );
  }
  const userId = user.id;
  console.log(`Seeding representative portfolio for ${EMAIL} (${userId})`);

  // Set a known password so the e2e suite can log in with credentials.
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(PASSWORD, 12) },
  });
  console.log(`  set login password (SAMPLE_USER_PASSWORD)`);

  // --- Wipe existing portfolio-related data (cascades handle children) ---
  await db.label.deleteMany({ where: { userId } });
  await db.customGroup.deleteMany({ where: { userId } });
  await db.watchlist.deleteMany({ where: { userId } });
  await db.cashAccount.deleteMany({ where: { userId } });
  await db.cashCategory.deleteMany({ where: { userId } });
  const removed = await db.portfolio.deleteMany({ where: { userId } });
  console.log(`  cleared ${removed.count} existing portfolio(s) and user-scoped data`);

  // --- Upsert shared instruments + prices per strategy ---
  const instrumentIds: Record<string, string> = {};
  for (const s of INSTRUMENTS) {
    const inst = await db.instrument.upsert({
      where: { code_marketCode: { code: s.code, marketCode: s.marketCode } },
      create: {
        code: s.code,
        marketCode: s.marketCode,
        name: s.name,
        instrumentType: s.instrumentType,
        sector: s.sector,
        country: s.country,
        currency: s.currency ?? "AUD",
        faceValue: s.faceValue,
        couponRate: s.couponRate,
        paymentFrequency: s.paymentFrequency,
        maturityDate: s.maturityDate,
        taxClass: s.taxClass,
      },
      update: {}, // never overwrite an existing (possibly real) instrument
    });
    instrumentIds[s.code] = inst.id;

    if (s.priceStrategy === "preserve") {
      // Keep real prices; only add a fallback when there is no history.
      const priceCount = await db.price.count({ where: { instrumentId: inst.id } });
      if (priceCount === 0) {
        await db.price.create({
          data: { instrumentId: inst.id, date: PRICE_DATE, close: s.price, adjustedClose: s.price },
        });
      }
    } else if (s.priceStrategy === "set") {
      // Test-owned bond: force today's per-$1 price.
      await db.price.deleteMany({ where: { instrumentId: inst.id, date: PRICE_DATE } });
      await db.price.create({
        data: { instrumentId: inst.id, date: PRICE_DATE, close: s.price, adjustedClose: s.price },
      });
    } else if (s.priceStrategy === "history" && s.history) {
      // Delisted security: seed a fallback historical series only when there's
      // no price history — so real prices later backfilled from EODHD's
      // delisted endpoint (via the delisted-enrichment feature) are preserved.
      const priceCount = await db.price.count({ where: { instrumentId: inst.id } });
      if (priceCount === 0) {
        await db.price.createMany({
          data: s.history.map((h) => ({ instrumentId: inst.id, date: d(h.date), close: h.close, adjustedClose: h.close })),
          skipDuplicates: true,
        });
      }
    }

    // Delisted flag via InstrumentInfo.quoteType (what the UI reads).
    if (s.delisted) {
      const info = {
        quoteType: "DELISTED",
        longName: s.delisted.longName,
        shortName: s.delisted.longName,
        summary: s.delisted.summary,
        sector: s.sector,
        industry: s.delisted.industry,
        country: "Australia",
        exchange: "ASX",
        currency: "AUD",
        stats: { isin: s.delisted.isin } as object,
        calendar: { listingDate: s.delisted.listingDate, delistingDate: s.delisted.delistingDate } as object,
        fetchedAt: PRICE_DATE,
      };
      await db.instrumentInfo.upsert({
        where: { instrumentId: inst.id },
        create: { instrumentId: inst.id, ...info },
        update: info,
      });
    }
  }

  // --- Create the portfolio ---
  const portfolio = await db.portfolio.create({
    data: {
      userId,
      name: "Sample Growth Portfolio",
      taxResidency: "AU",
      baseCurrency: "AUD",
      taxEntityType: "individual",
      saleAllocationMethod: "fifo",
      icon: "trending-up",
      color: "var(--rosely9)",
      brokerName: "CommSec",
      brokerWebsite: "https://www.commsec.com.au",
    },
  });
  console.log(`  created portfolio ${portfolio.id}`);

  type Tx = {
    type: string;
    date: Date;
    quantity: number;
    price: number;
    brokerage?: number;
    currency?: string;
    comments?: string;
    frankedAmount?: number;
    unfrankedAmount?: number;
    frankingCredits?: number;
    foreignTax?: number;
    taxDeferred?: number;
    accruedInterest?: number;
  };
  const holdingIds: Record<string, string> = {};
  const txIds: Record<string, string> = {}; // keyed by a caller-supplied tag

  async function addHolding(
    code: string,
    txs: (Tx & { tag?: string })[],
    opts?: { drpEnabled?: boolean; notes?: string }
  ) {
    const holding = await db.holding.create({
      data: {
        portfolioId: portfolio.id,
        instrumentId: instrumentIds[code],
        drpEnabled: opts?.drpEnabled ?? false,
        notes: opts?.notes,
      },
    });
    holdingIds[code] = holding.id;
    for (const t of txs) {
      const tx = await db.transaction.create({
        data: {
          holdingId: holding.id,
          transactionType: t.type,
          tradeDate: t.date,
          quantity: t.quantity,
          price: t.price,
          brokerage: t.brokerage ?? 0,
          currency: t.currency ?? "AUD",
          comments: t.comments,
          frankedAmount: t.frankedAmount,
          unfrankedAmount: t.unfrankedAmount,
          frankingCredits: t.frankingCredits,
          foreignTax: t.foreignTax,
          taxDeferred: t.taxDeferred,
          accruedInterest: t.accruedInterest,
        },
      });
      if (t.tag) txIds[t.tag] = tx.id;
    }
    return holding;
  }

  // BHP — two buy parcels + partial sell (realised long-term CGT) + franked div.
  await addHolding("BHP", [
    { type: "BUY", date: d("2019-08-15"), quantity: 200, price: 34.2, brokerage: 19.95 },
    { type: "BUY", date: d("2022-03-10"), quantity: 100, price: 46.8, brokerage: 19.95 },
    { type: "SELL", date: d("2024-11-20"), quantity: 120, price: 43.1, brokerage: 19.95, comments: "Trim position" },
    { type: "DIVIDEND", date: d("2024-09-27"), quantity: 180, price: 1.6, frankedAmount: 288, frankingCredits: 123.43, tag: "bhpDiv" },
  ]);
  await addHolding("CBA", [
    { type: "BUY", date: d("2020-06-01"), quantity: 80, price: 61.5, brokerage: 19.95 },
    { type: "DIVIDEND", date: d("2025-03-28"), quantity: 80, price: 2.4, frankedAmount: 192, frankingCredits: 82.29 },
  ]);
  await addHolding("WES", [
    { type: "BUY", date: d("2021-04-12"), quantity: 120, price: 52.0, brokerage: 19.95 },
    { type: "DIVIDEND", date: d("2025-03-05"), quantity: 120, price: 1.03, frankedAmount: 123.6, frankingCredits: 52.97 },
  ]);
  await addHolding("CSL", [
    { type: "BUY", date: d("2021-09-01"), quantity: 30, price: 292.0, brokerage: 19.95 },
  ]);
  await addHolding("TLS", [
    { type: "BUY", date: d("2020-10-01"), quantity: 2000, price: 3.55, brokerage: 19.95 },
    { type: "DIVIDEND", date: d("2025-03-27"), quantity: 2000, price: 0.085, frankedAmount: 170, frankingCredits: 72.86 },
  ]);
  await addHolding("AFI", [
    { type: "BUY", date: d("2020-02-01"), quantity: 500, price: 6.9, brokerage: 19.95 },
    { type: "DIVIDEND", date: d("2025-02-25"), quantity: 500, price: 0.14, frankedAmount: 70, frankingCredits: 30 },
  ]);
  await addHolding(
    "VAS",
    [
      { type: "BUY", date: d("2022-01-15"), quantity: 200, price: 88.4, brokerage: 19.95 },
      { type: "DIVIDEND", date: d("2025-06-25"), quantity: 200, price: 1.35, frankedAmount: 210, unfrankedAmount: 60, frankingCredits: 90, foreignTax: 8.5, taxDeferred: 15 },
    ],
    { drpEnabled: true, notes: "Core index holding (DRP on)" }
  );
  await addHolding("VGS", [
    { type: "BUY", date: d("2022-08-01"), quantity: 150, price: 102.0, brokerage: 19.95 },
    { type: "DIVIDEND", date: d("2025-06-25"), quantity: 150, price: 1.1, unfrankedAmount: 120, foreignTax: 18 },
  ]);
  await addHolding("AAPL", [
    { type: "BUY", date: d("2021-11-05"), quantity: 25, price: 168.0, brokerage: 19.95, currency: "USD" },
    { type: "DIVIDEND", date: d("2025-05-15"), quantity: 25, price: 0.25, unfrankedAmount: 6.25, foreignTax: 0.94, currency: "USD" },
  ]);
  // FIIG bonds — quantity is face value held, price per $1 of par; semi-annual coupons.
  await addHolding(
    "AU3CB0287541",
    [
      { type: "BUY", date: d("2023-06-01"), quantity: 50000, price: 0.99, accruedInterest: 210 },
      { type: "COUPON", date: d("2025-01-30"), quantity: 50000, price: 0.02925, comments: "Semi-annual coupon (5.85% p.a.)" },
    ],
    { notes: "FIIG bond — CGT exempt (income)" }
  );
  await addHolding(
    "AU3CB0269713",
    [
      { type: "BUY", date: d("2023-05-20"), quantity: 50000, price: 0.994, accruedInterest: 42.5 },
      { type: "COUPON", date: d("2025-03-15"), quantity: 50000, price: 0.02125, comments: "Semi-annual coupon (4.25% p.a.)" },
    ],
    { notes: "FIIG bond — CGT exempt (income)" }
  );
  // Delisted security — bought before delisting, frozen at last traded price.
  await addHolding("APT", [
    { type: "BUY", date: d("2018-06-15"), quantity: 100, price: 9.12, brokerage: 19.95, comments: "Held through the Block acquisition" },
  ], { notes: "Delisted 02 Feb 2022 — valued at last traded price" });

  // --- Labels ---
  const core = await db.label.create({ data: { userId, name: "Core" } });
  const growth = await db.label.create({ data: { userId, name: "Growth" } });
  const income = await db.label.create({ data: { userId, name: "Income" } });
  await db.holdingLabel.createMany({
    data: [
      { holdingId: holdingIds["BHP"], labelId: core.id },
      { holdingId: holdingIds["CBA"], labelId: core.id },
      { holdingId: holdingIds["VAS"], labelId: core.id },
      { holdingId: holdingIds["VGS"], labelId: core.id },
      { holdingId: holdingIds["CSL"], labelId: growth.id },
      { holdingId: holdingIds["AAPL"], labelId: growth.id },
      { holdingId: holdingIds["APT"], labelId: growth.id },
      { holdingId: holdingIds["CBA"], labelId: income.id },
      { holdingId: holdingIds["TLS"], labelId: income.id },
      { holdingId: holdingIds["AFI"], labelId: income.id },
      { holdingId: holdingIds["AU3CB0287541"], labelId: income.id },
      { holdingId: holdingIds["AU3CB0269713"], labelId: income.id },
    ],
  });

  // --- Custom group with categories (BHP/CSL left unassigned → Unassigned bucket) ---
  const group = await db.customGroup.create({ data: { userId, name: "Asset Strategy" } });
  const defensive = await db.customGroupCategory.create({ data: { groupId: group.id, name: "Defensive" } });
  const growthCat = await db.customGroupCategory.create({ data: { groupId: group.id, name: "Growth" } });
  const incomeCat = await db.customGroupCategory.create({ data: { groupId: group.id, name: "Fixed Income" } });
  await db.customGroupAssignment.createMany({
    data: [
      { categoryId: defensive.id, instrumentId: instrumentIds["VAS"] },
      { categoryId: defensive.id, instrumentId: instrumentIds["AFI"] },
      { categoryId: defensive.id, instrumentId: instrumentIds["TLS"] },
      { categoryId: growthCat.id, instrumentId: instrumentIds["VGS"] },
      { categoryId: growthCat.id, instrumentId: instrumentIds["AAPL"] },
      { categoryId: growthCat.id, instrumentId: instrumentIds["APT"] },
      { categoryId: incomeCat.id, instrumentId: instrumentIds["AU3CB0287541"] },
      { categoryId: incomeCat.id, instrumentId: instrumentIds["AU3CB0269713"] },
    ],
  });

  // --- Physical cash account linked to the portfolio (settlement account) ---
  const CREDIT_TYPES = new Set([
    "deposit", "interest", "dividend_received", "distribution",
    "contribution", "transfer_in", "sell_settlement",
  ]);
  const cashTxs = [
    { type: "deposit", amount: 25000, date: d("2023-12-20"), description: "Initial funding" },
    { type: "buy_settlement", amount: 4699.95, date: d("2022-03-10"), description: "BHP buy settlement" },
    { type: "dividend_received", amount: 288, date: d("2024-09-27"), description: "BHP dividend", tag: "bhpDivCash" },
    { type: "sell_settlement", amount: 5152.05, date: d("2024-11-20"), description: "BHP partial sell" },
    { type: "interest", amount: 41.3, date: d("2025-06-30"), description: "Account interest" },
    { type: "fee", amount: 19.95, date: d("2024-11-20"), description: "Brokerage" },
    { type: "withdrawal", amount: 2000, date: d("2025-05-02"), description: "Transfer to savings" },
  ];
  const openingBalance = 25000;
  const balance =
    openingBalance +
    cashTxs.reduce((sum, t) => sum + (CREDIT_TYPES.has(t.type) ? t.amount : -t.amount), 0);
  const cashAccount = await db.cashAccount.create({
    data: {
      userId,
      name: "CommSec Cash Account",
      institution: "Commonwealth Bank",
      bsb: "062000",
      accountNumber: "12345678",
      accountType: "transaction",
      currency: "AUD",
      openingBalance,
      balance,
      interestRate: 0.0035,
      website: "https://www.commsec.com.au",
    },
  });
  const cashTxIds: Record<string, string> = {};
  for (const t of cashTxs) {
    const ct = await db.cashTransaction.create({
      data: {
        cashAccountId: cashAccount.id,
        type: t.type,
        amount: t.amount,
        date: t.date,
        description: t.description,
        source: "manual",
      },
    });
    if ("tag" in t && t.tag) cashTxIds[t.tag] = ct.id;
  }
  await db.portfolioAccount.create({
    data: { portfolioId: portfolio.id, cashAccountId: cashAccount.id, isDefault: true },
  });
  // Reconcile the BHP dividend cash credit against the portfolio DIVIDEND tx.
  if (cashTxIds["bhpDivCash"] && txIds["bhpDiv"]) {
    await db.reconciliation.create({
      data: {
        cashTransactionId: cashTxIds["bhpDivCash"],
        transactionId: txIds["bhpDiv"],
        matchType: "manual",
        confidence: 1.0,
      },
    });
  }

  const holdingCount = Object.keys(holdingIds).length;
  const txCount = await db.transaction.count({ where: { holding: { portfolioId: portfolio.id } } });
  console.log(
    `Done: 1 portfolio, ${holdingCount} holdings (incl. 2 FIIG bonds + 1 delisted), ` +
      `${txCount} transactions, 3 labels, 1 custom group, 1 linked cash account.`
  );
  console.log(`  Login: ${EMAIL} / ${PASSWORD}`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
