import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ModelSelectionPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Model Selection</h1>
        <p className="text-sm text-muted-foreground">
          Cross-validate portfolio strategies to find the best risk-adjusted approach.
        </p>
      </div>
      <p className="text-muted-foreground">
        Compares Equal Weight, Min Variance, Max Sharpe, Risk Parity, and Mean-Variance
        using walk-forward cross-validation.
      </p>
    </div>
  );
}
