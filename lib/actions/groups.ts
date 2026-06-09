"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getGroups() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return db.customGroup.findMany({
    where: { userId: session.user.id },
    include: {
      categories: {
        include: { holdings: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function createCustomGroup(name: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const group = await db.customGroup.create({
    data: { userId: session.user.id, name },
  });

  revalidatePath("/settings/groups");
  return group;
}

export async function addCategory(groupId: string, name: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const group = await db.customGroup.findFirst({
    where: { id: groupId, userId: session.user.id },
  });
  if (!group) throw new Error("Group not found");

  const category = await db.customGroupCategory.create({
    data: { groupId, name },
  });

  revalidatePath("/settings/groups");
  return category;
}

export async function assignInstrument(categoryId: string, instrumentId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.customGroupAssignment.create({
    data: { categoryId, instrumentId },
  });

  revalidatePath("/settings/groups");
}

export async function removeAssignment(categoryId: string, instrumentId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.customGroupAssignment.deleteMany({
    where: { categoryId, instrumentId },
  });

  revalidatePath("/settings/groups");
}

export async function deleteGroup(groupId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.customGroup.deleteMany({
    where: { id: groupId, userId: session.user.id },
  });

  revalidatePath("/settings/groups");
}
