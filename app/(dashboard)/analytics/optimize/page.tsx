import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { OptimizeClient } from "./optimize-client";

export default async function OptimizePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const portfolios = await db.portfolio.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
  });

  if (portfolios.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-bold">Portfolio Optimisation</h1>
        <p className="text-muted-foreground">Create a portfolio first.</p>
      </div>
    );
  }

  return <OptimizeClient portfolios={portfolios} />;
}
