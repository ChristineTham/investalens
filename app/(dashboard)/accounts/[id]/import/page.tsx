import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAccountDetail } from "@/lib/services/accounts";
import { getCategories } from "@/lib/actions/accounts";
import { listTemplatesByCategory } from "@/lib/import/templates";
import { AccountImportWizard } from "@/components/accounts/account-import-wizard";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-context";

export const metadata: Metadata = {
  title: "Import Statement",
};

export default async function AccountImportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [account, cats] = await Promise.all([getAccountDetail(id), getCategories()]);

  if (account.isVirtual) notFound();

  const categories = cats.map((c) => ({ id: c.id, name: c.name }));
  const csvTemplates = listTemplatesByCategory("cash").map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
  }));

  return (
    <div className="space-y-6">
      <BreadcrumbLabel id={id} label={account.name} />

      <div className="flex items-center gap-4">
        <Link href={`/accounts/${id}`} className="rounded-md p-2 hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold">Import statement</h1>
          <p className="text-sm text-muted-foreground">
            Import transactions into {account.name}
          </p>
        </div>
      </div>

      <AccountImportWizard
        accountId={id}
        currency={account.currency}
        categories={categories}
        csvTemplates={csvTemplates}
      />
    </div>
  );
}
