"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getGroups() {
  const user = await requireUser();

  return db.customGroup.findMany({
    where: { userId: user.id },
    include: {
      categories: {
        include: { holdings: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function createCustomGroup(name: string) {
  const user = await requireUser();

  const group = await db.customGroup.create({
    data: { userId: user.id, name },
  });

  revalidatePath("/settings/groups");
  return group;
}

export async function addCategory(groupId: string, name: string) {
  const user = await requireUser();

  const group = await db.customGroup.findFirst({
    where: { id: groupId, userId: user.id },
  });
  if (!group) throw new Error("Group not found");

  const category = await db.customGroupCategory.create({
    data: { groupId, name },
  });

  revalidatePath("/settings/groups");
  return category;
}

export async function assignInstrument(
  categoryId: string,
  instrumentId: string
) {
  const user = await requireUser();

  const category = await db.customGroupCategory.findFirst({
    where: { id: categoryId, group: { userId: user.id } },
  });
  if (!category) throw new Error("Not found");

  await db.customGroupAssignment.create({
    data: { categoryId, instrumentId },
  });

  revalidatePath("/settings/groups");
}

export async function removeAssignment(
  categoryId: string,
  instrumentId: string
) {
  const user = await requireUser();

  const category = await db.customGroupCategory.findFirst({
    where: { id: categoryId, group: { userId: user.id } },
  });
  if (!category) throw new Error("Not found");

  await db.customGroupAssignment.deleteMany({
    where: { categoryId, instrumentId },
  });

  revalidatePath("/settings/groups");
}

export async function deleteGroup(groupId: string) {
  const user = await requireUser();

  await db.customGroup.deleteMany({
    where: { id: groupId, userId: user.id },
  });

  revalidatePath("/settings/groups");
}
