"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  buildParcels,
  allocateSale,
  type SaleAllocationMethod,
} from "@/lib/calculations/parcels";
import { isIncomeAsset } from "@/lib/calculations/asset-tax-class";

export interface TaxableIncomeItem {
  instrumentCode: string;
  totalIncome: number;
  netDividend: number;
  frankedAmount: number;
  unfrankedAmount: number;
  interest: number;
  // Traditional bonds are CGT-exempt; discount/premium realised on sale or at
  // maturity is ordinary income (declared in full, no CGT discount).
  bondCapitalGrowth: number;
  taxDeferred: number;
  foreignIncome: number;
  frankingCredits: number;
  foreignTax: number;
}

export interface TaxableIncomeSummary {
  items: TaxableIncomeItem[];
  totals: TaxableIncomeItem;
  financialYear: string;
}

export async function generateTaxableIncomeReport(
  portfolioId: string,
  financialYear: number // e.g. 2025 means FY2024-25 (1 Jul 2024 – 30 Jun 2025)
): Promise<TaxableIncomeSummary> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const portfolio = await db.portfolio.findFirst({
    where: { id: portfolioId, userId: session.user.id },
  });
  if (!portfolio) throw new Error("Portfolio not found");

  const fyStart = new Date(financialYear - 1, portfolio.financialYearEnd, 1);
  const fyEnd = new Date(financialYear, portfolio.financialYearEnd, 0);

  const incomeTransactions = await db.transaction.findMany({
    where: {
      holding: { portfolioId },
      transactionType: { in: ["DIVIDEND", "INTEREST", "COUPON"] },
      tradeDate: { gte: fyStart, lte: fyEnd },
    },
    include: {
      holding: { include: { instrument: true } },
    },
  });

  const byInstrument: Record<string, TaxableIncomeItem> = {};

  for (const tx of incomeTransactions) {
    const code = tx.holding.instrument.code;
    if (!byInstrument[code]) {
      byInstrument[code] = {
        instrumentCode: code,
        totalIncome: 0,
        netDividend: 0,
        frankedAmount: 0,
        unfrankedAmount: 0,
        interest: 0,
        bondCapitalGrowth: 0,
        taxDeferred: 0,
        foreignIncome: 0,
        frankingCredits: 0,
        foreignTax: 0,
      };
    }

    const item = byInstrument[code];
    const amount = Number(tx.quantity) * Number(tx.price);

    if (tx.transactionType === "INTEREST" || tx.transactionType === "COUPON") {
      item.interest += amount;
    } else {
      item.netDividend += amount;
      item.frankedAmount += Number(tx.frankedAmount || 0);
      item.unfrankedAmount += Number(tx.unfrankedAmount || 0);
      item.frankingCredits += Number(tx.frankingCredits || 0);
      item.taxDeferred += Number(tx.taxDeferred || 0);
      item.foreignTax += Number(tx.foreignTax || 0);

      // If currency is not AUD, it's foreign income
      if (tx.currency !== "AUD") {
        item.foreignIncome += amount;
      }
    }

    item.totalIncome = item.netDividend + item.interest - item.taxDeferred;
  }

  // Traditional bonds are exempt from CGT: the discount/premium realised when a
  // bond is sold or redeemed at maturity is ordinary income. Compute it via the
  // same parcel allocation used by the CGT report, but report it as income.
  const allocationMethod = portfolio.saleAllocationMethod as SaleAllocationMethod;
  const bondDisposals = await db.transaction.findMany({
    where: {
      holding: { portfolioId },
      transactionType: { in: ["SELL", "MATURITY"] },
      tradeDate: { gte: fyStart, lte: fyEnd },
    },
    include: {
      holding: {
        include: {
          instrument: true,
          transactions: { orderBy: { tradeDate: "asc" } },
        },
      },
    },
    orderBy: { tradeDate: "asc" },
  });

  for (const disposal of bondDisposals) {
    if (!isIncomeAsset(disposal.holding.instrument)) continue;

    const priorTx = disposal.holding.transactions
      .filter((tx) => tx.tradeDate <= disposal.tradeDate && tx.id !== disposal.id)
      .map((tx) => ({
        id: tx.id,
        transactionType: tx.transactionType,
        tradeDate: tx.tradeDate,
        quantity: tx.quantity,
        price: tx.price,
        brokerage: tx.brokerage,
        exchangeRate: tx.exchangeRate,
        currency: tx.currency,
        comments: tx.comments,
      }));

    const parcels = buildParcels(
      priorTx,
      allocationMethod,
      portfolio.taxEntityType
    );
    const parcelResults = allocateSale(
      parcels,
      disposal.tradeDate,
      Number(disposal.quantity),
      Number(disposal.price),
      Number(disposal.brokerage),
      allocationMethod,
      portfolio.taxEntityType
    );
    const growth = parcelResults.reduce((s, r) => s + r.gain, 0);

    const code = disposal.holding.instrument.code;
    if (!byInstrument[code]) {
      byInstrument[code] = {
        instrumentCode: code,
        totalIncome: 0,
        netDividend: 0,
        frankedAmount: 0,
        unfrankedAmount: 0,
        interest: 0,
        bondCapitalGrowth: 0,
        taxDeferred: 0,
        foreignIncome: 0,
        frankingCredits: 0,
        foreignTax: 0,
      };
    }
    byInstrument[code].bondCapitalGrowth += growth;
  }

  // Final income per instrument includes bond capital growth.
  for (const item of Object.values(byInstrument)) {
    item.totalIncome =
      item.netDividend + item.interest + item.bondCapitalGrowth - item.taxDeferred;
  }

  const items = Object.values(byInstrument);

  const totals: TaxableIncomeItem = {
    instrumentCode: "TOTAL",
    totalIncome: items.reduce((s, i) => s + i.totalIncome, 0),
    netDividend: items.reduce((s, i) => s + i.netDividend, 0),
    frankedAmount: items.reduce((s, i) => s + i.frankedAmount, 0),
    unfrankedAmount: items.reduce((s, i) => s + i.unfrankedAmount, 0),
    interest: items.reduce((s, i) => s + i.interest, 0),
    bondCapitalGrowth: items.reduce((s, i) => s + i.bondCapitalGrowth, 0),
    taxDeferred: items.reduce((s, i) => s + i.taxDeferred, 0),
    foreignIncome: items.reduce((s, i) => s + i.foreignIncome, 0),
    frankingCredits: items.reduce((s, i) => s + i.frankingCredits, 0),
    foreignTax: items.reduce((s, i) => s + i.foreignTax, 0),
  };

  return {
    items,
    totals,
    financialYear: `FY${financialYear - 1}-${String(financialYear).slice(2)}`,
  };
}
