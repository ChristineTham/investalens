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
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {holdings.map((h) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
