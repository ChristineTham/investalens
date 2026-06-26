"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createPortfolioSchema,
  updatePortfolioSchema,
} from "@/lib/validators/portfolio";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getPortfolios() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return db.portfolio.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { holdings: true } },
    },
  });
}

export async function getPortfolio(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const portfolio = await db.portfolio.findFirst({
    where: {
      id,
      OR: [
        { userId: session.user.id },
        { shares: { some: { email: session.user.email! } } },
      ],
    },
    include: {
      holdings: {
        include: {
          instrument: true,
          transactions: { orderBy: { tradeDate: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!portfolio) throw new Error("Portfolio not found");
  return portfolio;
}

export async function createPortfolio(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const data = createPortfolioSchema.parse(input);

  const portfolio = await db.portfolio.create({
    data: {
      ...data,
      baseCurrency: data.taxResidency === "AU" ? "AUD" : "USD",
      userId: session.user.id,
    },
  });

  revalidatePath("/portfolio");
  redirect(`/portfolio/${portfolio.id}`);
}

export async function updatePortfolio(id: string, input: unknown) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const data = updatePortfolioSchema.parse(input);

  await db.portfolio.updateMany({
    where: { id, userId: session.user.id },
    data,
  });

  revalidatePath(`/portfolio/${id}`);
  revalidatePath("/portfolio");
  revalidatePath("/dashboard");
}

export async function deletePortfolio(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.portfolio.deleteMany({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/portfolio");
  redirect("/portfolio");
}

/**
 * Merge a source portfolio into a target portfolio: all holdings, transactions,
 * fees and cash accounts move to the target, then the source is deleted. Target
 * administrative details (name, broker, account numbers, tax settings) are kept.
 * Holdings of the same instrument are consolidated into the target's holding.
 */
export async function mergePortfolio(sourceId: string, targetId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (sourceId === targetId) throw new Error("Cannot merge a portfolio into itself");

  const [source, target] = await Promise.all([
    db.portfolio.findFirst({
      where: { id: sourceId, userId: session.user.id },
      include: { holdings: { select: { id: true, instrumentId: true } } },
    }),
    db.portfolio.findFirst({
      where: { id: targetId, userId: session.user.id },
      include: { holdings: { select: { id: true, instrumentId: true } } },
    }),
  ]);

  if (!source) throw new Error("Source portfolio not found");
  if (!target) throw new Error("Target portfolio not found");

  const targetByInstrument = new Map(
    target.holdings.map((h) => [h.instrumentId, h.id])
  );

  await db.$transaction(async (tx) => {
    for (const holding of source.holdings) {
      const existing = targetByInstrument.get(holding.instrumentId);
      if (existing) {
        // Target already holds this instrument — move the transactions across
        // and drop the now-empty source holding.
        await tx.transaction.updateMany({
          where: { holdingId: holding.id },
          data: { holdingId: existing },
        });
        await tx.holding.delete({ where: { id: holding.id } });
      } else {
        // Reassign the whole holding (and its transactions) to the target.
        await tx.holding.update({
          where: { id: holding.id },
          data: { portfolioId: targetId },
        });
        targetByInstrument.set(holding.instrumentId, holding.id);
      }
    }

    // Move portfolio-level records, then remove the emptied source.
    await tx.fee.updateMany({
      where: { portfolioId: sourceId },
      data: { portfolioId: targetId },
    });

    // Move physical-account links to the target, deduping against links the
    // target already has. The source's VIRTUAL cash ledger is intentionally not
    // moved — it cascade-deletes with the source portfolio, and the target keeps
    // (and rebuilds) its own virtual ledger from the merged transactions.
    const [sourceLinks, targetLinks] = await Promise.all([
      tx.portfolioAccount.findMany({ where: { portfolioId: sourceId } }),
      tx.portfolioAccount.findMany({
        where: { portfolioId: targetId },
        select: { cashAccountId: true, isDefault: true },
      }),
    ]);
    const targetAccountIds = new Set(targetLinks.map((l) => l.cashAccountId));
    let targetHasDefault = targetLinks.some((l) => l.isDefault);
    for (const link of sourceLinks) {
      if (targetAccountIds.has(link.cashAccountId)) {
        await tx.portfolioAccount.delete({ where: { id: link.id } });
        continue;
      }
      const keepDefault = link.isDefault && !targetHasDefault;
      await tx.portfolioAccount.update({
        where: { id: link.id },
        data: { portfolioId: targetId, isDefault: keepDefault },
      });
      targetAccountIds.add(link.cashAccountId);
      if (keepDefault) targetHasDefault = true;
    }

    await tx.importJob.updateMany({
      where: { portfolioId: sourceId },
      data: { portfolioId: targetId },
    });
    await tx.portfolio.delete({ where: { id: sourceId } });
  });

  revalidatePath("/portfolio");
  revalidatePath(`/portfolio/${targetId}`);
}
