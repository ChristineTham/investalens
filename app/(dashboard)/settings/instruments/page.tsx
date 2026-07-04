import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { classifyTaxTreatment } from "@/lib/calculations/asset-tax-class";
import { InstrumentTaxClassForm } from "@/components/forms/instrument-taxclass-form";

export const metadata: Metadata = {
  title: "Instruments",
};

export default async function InstrumentTaxClassPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Distinct instruments across the user's holdings.
  const holdings = await db.holding.findMany({
    where: { portfolio: { userId: session.user.id } },
    select: {
      instrument: {
        select: {
          id: true,
          code: true,
          name: true,
          marketCode: true,
          instrumentType: true,
          taxClass: true,
        },
      },
    },
  });

  const byId = new Map<string, (typeof holdings)[number]["instrument"]>();
  for (const h of holdings) byId.set(h.instrument.id, h.instrument);
  const instruments = [...byId.values()].sort((a, b) =>
    a.code.localeCompare(b.code)
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Settings
        </Link>
        <h1 className="mt-2 font-serif text-2xl font-bold">
          Instrument Tax Treatment
        </h1>
        <p className="text-sm text-muted-foreground">
          Override how each instrument is taxed. <strong>Auto</strong> derives
          from the instrument type (traditional bonds → income, everything else
          → CGT). Set <strong>CGT</strong> for listed bonds and hybrid
          securities, or <strong>Income</strong> for traditional bonds.
        </p>
      </div>

      {instruments.length === 0 ? (
        <p className="text-muted-foreground">No instruments held yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Effective
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Override
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {instruments.map((ins) => {
                const treatment = classifyTaxTreatment(ins);
                return (
                  <tr key={ins.id} className="hover:bg-accent/50">
                    <td className="px-4 py-3 font-medium">
                      {ins.code}
                      <span className="ml-1 text-xs text-muted-foreground">
                        {ins.marketCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {ins.name}
                    </td>
                    <td className="px-4 py-3 text-sm">{ins.instrumentType}</td>
                    <td className="px-4 py-3 text-sm">
                      {treatment === "cgt" ? "CGT" : "Income"}
                    </td>
                    <td className="px-4 py-3">
                      <InstrumentTaxClassForm
                        instrumentId={ins.id}
                        value={ins.taxClass}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
