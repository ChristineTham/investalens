import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Strategy Comparison",
};

export default async function BacktestComparePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Strategy Comparison</h1>
        <p className="text-sm text-muted-foreground">
          Compare multiple strategies side-by-side with overlaid equity curves.
        </p>
      </div>
      <p className="text-muted-foreground">
        Use the backtest page to run individual strategies, then compare results here.
      </p>
    </div>
  );
}
