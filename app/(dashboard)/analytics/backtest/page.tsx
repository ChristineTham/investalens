import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getModelsForUser } from "@/lib/services/model-list";
import { BacktestClient } from "./backtest-client";

export const metadata = {
  title: "Backtest",
};

export default async function BacktestPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [portfolios, modelRows] = await Promise.all([
    db.portfolio.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true },
    }),
    getModelsForUser(session.user.id),
  ]);

  const models = modelRows.map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
  }));

  if (portfolios.length === 0 && models.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-bold">Backtesting</h1>
        <p className="text-muted-foreground">
          Create a portfolio or a model first.
        </p>
      </div>
    );
  }

  return <BacktestClient portfolios={portfolios} models={models} />;
}
