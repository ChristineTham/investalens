import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { CreateLabelForm, DeleteLabelButton } from "@/components/forms/label-forms";
import { ManageLabelHoldings } from "@/components/forms/label-assignments";

export const metadata: Metadata = {
  title: "Labels",
};

export default async function LabelsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [labels, holdings] = await Promise.all([
    db.label.findMany({
      where: { userId: session.user.id },
      include: { holdings: { select: { holdingId: true } } },
      orderBy: { name: "asc" },
    }),
    db.holding.findMany({
      where: { portfolio: { userId: session.user.id } },
      select: {
        id: true,
        instrument: { select: { code: true, name: true } },
        portfolio: { select: { name: true } },
      },
      orderBy: { instrument: { code: "asc" } },
    }),
  ]);

  const assignableHoldings = holdings.map((h) => ({
    id: h.id,
    code: h.instrument.code,
    name: h.instrument.name,
    portfolioName: h.portfolio.name,
  }));
  const holdingById = new Map(assignableHoldings.map((h) => [h.id, h]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">Labels</h1>
          <p className="text-sm text-muted-foreground">
            Create labels to tag and filter holdings.
          </p>
        </div>
      </div>

      <CreateLabelForm />

      {labels.length === 0 ? (
        <p className="text-muted-foreground">No labels yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Label
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Holdings
                </th>
                <th className="w-48 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {labels.map((label) => {
                const assignedIds = label.holdings.map((h) => h.holdingId);
                const assigned = assignedIds
                  .map((id) => holdingById.get(id))
                  .filter((h) => h != null);
                return (
                  <tr key={label.id} className="hover:bg-accent/50">
                    <td className="px-4 py-3 font-medium">{label.name}</td>
                    <td className="px-4 py-3">
                      {assigned.length === 0 ? (
                        <span className="text-sm text-muted-foreground">
                          No holdings assigned
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {assigned.map((h) => (
                            <span
                              key={h.id}
                              className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium"
                              title={`${h.name} · ${h.portfolioName}`}
                            >
                              {h.code}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <ManageLabelHoldings
                          label={{ id: label.id, name: label.name }}
                          holdings={assignableHoldings}
                          assignedIds={assignedIds}
                        />
                        <DeleteLabelButton labelId={label.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
