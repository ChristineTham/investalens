"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getLabels() {
  const user = await requireUser();

  return db.label.findMany({
    where: { userId: user.id },
    include: { _count: { select: { holdings: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createLabel(name: string) {
  const user = await requireUser();

  const label = await db.label.create({
    data: { userId: user.id, name },
  });

  revalidatePath("/settings/labels");
  return label;
}

export async function assignLabel(holdingId: string, labelId: string) {
  const user = await requireUser();

  const [label, holding] = await Promise.all([
    db.label.findFirst({
      where: { id: labelId, userId: user.id },
    }),
    db.holding.findFirst({
      where: { id: holdingId, portfolio: { userId: user.id } },
    }),
  ]);
  if (!label || !holding) throw new Error("Not found");

  await db.holdingLabel.create({
    data: { holdingId, labelId },
  });

  revalidatePath("/settings/labels");
}

export async function removeLabel(holdingId: string, labelId: string) {
  const user = await requireUser();

  const [label, holding] = await Promise.all([
    db.label.findFirst({
      where: { id: labelId, userId: user.id },
    }),
    db.holding.findFirst({
      where: { id: holdingId, portfolio: { userId: user.id } },
    }),
  ]);
  if (!label || !holding) throw new Error("Not found");

  await db.holdingLabel.delete({
    where: { holdingId_labelId: { holdingId, labelId } },
  });

  revalidatePath("/settings/labels");
}

export async function deleteLabel(labelId: string) {
  const user = await requireUser();

  await db.label.deleteMany({
    where: { id: labelId, userId: user.id },
  });

  revalidatePath("/settings/labels");
}
