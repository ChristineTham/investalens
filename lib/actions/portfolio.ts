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
