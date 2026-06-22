import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMaturityLadder } from "@/lib/calculations/bond-analytics";
import { formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function BondsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const holdings = await db.holding.findMany({
    where: {
      portfolioId: id,
      portfolio: { userId: session.user.id },
      instrument: { instrumentType: { in: ["bond", "fixed_interest"] } },
    },
    include: { instrument: true },
  });

  // Latest stored price per bond, to flag stale / missing valuations
  const latestPrices = new Map<
    string,
    { close: number; date: Date } | null
  >();
  await Promise.all(
    holdings.map(async (h) => {
      const p = await db.price.findFirst({
        where: { instrumentId: h.instrumentId },
        orderBy: { date: "desc" },
        select: { close: true, date: true },
      });
      latestPrices.set(
        h.instrumentId,
        p ? { close: Number(p.close), date: p.date } : null
      );
    })
  );

  const STALE_DAYS = 7;
  const now = Date.now();
  function priceStatus(instrumentId: string): {
    price: number | null;
    asAt: Date | null;
    stale: boolean;
    missing: boolean;
  } {
    const p = latestPrices.get(instrumentId) ?? null;
    if (!p) return { price: null, asAt: null, stale: false, missing: true };
    const ageDays = (now - p.date.getTime()) / 86_400_000;
    return {
      price: p.close,
      asAt: p.date,
      stale: ageDays > STALE_DAYS,
      missing: false,
    };
  }

  const needsUpdate = holdings.filter((h) => {
    const s = priceStatus(h.instrumentId);
    return s.missing || s.stale;
  });

  // Bond income (coupons / interest / principal repayments)
  const incomeTransactions = await db.transaction.findMany({
    where: {
      holding: {
        portfolioId: id,
        instrument: { instrumentType: { in: ["bond", "fixed_interest"] } },
      },
      transactionType: { in: ["COUPON", "INTEREST", "RETURN_OF_CAPITAL"] },
    },
    include: { holding: { include: { instrument: true } } },
    orderBy: { tradeDate: "desc" },
  });

  const totalCoupons = incomeTransactions
    .filter((t) => t.transactionType === "COUPON" || t.transactionType === "INTEREST")
    .reduce((sum, t) => sum + Number(t.quantity) * Number(t.price), 0);
  const totalPrincipal = incomeTransactions
    .filter((t) => t.transactionType === "RETURN_OF_CAPITAL")
    .reduce((sum, t) => sum + Number(t.quantity) * Number(t.price), 0);

  // Custody fees
  const fees = await db.fee.findMany({
    where: { portfolioId: id, portfolio: { userId: session.user.id } },
    orderBy: { invoiceDate: "desc" },
  });
  const totalFees = fees.reduce((sum, f) => sum + Number(f.total), 0);

  const maturityLadder = getMaturityLadder(
    holdings.map((h) => ({
      instrument: {
        code: h.instrument.code,
        maturityDate: h.instrument.maturityDate,
        faceValue: h.instrument.faceValue
          ? Number(h.instrument.faceValue)
          : null,
      },
    }))
  );

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold">Bond Portfolio</h1>
      <p className="text-sm text-muted-foreground">
        Fixed income dashboard with yield, duration, and maturity analysis.
      </p>

      {holdings.length === 0 ? (
        <p className="text-muted-foreground">
          No bond holdings in this portfolio.
        </p>
      ) : (
        <>
          {/* Price-update notice */}
          {needsUpdate.length > 0 && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-400">
                {needsUpdate.length} bond
                {needsUpdate.length === 1 ? "" : "s"} need a price update
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {needsUpdate.map((h) => h.instrument.code).join(", ")} —
                missing or older than {STALE_DAYS} days. Use{" "}
                <span className="font-medium">Settings → Bond Prices</span> to
                refresh from the FIIG rate sheet, or add a manual price. Bonds
                not on the rate sheet keep their last/purchase price.
              </p>
            </div>
          )}

          {/* Income & fee summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Coupon Income</p>
              <p className="mt-1 text-xl font-bold text-green-600">
                ${totalCoupons.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Principal Repaid</p>
              <p className="mt-1 text-xl font-bold">
                ${totalPrincipal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Custody Fees</p>
              <p className="mt-1 text-xl font-bold text-red-600">
                ${totalFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Coupon
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Maturity
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Rating
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Price (as-at)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {holdings.map((h) => {
                  const ps = priceStatus(h.instrumentId);
                  return (
                  <tr key={h.id} className="hover:bg-accent/50">
                    <td className="px-4 py-3 font-medium">
                      {h.instrument.code}
                    </td>
                    <td className="px-4 py-3 text-sm">{h.instrument.name}</td>
                    <td className="px-4 py-3 text-right text-sm">
                      {h.instrument.couponRate
                        ? `${(Number(h.instrument.couponRate) * 100).toFixed(2)}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {h.instrument.maturityDate
                        ? formatDate(h.instrument.maturityDate)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {h.instrument.creditRating || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {ps.missing ? (
                        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                          No price
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-end gap-2">
                          <span className="font-medium">
                            {(ps.price! * 100).toFixed(3)}
                          </span>
                          <span
                            className={`text-xs ${ps.stale ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}
                          >
                            {ps.stale ? "stale · " : ""}
                            {ps.asAt ? formatDate(ps.asAt) : ""}
                          </span>
                        </span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Income payments */}
          {incomeTransactions.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="border-b border-border p-4">
                <h2 className="font-medium">Income Payments</h2>
              </div>
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Bond
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {incomeTransactions.slice(0, 30).map((t) => (
                    <tr key={t.id} className="hover:bg-accent/50">
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {t.tradeDate.toISOString().split("T")[0]}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {t.holding.instrument.code}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {t.transactionType === "RETURN_OF_CAPITAL"
                          ? "Principal"
                          : "Coupon"}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        ${(Number(t.quantity) * Number(t.price)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Custody fees */}
          {fees.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="border-b border-border p-4">
                <h2 className="font-medium">Custody Fees</h2>
              </div>
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Invoice Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Invoice #
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      Charge
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      GST
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {fees.slice(0, 30).map((f) => (
                    <tr key={f.id} className="hover:bg-accent/50">
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {f.invoiceDate.toISOString().split("T")[0]}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {f.invoiceNumber || "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        ${Number(f.chargeAmount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        ${Number(f.gst).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        ${Number(f.total).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {maturityLadder.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-medium">Maturity Ladder</h2>
              <div className="mt-4 space-y-2">
                {maturityLadder.map((item) => (
                  <div
                    key={item.instrumentCode}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium">{item.instrumentCode}</span>
                    <span className="text-muted-foreground">
                      {formatDate(item.maturityDate)} ({item.daysToMaturity}{" "}
                      days)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
