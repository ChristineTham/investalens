"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { searchDelistedSecurities } from "@/lib/providers/delisted";
import { enrichDelistedInstrument } from "@/lib/services/delisted-enrichment";

export type TaxClassOverride = "cgt" | "income" | null;

/**
 * Set the CGT tax-treatment override for an instrument the user holds.
 * `null` reverts to deriving the treatment from the instrument type.
 */
export async function updateInstrumentTaxClass(
  instrumentId: string,
  taxClass: TaxClassOverride
) {
  const user = await requireUser();

  if (taxClass !== null && taxClass !== "cgt" && taxClass !== "income") {
    throw new Error("Invalid tax class");
  }

  // Ensure the user actually holds this instrument before editing it.
  const owned = await db.holding.findFirst({
    where: { instrumentId, portfolio: { userId: user.id } },
    select: { id: true },
  });
  if (!owned) throw new Error("Instrument not found");

  await db.instrument.update({
    where: { id: instrumentId },
    data: { taxClass },
  });

  revalidatePath("/settings/instruments");
}

export async function updateInstrumentDelisted(
  instrumentId: string,
  isDelisted: boolean,
  portfolioId?: string,
  holdingId?: string
): Promise<{ success: boolean; verified: boolean }> {
  const user = await requireUser();

  const instrument = await db.instrument.findUnique({
    where: { id: instrumentId },
    select: { code: true },
  });
  if (!instrument) throw new Error("Instrument not found");

  // Ensure the user actually holds this instrument before editing it.
  const owned = await db.holding.findFirst({
    where: { instrumentId, portfolio: { userId: user.id } },
    select: { id: true },
  });
  if (!owned) throw new Error("Instrument not found");

  let verified = true;
  if (isDelisted) {
    const cleanCode = instrument.code.trim().toUpperCase();
    const searchResults = await searchDelistedSecurities(cleanCode);
    verified = searchResults.some(
      (res) => res.code.toUpperCase() === cleanCode
    );

    const priceCount = await db.price.count({ where: { instrumentId } });
    if (priceCount === 0) {
      await enrichDelistedInstrument(instrumentId);
    } else {
      await db.instrumentInfo.upsert({
        where: { instrumentId },
        create: {
          instrumentId,
          quoteType: "DELISTED",
          fetchedAt: new Date(),
        },
        update: {
          quoteType: "DELISTED",
          fetchedAt: new Date(),
        },
      });
    }
  } else {
    await db.instrumentInfo.upsert({
      where: { instrumentId },
      create: {
        instrumentId,
        quoteType: "EQUITY",
        fetchedAt: new Date(),
      },
      update: {
        quoteType: "EQUITY",
        fetchedAt: new Date(),
      },
    });
  }

  revalidatePath("/settings/instruments");
  if (portfolioId) {
    revalidatePath(`/portfolio/${portfolioId}`);
    if (holdingId) {
      revalidatePath(`/portfolio/${portfolioId}/holdings/${holdingId}`);
    }
  }

  return { success: true, verified };
}
