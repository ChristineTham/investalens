"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function addHolding(
  portfolioId: string,
  data: {
    instrumentCode: string;
    marketCode: string;
    instrumentName?: string;
    instrumentType?: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const portfolio = await db.portfolio.findFirst({
    where: { id: portfolioId, userId: session.user.id },
  });
  if (!portfolio) throw new Error("Portfolio not found");

  let instrument = await db.instrument.findUnique({
    where: {
      code_marketCode: {
        code: data.instrumentCode,
        marketCode: data.marketCode,
      },
    },
  });

  if (!instrument) {
    instrument = await db.instrument.create({
      data: {
        code: data.instrumentCode,
        marketCode: data.marketCode,
        name: data.instrumentName || data.instrumentCode,
        instrumentType: data.instrumentType || "equity",
        currency: data.marketCode === "ASX" ? "AUD" : "USD",
      },
    });
  }

  const holding = await db.holding.upsert({
    where: {
      portfolioId_instrumentId: { portfolioId, instrumentId: instrument.id },
    },
    create: { portfolioId, instrumentId: instrument.id },
    update: {},
    include: { instrument: true },
  });

  revalidatePath(`/portfolio/${portfolioId}`);
  return holding;
}

export async function deleteHolding(holdingId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const holding = await db.holding.findFirst({
    where: { id: holdingId, portfolio: { userId: session.user.id } },
  });
  if (!holding) throw new Error("Not found");

  await db.holding.delete({ where: { id: holdingId } });
  revalidatePath(`/portfolio/${holding.portfolioId}`);
}
