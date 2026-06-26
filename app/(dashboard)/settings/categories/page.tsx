import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCategoriesWithUsage } from "@/lib/actions/accounts";
import { CategoryManager } from "@/components/accounts/category-manager";

export default async function CategoriesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const cats = await getCategoriesWithUsage();
  const categories = cats.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    color: c.color,
    isSystem: c.isSystem,
    usage: c._count.transactions,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Transaction Categories</h1>
        <p className="text-sm text-muted-foreground">
          Add, edit or remove the categories used to classify cash transactions.
          These apply across all of your accounts.
        </p>
      </div>

      <CategoryManager categories={categories} />
    </div>
  );
}
