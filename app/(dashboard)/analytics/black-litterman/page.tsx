import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getModelsForUser } from "@/lib/services/model-list";
import { BlackLittermanClient } from "./bl-client";

export const metadata = {
  title: "Black-Litterman",
};

export default async function BlackLittermanPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [portfolios, modelRows] = await Promise.all([
    db.portfolio.findMany({
      where: { userId: session.user.id },
      include: {
        holdings: {
          include: { instrument: { select: { code: true, name: true } } },
        },
      },
    }),
    getModelsForUser(session.user.id),
  ]);
  const models = modelRows.map((m) => ({ id: m.id, name: m.name }));

  if (portfolios.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-bold">Black-Litterman</h1>
        <p className="text-muted-foreground">Create a portfolio first.</p>
      </div>
    );
  }

  const portfolio = portfolios[0];
  const assets = portfolio.holdings.map((h) => ({
    code: h.instrument.code,
    name: h.instrument.name,
  }));

  return (
    <BlackLittermanClient
      portfolios={portfolios.map((p) => ({ id: p.id, name: p.name }))}
      models={models}
      assets={assets}
    />
  );
}
