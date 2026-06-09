"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getLabels() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return db.label.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { holdings: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createLabel(name: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const label = await db.label.create({
    data: { userId: session.user.id, name },
  });

  revalidatePath("/settings/labels");
  return label;
}

export async function assignLabel(holdingId: string, labelId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.holdingLabel.create({
    data: { holdingId, labelId },
  });

  revalidatePath("/settings/labels");
}

export async function removeLabel(holdingId: string, labelId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.holdingLabel.delete({
    where: { holdingId_labelId: { holdingId, labelId } },
  });

  revalidatePath("/settings/labels");
}

export async function deleteLabel(labelId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.label.deleteMany({
    where: { id: labelId, userId: session.user.id },
  });

  revalidatePath("/settings/labels");
}
