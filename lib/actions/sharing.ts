"use server";

import { auth, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const accessLevelSchema = z.enum(["read", "write", "admin"]);
const shareInputSchema = z.object({
  email: z.string().email("Invalid email address"),
  accessLevel: accessLevelSchema,
});

export async function sharePortfolio(
  portfolioId: string,
  email: string,
  accessLevel: "read" | "write" | "admin" = "read"
) {
  const user = await requireUser();

  const input = shareInputSchema.parse({ email, accessLevel });

  const portfolio = await db.portfolio.findFirst({
    where: { id: portfolioId, userId: user.id },
  });
  if (!portfolio) throw new Error("Portfolio not found");

  const share = await db.portfolioShare.create({
    data: { portfolioId, email: input.email, accessLevel: input.accessLevel },
  });

  revalidatePath("/settings/sharing");
  return share;
}

export async function updateShareAccess(
  shareId: string,
  accessLevel: "read" | "write" | "admin"
) {
  const user = await requireUser();

  const level = accessLevelSchema.parse(accessLevel);

  await db.portfolioShare.updateMany({
    where: { id: shareId, portfolio: { userId: user.id } },
    data: { accessLevel: level },
  });

  revalidatePath("/settings/sharing");
}

export async function removeShare(shareId: string) {
  const user = await requireUser();

  await db.portfolioShare.deleteMany({
    where: { id: shareId, portfolio: { userId: user.id } },
  });

  revalidatePath("/settings/sharing");
}

export async function getSharedPortfolios() {
  const user = await requireUser();

  return db.portfolioShare.findMany({
    where: { email: user.email! },
    include: {
      portfolio: { include: { user: { select: { name: true, email: true } } } },
    },
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
