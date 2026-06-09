import { auth } from "@/lib/auth";
import { getGroups } from "@/lib/actions/groups";
import { redirect } from "next/navigation";

export default async function GroupsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const groups = await getGroups();

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold">Custom Groups</h1>
      <p className="text-sm text-muted-foreground">
        Organise instruments into custom groups and categories.
      </p>

      {groups.length === 0 ? (
        <p className="text-muted-foreground">No custom groups yet.</p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <h3 className="font-medium">{group.name}</h3>
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
                  <p className="text-sm text-muted-foreground">No categories</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
