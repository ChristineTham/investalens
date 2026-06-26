import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CREDIT_TYPES, signedAmount } from "@/lib/services/accounts";
import {
  type ChartRange,
  resolveChartRange,
} from "@/lib/constants/chart-ranges";

function num(v: unknown): number {
  return v == null ? 0 : Number(v);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const range = (searchParams.get("range") || "1Y") as ChartRange;

  const account = await db.cashAccount.findFirst({
    where: { id, userId: session.user.id },
    select: { openingBalance: true },
  });
  if (!account) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { from, to } = resolveChartRange(range);

  const txs = await db.cashTransaction.findMany({
    where: { cashAccountId: id },
    select: {
      date: true,
      amount: true,
      type: true,
      category: { select: { name: true, color: true, kind: true } },
    },
    orderBy: { date: "asc" },
  });

  // ── Running balance series (carry opening forward) ──────────────────────────
  let running = num(account.openingBalance);
  const balanceByDate = new Map<string, number>();
  // ── Monthly cash flow ───────────────────────────────────────────────────────
  const flowByMonth = new Map<string, { in: number; out: number }>();
  // ── Category breakdown (money out) ──────────────────────────────────────────
  const catOut = new Map<string, { value: number; color: string | null }>();

  let moneyIn = 0;
  let moneyOut = 0;
  let interest = 0;
  let fees = 0;

  for (const tx of txs) {
    const amt = num(tx.amount);
    const signed = signedAmount(tx.type, amt);
    running += signed;

    const inWindow = tx.date >= from && tx.date <= to;
    if (!inWindow) continue;

    const dateStr = tx.date.toISOString().split("T")[0];
    balanceByDate.set(dateStr, running);

    const month = dateStr.slice(0, 7);
    const flow = flowByMonth.get(month) ?? { in: 0, out: 0 };
    if (CREDIT_TYPES.has(tx.type)) flow.in += amt;
    else flow.out += amt;
    flowByMonth.set(month, flow);

    if (CREDIT_TYPES.has(tx.type)) moneyIn += amt;
    else moneyOut += amt;
    if (tx.type === "interest") interest += amt;
    if (tx.type === "fee") fees += amt;

    // Category breakdown covers all categorised activity in the window, signed
    // so inflows (deposits, dividends, sales, transfers in) are positive and
    // outflows (purchases, fees, withdrawals) are negative — a diverging view.
    {
      const name = tx.category?.name ?? "Uncategorised";
      const row = catOut.get(name) ?? { value: 0, color: tx.category?.color ?? null };
      row.value += signed;
      catOut.set(name, row);
    }
  }

  const balanceSeries = [...balanceByDate.entries()].map(([date, balance]) => ({
    date,
    balance,
  }));
  const cashflowSeries = [...flowByMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, f]) => ({ period, in: f.in, out: -f.out }));
  const categoryBreakdown = [...catOut.entries()]
    .map(([name, r]) => ({ name, value: r.value, color: r.color }))
    .sort((a, b) => b.value - a.value);

  return NextResponse.json({
    range,
    balanceSeries,
    cashflowSeries,
    categoryBreakdown,
    kpis: { moneyIn, moneyOut, net: moneyIn - moneyOut, interest, fees },
  });
}
