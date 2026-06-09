"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function sharePortfolio(
  portfolioId: string,
  email: string,
  accessLevel: "read" | "write" | "admin" = "read"
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const portfolio = await db.portfolio.findFirst({
    where: { id: portfolioId, userId: session.user.id },
  });
  if (!portfolio) throw new Error("Portfolio not found");

  const share = await db.portfolioShare.create({
    data: { portfolioId, email, accessLevel },
  });

  revalidatePath("/settings/sharing");
  return share;
}

export async function updateShareAccess(
  shareId: string,
  accessLevel: "read" | "write" | "admin"
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.portfolioShare.updateMany({
    where: { id: shareId, portfolio: { userId: session.user.id } },
    data: { accessLevel },
  });

  revalidatePath("/settings/sharing");
}

export async function removeShare(shareId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.portfolioShare.deleteMany({
    where: { id: shareId, portfolio: { userId: session.user.id } },
  });

  revalidatePath("/settings/sharing");
}

export async function getSharedPortfolios() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return db.portfolioShare.findMany({
    where: { email: session.user.email! },
    include: { portfolio: { include: { user: { select: { name: true, email: true } } } } },
  });
}

export async function verifyPortfolioAccess(
  portfolioId: string,
  requiredLevel: "read" | "write" | "admin"
): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;

  const portfolio = await db.portfolio.findFirst({
    where: { id: portfolioId, userId: session.user.id },
  });
  if (portfolio) return true;

  const levels = ["read", "write", "admin"];
  const share = await db.portfolioShare.findFirst({
    where: { portfolioId, email: session.user.email! },
  });
  if (!share) return false;

  return levels.indexOf(share.accessLevel) >= levels.indexOf(requiredLevel);
}
