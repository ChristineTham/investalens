import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PortfolioCgtForm } from "@/components/forms/portfolio-cgt-form";

export default async function PortfolioCgtSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const portfolios = await db.portfolio.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      taxEntityType: true,
      saleAllocationMethod: true,
      cgtRegime: true,
      cgtTransitionMethod: true,
      incomeSupportRecipient: true,
      isForeignResident: true,
      marginalTaxRate: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Settings
        </Link>
        <h1 className="mt-2 font-serif text-2xl font-bold">Tax &amp; CGT</h1>
        <p className="text-sm text-muted-foreground">
          Per-portfolio tax settings used by the CGT and tax reports, including
          the proposed 2027 regime projection.
        </p>
      </div>

      {portfolios.length === 0 ? (
        <p className="text-muted-foreground">Create a portfolio first.</p>
      ) : (
        <div className="space-y-4">
          {portfolios.map((p) => (
            <PortfolioCgtForm
              key={p.id}
              portfolio={{
                ...p,
                marginalTaxRate:
                  p.marginalTaxRate != null ? Number(p.marginalTaxRate) : null,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
