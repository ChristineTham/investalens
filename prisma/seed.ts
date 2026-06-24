import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import crypto from "crypto";
import bcrypt from "bcryptjs";

async function main() {
  const { db } = await import("../lib/db");
  // Create test user
  const passwordHash = await bcrypt.hash("TestPass123!", 12);
  const user = await db.user.upsert({
    where: { email: "test@investalens.dev" },
    update: {},
    create: {
      email: "test@investalens.dev",
      name: "Test User",
      passwordHash,
    },
  });

  console.log(`Created user: ${user.email}`);

  // Create portfolios
  const individual = await db.portfolio.create({
    data: {
      userId: user.id,
      name: "Individual Portfolio",
      taxResidency: "AU",
      baseCurrency: "AUD",
      taxEntityType: "individual",
      saleAllocationMethod: "fifo",
    },
  });

  const smsf = await db.portfolio.create({
    data: {
      userId: user.id,
      name: "SMSF Portfolio",
      taxResidency: "AU",
      baseCurrency: "AUD",
      taxEntityType: "smsf",
      saleAllocationMethod: "min_tax",
    },
  });

  console.log(`Created portfolios: ${individual.name}, ${smsf.name}`);

  // Create ASX instruments
  const instrumentData = [
    { code: "CBA", name: "Commonwealth Bank", sector: "Financials" },
    { code: "BHP", name: "BHP Group", sector: "Materials" },
    { code: "CSL", name: "CSL Limited", sector: "Health Care" },
    { code: "WES", name: "Wesfarmers", sector: "Consumer Staples" },
    { code: "TLS", name: "Telstra Group", sector: "Communication Services" },
    { code: "FMG", name: "Fortescue Metals", sector: "Materials" },
    { code: "ANZ", name: "ANZ Group", sector: "Financials" },
    { code: "NAB", name: "National Australia Bank", sector: "Financials" },
    { code: "WBC", name: "Westpac Banking", sector: "Financials" },
    { code: "MQG", name: "Macquarie Group", sector: "Financials" },
  ];

  const instruments = [];
  for (const inst of instrumentData) {
    const created = await db.instrument.upsert({
      where: { code_marketCode: { code: inst.code, marketCode: "ASX" } },
      update: {},
      create: {
        code: inst.code,
        marketCode: "ASX",
        name: inst.name,
        instrumentType: "equity",
        currency: "AUD",
        country: "AU",
        sector: inst.sector,
      },
    });
    instruments.push(created);
  }

  console.log(`Created ${instruments.length} instruments`);

  // Create holdings and transactions for individual portfolio
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  for (let i = 0; i < 6; i++) {
    const inst = instruments[i];
    const holding = await db.holding.create({
      data: { portfolioId: individual.id, instrumentId: inst.id },
    });

    // BUY transaction
    const buyDate = new Date(sixMonthsAgo);
    buyDate.setDate(buyDate.getDate() + i * 10);
    await db.transaction.create({
      data: {
        holdingId: holding.id,
        transactionType: "BUY",
        tradeDate: buyDate,
        quantity: 100 + i * 50,
        price: 20 + i * 15,
        brokerage: 9.95,
        currency: "AUD",
      },
    });

    // Additional BUY
    const buyDate2 = new Date(buyDate);
    buyDate2.setMonth(buyDate2.getMonth() + 2);
    await db.transaction.create({
      data: {
        holdingId: holding.id,
        transactionType: "BUY",
        tradeDate: buyDate2,
        quantity: 50,
        price: 22 + i * 15,
        brokerage: 9.95,
        currency: "AUD",
      },
    });

    // DIVIDEND for first 4
    if (i < 4) {
      const divDate = new Date(buyDate);
      divDate.setMonth(divDate.getMonth() + 3);
      await db.transaction.create({
        data: {
          holdingId: holding.id,
          transactionType: "DIVIDEND",
          tradeDate: divDate,
          quantity: 150 + i * 50,
          price: 0.5 + i * 0.2,
          brokerage: 0,
          currency: "AUD",
          frankedAmount: (150 + i * 50) * (0.5 + i * 0.2) * 0.7,
          unfrankedAmount: (150 + i * 50) * (0.5 + i * 0.2) * 0.3,
          frankingCredits: (150 + i * 50) * (0.5 + i * 0.2) * 0.3,
        },
      });
    }

    // SELL for instrument index 1 (BHP)
    if (i === 1) {
      const sellDate = new Date(buyDate);
      sellDate.setMonth(sellDate.getMonth() + 5);
      await db.transaction.create({
        data: {
          holdingId: holding.id,
          transactionType: "SELL",
          tradeDate: sellDate,
          quantity: 50,
          price: 40,
          brokerage: 9.95,
          currency: "AUD",
        },
      });
    }
  }

  // SPLIT for TLS
  const tlsHolding = await db.holding.findFirst({
    where: { portfolioId: individual.id, instrument: { code: "TLS" } },
  });
  if (tlsHolding) {
    await db.transaction.create({
      data: {
        holdingId: tlsHolding.id,
        transactionType: "SPLIT",
        tradeDate: new Date(),
        quantity: 2,
        price: 0,
        brokerage: 0,
      },
    });
  }

  // Bond instrument in SMSF
  const bond = await db.instrument.create({
    data: {
      code: "FIIG001",
      marketCode: "OTC",
      name: "FIIG AUS Gov Bond 2027",
      instrumentType: "bond",
      currency: "AUD",
      faceValue: 100,
      couponRate: 0.035,
      paymentFrequency: "semi_annual",
      maturityDate: new Date("2027-06-15"),
      creditRating: "AAA",
    },
  });

  const bondHolding = await db.holding.create({
    data: { portfolioId: smsf.id, instrumentId: bond.id },
  });

  await db.transaction.create({
    data: {
      holdingId: bondHolding.id,
      transactionType: "BUY",
      tradeDate: sixMonthsAgo,
      quantity: 50000,
      price: 98.5,
      brokerage: 0,
      currency: "AUD",
    },
  });

  // Cash account
  await db.cashAccount.create({
    data: {
      portfolioId: individual.id,
      name: "Trading Account",
      currency: "AUD",
      balance: 15000,
      userId: user.id,
    },
  });

  // Custom group
  const group = await db.customGroup.create({
    data: { userId: user.id, name: "Sectors" },
  });

  const finCat = await db.customGroupCategory.create({
    data: { groupId: group.id, name: "Financials" },
  });
  const matCat = await db.customGroupCategory.create({
    data: { groupId: group.id, name: "Materials" },
  });

  // Assign instruments to categories
  const cba = instruments.find((i) => i.code === "CBA")!;
  const bhp = instruments.find((i) => i.code === "BHP")!;
  await db.customGroupAssignment.create({
    data: { categoryId: finCat.id, instrumentId: cba.id },
  });
  await db.customGroupAssignment.create({
    data: { categoryId: matCat.id, instrumentId: bhp.id },
  });

  // Labels
  await db.label.create({ data: { userId: user.id, name: "Growth" } });
  await db.label.create({ data: { userId: user.id, name: "Income" } });
  await db.label.create({ data: { userId: user.id, name: "Speculative" } });

  // API token
  const rawToken = "test-api-token-investalens-2024";
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await db.apiToken.create({
    data: {
      userId: user.id,
      name: "Test Token",
      tokenHash,
      scope: "admin",
    },
  });

  console.log(`API token created (use: ${rawToken})`);
  console.log("Seed complete!");

  await db.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
