import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getModelsForUser } from "@/lib/services/model-list";
import { CorrelationsClient } from "./correlations-client";

export const metadata = {
  title: "Correlations",
};

export default async function CorrelationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [portfolios, modelRows] = await Promise.all([
    db.portfolio.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true },
    }),
    getModelsForUser(session.user.id),
  ]);
  const models = modelRows.map((m) => ({ id: m.id, name: m.name }));

  if (portfolios.length === 0 && models.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-bold">Correlation Analysis</h1>
        <p className="text-muted-foreground">Create a portfolio or model first.</p>
      </div>
    );
  }

  return <CorrelationsClient portfolios={portfolios} models={models} />;
}
