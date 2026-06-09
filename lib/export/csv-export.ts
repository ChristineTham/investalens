"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { DateRange } from "@/lib/calculations/performance";

export async function exportTrades(
  portfolioId: string,
  dateRange?: DateRange
): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const where: Record<string, unknown> = {
    holding: { portfolioId, portfolio: { userId: session.user.id } },
  };
  if (dateRange) {
    where.tradeDate = { gte: dateRange.from, lte: dateRange.to };
  }

  const transactions = await db.transaction.findMany({
    where,
    include: { holding: { include: { instrument: true } } },
    orderBy: { tradeDate: "asc" },
  });

  const headers = [
    "Date",
    "Code",
    "Market",
    "Type",
    "Quantity",
    "Price",
    "Brokerage",
    "Currency",
    "Exchange Rate",
    "Comments",
  ];

  const rows = transactions.map((tx) => [
    tx.tradeDate.toISOString().split("T")[0],
    tx.holding.instrument.code,
    tx.holding.instrument.marketCode,
    tx.transactionType,
    String(tx.quantity),
    String(tx.price),
    String(tx.brokerage),
    tx.currency,
    String(tx.exchangeRate),
    tx.comments || "",
  ]);

  return [
    headers.join(","),
    ...rows.map((r) => r.map(escapeCsv).join(",")),
  ].join("\n");
}

export async function exportHoldings(portfolioId: string): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const holdings = await db.holding.findMany({
    where: { portfolioId, portfolio: { userId: session.user.id } },
    include: { instrument: true },
  });

  const headers = ["Code", "Market", "Name", "Type", "Currency"];
  const rows = holdings.map((h) => [
    h.instrument.code,
    h.instrument.marketCode,
    h.instrument.name,
    h.instrument.instrumentType,
    h.instrument.currency,
  ]);

  return [
    headers.join(","),
    ...rows.map((r) => r.map(escapeCsv).join(",")),
  ].join("\n");
}

export async function exportDividends(
  portfolioId: string,
  dateRange?: DateRange
): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const where: Record<string, unknown> = {
    holding: { portfolioId, portfolio: { userId: session.user.id } },
    transactionType: { in: ["DIVIDEND", "INTEREST", "COUPON"] },
  };
  if (dateRange) {
    where.tradeDate = { gte: dateRange.from, lte: dateRange.to };
  }

  const transactions = await db.transaction.findMany({
    where,
    include: { holding: { include: { instrument: true } } },
    orderBy: { tradeDate: "asc" },
  });

  const headers = [
    "Date",
    "Code",
    "Type",
    "Amount",
    "Franked",
    "Unfranked",
    "Franking Credits",
    "Foreign Tax",
  ];

  const rows = transactions.map((tx) => [
    tx.tradeDate.toISOString().split("T")[0],
    tx.holding.instrument.code,
    tx.transactionType,
    String(Number(tx.quantity) * Number(tx.price)),
    String(tx.frankedAmount || 0),
    String(tx.unfrankedAmount || 0),
    String(tx.frankingCredits || 0),
    String(tx.foreignTax || 0),
  ]);

  return [
    headers.join(","),
    ...rows.map((r) => r.map(escapeCsv).join(",")),
  ].join("\n");
}

export async function exportFullBackup(portfolioId: string): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const portfolio = await db.portfolio.findFirst({
    where: { id: portfolioId, userId: session.user.id },
    include: {
      holdings: {
        include: {
          instrument: true,
          transactions: true,
        },
      },
      cashAccounts: { include: { transactions: true } },
    },
  });

  if (!portfolio) throw new Error("Portfolio not found");
  return JSON.stringify(portfolio, null, 2);
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
