import { auth } from "@/lib/auth";
import { getLabels } from "@/lib/actions/labels";
import { redirect } from "next/navigation";
import { CreateLabelForm, DeleteLabelButton } from "@/components/forms/label-forms";

export default async function LabelsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const labels = await getLabels();

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
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Label
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Holdings
                </th>
                <th className="w-16 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {labels.map((label) => (
                <tr key={label.id} className="hover:bg-accent/50">
                  <td className="px-4 py-3 font-medium">{label.name}</td>
                  <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                    {label._count.holdings}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DeleteLabelButton labelId={label.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
