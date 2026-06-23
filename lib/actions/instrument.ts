"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type TaxClassOverride = "cgt" | "income" | null;

/**
 * Set the CGT tax-treatment override for an instrument the user holds.
 * `null` reverts to deriving the treatment from the instrument type.
 */
export async function updateInstrumentTaxClass(
  instrumentId: string,
  taxClass: TaxClassOverride
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (taxClass !== null && taxClass !== "cgt" && taxClass !== "income") {
    throw new Error("Invalid tax class");
  }

  // Ensure the user actually holds this instrument before editing it.
  const owned = await db.holding.findFirst({
    where: { instrumentId, portfolio: { userId: session.user.id } },
    select: { id: true },
  });
  if (!owned) throw new Error("Instrument not found");

  await db.instrument.update({
    where: { id: instrumentId },
    data: { taxClass },
  });

  revalidatePath("/settings/instruments");
}
