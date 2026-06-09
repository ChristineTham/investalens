import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateDiversityReport } from "@/lib/reports/diversity-report";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function DiversityReportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const portfolios = await db.portfolio.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
  });

  if (portfolios.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-bold">Diversity Report</h1>
        <p className="text-muted-foreground">Create a portfolio first.</p>
      </div>
    );
  }

  const items = await generateDiversityReport(portfolios[0].id, "type");

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold">Diversity Report</h1>
      <p className="text-sm text-muted-foreground">
        Portfolio allocation by investment type.
      </p>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Group
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Value
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Weight %
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => (
              <tr key={item.label} className="hover:bg-accent/50">
                <td className="px-4 py-3 font-medium capitalize">
                  {item.label}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(item.value)}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatPercent(item.percent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
