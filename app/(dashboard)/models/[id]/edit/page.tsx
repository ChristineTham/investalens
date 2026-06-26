import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { auth } from "@/lib/auth";
import { getModelForUser } from "@/lib/services/model-list";
import {
  ModelForm,
  type ModelFormInitial,
} from "@/app/(dashboard)/models/_components/model-form";
import { DuplicateModelButton } from "@/app/(dashboard)/models/_components/duplicate-model-button";

export default async function EditModelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const model = await getModelForUser(session.user.id, id);
  if (!model) notFound();

  // System models (userId null) are read-only — offer a duplicate-to-edit CTA.
  if (model.userId !== session.user.id) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/models/${id}`} className="rounded-md p-2 hover:bg-accent">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-serif text-2xl font-bold">{model.name}</h1>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
          <Lock className="h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">This is a system model</h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            System defaults are read-only. Duplicate it to create your own
            editable copy.
          </p>
          <div className="mt-4">
            <DuplicateModelButton id={model.id} />
          </div>
        </div>
      </div>
    );
  }

  const initial: ModelFormInitial = {
    id: model.id,
    name: model.name,
    description: model.description,
    category: model.category,
    provider: model.provider,
    baseCurrency: model.baseCurrency,
    notionalCapital: Number(model.notionalCapital),
    minCashWeight: Number(model.minCashWeight),
    defaultLookbackYears: model.defaultLookbackYears,
    constituents: model.constituents.map((c, i) => ({
      key: `existing-${i}-${c.instrumentId}`,
      instrumentCode: c.instrument.code,
      marketCode: c.instrument.marketCode,
      instrumentName: c.instrument.name,
      weightPercent: Number(c.targetWeight) * 100,
    })),
  };

  return <ModelForm mode="edit" initial={initial} />;
}
