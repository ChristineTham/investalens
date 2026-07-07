/**
 * Seed a realistic sample portfolio for the test user.
 *
 * - Wipes the target user's portfolio-related data (portfolios + holdings +
 *   transactions via cascade, plus labels, custom groups, watchlists and cash
 *   accounts).
 * - Recreates a multi-asset "Sample Growth Portfolio": ASX shares, a US share,
 *   an ETF and a traditional bond, with buys, a sell (multi-parcel → realised
 *   CGT with discount, so the CGT report + Optimise card have real data),
 *   franked dividends, a coupon, current prices, labels and a custom group.
 *
 * Shared reference tables (Instrument, Price) are upserted, never deleted, so
 * other users and model constituents are unaffected.
 *
 * Usage: npx tsx scripts/seed-sample-portfolio.ts
 * Target user via SAMPLE_USER_EMAIL (default test@investalens.dev).
 *
 * Shared prices are left intact: an instrument that already has price history
 * keeps it (so the portfolio values on real market data and other users are
 * unaffected); a fallback price is only added for instruments that have none.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

const EMAIL = process.env.SAMPLE_USER_EMAIL ?? "test@investalens.dev";

// Today is fixed by the app context (2026) — use dates comfortably in the past
// so long-term CGT discount eligibility (>12 months) is exercised.
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const PRICE_DATE = d("2026-07-01");

type InstrumentSeed = {
  code: string;
  marketCode: string;
  name: string;
  instrumentType: string;
  sector?: string;
  country: string;
  currency?: string;
  price: number; // current price for valuation
  faceValue?: number;
  couponRate?: number;
  paymentFrequency?: string;
  maturityDate?: Date;
  taxClass?: string;
};

const INSTRUMENTS: InstrumentSeed[] = [
  { code: "BHP", marketCode: "ASX", name: "BHP Group Ltd", instrumentType: "equity", sector: "Materials", country: "AU", price: 44.5 },
  { code: "CBA", marketCode: "ASX", name: "Commonwealth Bank of Australia", instrumentType: "equity", sector: "Financials", country: "AU", price: 131.2 },
  { code: "CSL", marketCode: "ASX", name: "CSL Ltd", instrumentType: "equity", sector: "Health Care", country: "AU", price: 305.0 },
  { code: "VAS", marketCode: "ASX", name: "Vanguard Australian Shares Index ETF", instrumentType: "etf", sector: "Diversified", country: "AU", price: 96.4 },
  { code: "AAPL", marketCode: "NASDAQ", name: "Apple Inc.", instrumentType: "equity", sector: "Technology", country: "US", price: 214.0 },
  { code: "MSFT", marketCode: "NASDAQ", name: "Microsoft Corp.", instrumentType: "equity", sector: "Technology", country: "US", price: 432.0 },
  {
    code: "SGSPAU-2028",
    marketCode: "OTC",
    name: "SGSP (Australia) Assets 4.25% 2028",
    instrumentType: "fixed_interest",
    sector: "Utilities",
    country: "AU",
    price: 101.1,
    faceValue: 100,
    couponRate: 4.25,
    paymentFrequency: "semi-annual",
    maturityDate: d("2028-09-15"),
    taxClass: "income",
  },
];

async function main() {
  const { db } = await import("../lib/db");

  const user = await db.user.findUnique({ where: { email: EMAIL } });
  if (!user) {
    throw new Error(
      `Target user ${EMAIL} not found. Create it first (e.g. register via the app or run the e2e setup).`
    );
  }
  const userId = user.id;
  console.log(`Seeding sample portfolio for ${EMAIL} (${userId})`);

  // --- Wipe existing portfolio-related data (cascades handle children) ---
  await db.label.deleteMany({ where: { userId } });
  await db.customGroup.deleteMany({ where: { userId } });
  await db.watchlist.deleteMany({ where: { userId } });
  await db.cashAccount.deleteMany({ where: { userId } });
  await db.cashCategory.deleteMany({ where: { userId } });
  const removed = await db.portfolio.deleteMany({ where: { userId } });
  console.log(`  cleared ${removed.count} existing portfolio(s) and user-scoped data`);

  // --- Upsert shared instruments + a current price for each ---
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
      // Never overwrite an existing (possibly real) instrument's metadata.
      update: {},
    });
    instrumentIds[s.code] = inst.id;
    // Only supply a fallback price when the instrument has no price history —
    // instruments with real prices (e.g. shared with other users) are left
    // untouched so their valuations aren't clobbered.
    const priceCount = await db.price.count({ where: { instrumentId: inst.id } });
    if (priceCount === 0) {
      await db.price.create({
        data: { instrumentId: inst.id, date: PRICE_DATE, close: s.price, adjustedClose: s.price },
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

  // Helper: create a holding with its transactions.
  type Tx = {
    type: string;
    date: Date;
    quantity: number;
    price: number;
    brokerage?: number;
    comments?: string;
    frankedAmount?: number;
    unfrankedAmount?: number;
    frankingCredits?: number;
    foreignTax?: number;
    accruedInterest?: number;
  };
  async function addHolding(code: string, txs: Tx[], opts?: { drpEnabled?: boolean; notes?: string }) {
    const holding = await db.holding.create({
      data: {
        portfolioId: portfolio.id,
        instrumentId: instrumentIds[code],
        drpEnabled: opts?.drpEnabled ?? false,
        notes: opts?.notes,
      },
    });
    for (const t of txs) {
      await db.transaction.create({
        data: {
          holdingId: holding.id,
          transactionType: t.type,
          tradeDate: t.date,
          quantity: t.quantity,
          price: t.price,
          brokerage: t.brokerage ?? 0,
          comments: t.comments,
          frankedAmount: t.frankedAmount,
          unfrankedAmount: t.unfrankedAmount,
          frankingCredits: t.frankingCredits,
          foreignTax: t.foreignTax,
          accruedInterest: t.accruedInterest,
        },
      });
    }
    return holding;
  }

  // BHP — two buy parcels + a partial sell (realised long-term CGT) + a franked dividend.
  await addHolding("BHP", [
    { type: "BUY", date: d("2019-08-15"), quantity: 200, price: 34.2, brokerage: 19.95 },
    { type: "BUY", date: d("2022-03-10"), quantity: 100, price: 46.8, brokerage: 19.95 },
    { type: "SELL", date: d("2024-11-20"), quantity: 120, price: 43.1, brokerage: 19.95, comments: "Trim position" },
    { type: "DIVIDEND", date: d("2024-09-27"), quantity: 180, price: 1.6, frankedAmount: 288, frankingCredits: 123.43 },
  ]);

  // CBA — long-held, fully franked dividend.
  await addHolding("CBA", [
    { type: "BUY", date: d("2020-06-01"), quantity: 80, price: 61.5, brokerage: 19.95 },
    { type: "DIVIDEND", date: d("2025-03-28"), quantity: 80, price: 2.4, frankedAmount: 192, frankingCredits: 82.29 },
  ]);

  // CSL — growth, no income.
  await addHolding("CSL", [
    { type: "BUY", date: d("2021-09-01"), quantity: 30, price: 292.0, brokerage: 19.95 },
  ]);

  // VAS ETF — DRP enabled, part-franked distribution with a little foreign income.
  await addHolding(
    "VAS",
    [
      { type: "BUY", date: d("2022-01-15"), quantity: 200, price: 88.4, brokerage: 19.95 },
      { type: "DIVIDEND", date: d("2025-06-25"), quantity: 200, price: 1.35, frankedAmount: 210, unfrankedAmount: 60, frankingCredits: 90, foreignTax: 8.5 },
    ],
    { drpEnabled: true, notes: "Core index holding (DRP on)" }
  );

  // AAPL — US growth share, small unfranked dividend.
  await addHolding("AAPL", [
    { type: "BUY", date: d("2021-11-05"), quantity: 25, price: 168.0, brokerage: 19.95 },
    { type: "DIVIDEND", date: d("2025-05-15"), quantity: 25, price: 0.25, unfrankedAmount: 6.25, foreignTax: 0.94 },
  ]);

  // MSFT — recent US growth share.
  await addHolding("MSFT", [
    { type: "BUY", date: d("2023-02-10"), quantity: 15, price: 268.0, brokerage: 19.95 },
  ]);

  // Traditional bond — coupon income; CGT-exempt (taxClass income).
  await addHolding(
    "SGSPAU-2028",
    [
      { type: "BUY", date: d("2023-05-20"), quantity: 500, price: 99.4, brokerage: 25, accruedInterest: 42.5 },
      { type: "COUPON", date: d("2025-03-15"), quantity: 500, price: 0.02125, comments: "Semi-annual coupon" },
    ],
    { notes: "Fixed interest — CGT exempt" }
  );

  // --- Labels ---
  const core = await db.label.create({ data: { userId, name: "Core" } });
  const growth = await db.label.create({ data: { userId, name: "Growth" } });
  const income = await db.label.create({ data: { userId, name: "Income" } });
  const holdingsByCode = await db.holding.findMany({
    where: { portfolioId: portfolio.id },
    include: { instrument: { select: { code: true } } },
  });
  const hid = (code: string) => holdingsByCode.find((h) => h.instrument.code === code)!.id;
  await db.holdingLabel.createMany({
    data: [
      { holdingId: hid("BHP"), labelId: core.id },
      { holdingId: hid("CBA"), labelId: core.id },
      { holdingId: hid("VAS"), labelId: core.id },
      { holdingId: hid("CSL"), labelId: growth.id },
      { holdingId: hid("AAPL"), labelId: growth.id },
      { holdingId: hid("MSFT"), labelId: growth.id },
      { holdingId: hid("CBA"), labelId: income.id },
      { holdingId: hid("SGSPAU-2028"), labelId: income.id },
    ],
  });

  // --- Custom group with categories + assignments (BHP left Unassigned on purpose) ---
  const group = await db.customGroup.create({ data: { userId, name: "Asset Strategy" } });
  const defensive = await db.customGroupCategory.create({ data: { groupId: group.id, name: "Defensive" } });
  const growthCat = await db.customGroupCategory.create({ data: { groupId: group.id, name: "Growth" } });
  await db.customGroupAssignment.createMany({
    data: [
      { categoryId: defensive.id, instrumentId: instrumentIds["VAS"] },
      { categoryId: defensive.id, instrumentId: instrumentIds["SGSPAU-2028"] },
      { categoryId: defensive.id, instrumentId: instrumentIds["CBA"] },
      { categoryId: growthCat.id, instrumentId: instrumentIds["CSL"] },
      { categoryId: growthCat.id, instrumentId: instrumentIds["AAPL"] },
      { categoryId: growthCat.id, instrumentId: instrumentIds["MSFT"] },
    ],
  });

  // --- A small watchlist ---
  const watchlist = await db.watchlist.create({ data: { userId, name: "Watchlist" } }).catch(() => null);
  if (watchlist) {
    await db.watchlistItem.createMany({
      data: [
        { watchlistId: watchlist.id, instrumentId: instrumentIds["MSFT"], notes: "Add on dips" },
      ],
    });
  }

  const txCount = await db.transaction.count({
    where: { holding: { portfolioId: portfolio.id } },
  });
  console.log(
    `Done: 1 portfolio, ${holdingsByCode.length} holdings, ${txCount} transactions, 3 labels, 1 custom group.`
  );
  console.log(`  BHP has a realised sell → CGT report & Optimise card will have data.`);

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
