import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateContributionReport } from "@/lib/reports/contribution-report";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function ContributionReportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const portfolios = await db.portfolio.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
  });

  if (portfolios.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-bold">Contribution Analysis</h1>
        <p className="text-muted-foreground">Create a portfolio first.</p>
      </div>
    );
  }

  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const items = await generateContributionReport(portfolios[0].id, {
    from: oneYearAgo,
    to: now,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold">Contribution Analysis</h1>
      <p className="text-sm text-muted-foreground">
        How each holding drives overall portfolio return.
      </p>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Code
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Total Return
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Contribution %
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => (
              <tr key={item.holdingId} className="hover:bg-accent/50">
                <td className="px-4 py-3 font-medium">{item.instrumentCode}</td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(item.totalReturn)}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatPercent(item.contributionPercent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
