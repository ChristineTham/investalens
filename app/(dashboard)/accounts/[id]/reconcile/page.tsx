import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAccountDetail } from "@/lib/services/accounts";
import { getReconciliationData } from "@/lib/services/reconciliation";
import { ReconcileClient } from "@/components/accounts/reconcile-client";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-context";

export default async function ReconcilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await getAccountDetail(id);
  if (account.isVirtual) notFound();

  const data = await getReconciliationData(id);

  return (
    <div className="space-y-6">
      <BreadcrumbLabel id={id} label={account.name} />

      <div className="flex items-center gap-4">
        <Link href={`/accounts/${id}`} className="rounded-md p-2 hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold">Reconcile</h1>
          <p className="text-sm text-muted-foreground">
            Match {account.name} transactions to portfolio buys, sells, income and fees
          </p>
        </div>
      </div>

      <ReconcileClient data={data} />
    </div>
  );
}
