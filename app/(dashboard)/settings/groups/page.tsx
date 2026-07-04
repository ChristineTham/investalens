import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getGroups } from "@/lib/actions/groups";
import { redirect } from "next/navigation";
import {
  CreateGroupForm,
  AddCategoryForm,
  DeleteGroupButton,
} from "@/components/forms/group-forms";
import { GroupInstrumentAssignments } from "@/components/forms/group-assignments";

export const metadata: Metadata = {
  title: "Custom Groups",
};

export default async function GroupsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const groups = await getGroups();

  // Distinct instruments across the user's holdings, for assignment.
  const holdings = await db.holding.findMany({
    where: { portfolio: { userId: session.user.id } },
    select: {
      instrument: { select: { id: true, code: true, name: true } },
    },
    orderBy: { instrument: { code: "asc" } },
  });
  const instruments = Array.from(
    new Map(holdings.map((h) => [h.instrument.id, h.instrument])).values()
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">Custom Groups</h1>
          <p className="text-sm text-muted-foreground">
            Organise instruments into custom groups and categories.
          </p>
        </div>
      </div>

      <CreateGroupForm />

      {groups.length === 0 ? (
        <p className="text-muted-foreground">No custom groups yet.</p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            // instrumentId -> categoryId for this group's assignments.
            const assignments: Record<string, string> = {};
            for (const cat of group.categories) {
              for (const a of cat.holdings) {
                assignments[a.instrumentId] = cat.id;
              }
            }
            return (
              <div
                key={group.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{group.name}</h3>
                  <DeleteGroupButton groupId={group.id} />
                </div>
                <div className="mt-2 space-y-1">
                  {group.categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <span className="font-medium">{cat.name}</span>
                      <span>({cat.holdings.length} instruments)</span>
                    </div>
                  ))}
                  {group.categories.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No categories yet
                    </p>
                  )}
                </div>
                <AddCategoryForm groupId={group.id} />
                <GroupInstrumentAssignments
                  categories={group.categories.map((c) => ({
                    id: c.id,
                    name: c.name,
                  }))}
                  instruments={instruments}
                  assignments={assignments}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
