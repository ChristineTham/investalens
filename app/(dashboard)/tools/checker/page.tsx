import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { checkPortfolio } from "@/lib/services/share-checker";

export default async function CheckerPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const portfolios = await db.portfolio.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
  });

  if (portfolios.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-bold">Share Checker</h1>
        <p className="text-muted-foreground">Create a portfolio first.</p>
      </div>
    );
  }

  const results = await Promise.all(
    portfolios.map(async (p) => ({
      portfolio: p.name,
      checks: await checkPortfolio(p.id),
    }))
  );

  const totalIssues = results.reduce(
    (s, r) =>
      s +
      r.checks.duplicates.length +
      r.checks.concentration.length +
      r.checks.staleData.length +
      r.checks.missingData.length +
      r.checks.anomalies.length,
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Share Checker</h1>
        <p className="text-sm text-muted-foreground">
          {totalIssues === 0
            ? "No issues found across your portfolios."
            : `Found ${totalIssues} issue${totalIssues > 1 ? "s" : ""} across your portfolios.`}
        </p>
      </div>

      {results.map((r) => {
        const checks = r.checks;
        const issues = [
          ...checks.concentration.map((c) => ({
            severity: "warning" as const,
            title: `${c.holding} is ${(c.weight * 100).toFixed(1)}% of portfolio`,
            detail: `Exceeds ${(c.threshold * 100).toFixed(0)}% concentration threshold`,
          })),
          ...checks.staleData.map((s) => ({
            severity: "warning" as const,
            title: `${s.holding} price data is stale`,
            detail: `Last updated ${s.lastPriceDate} (${s.daysSinceUpdate} days ago)`,
          })),
          ...checks.missingData.map((m) => ({
            severity: "error" as const,
            title: `${m.holding}: ${m.issue}`,
            detail: "",
          })),
          ...checks.duplicates.map((d) => ({
            severity: "info" as const,
            title: `Duplicate: ${d.holding1}`,
            detail: d.similarity,
          })),
        ];

        if (issues.length === 0) return null;

        return (
          <div key={r.portfolio} className="rounded-lg border p-4">
            <h2 className="mb-3 font-medium">{r.portfolio}</h2>
            <div className="space-y-2">
              {issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 rounded border p-2">
                  <span
                    className={`mt-0.5 rounded px-1.5 py-0.5 text-xs font-medium ${
                      issue.severity === "error"
                        ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                        : issue.severity === "warning"
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    }`}
                  >
                    {issue.severity}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{issue.title}</p>
                    {issue.detail && <p className="text-xs text-muted-foreground">{issue.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
