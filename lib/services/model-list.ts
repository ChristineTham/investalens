import "server-only";
import { db } from "@/lib/db";

/**
 * The current user's models plus all system models (`userId: null`), with
 * constituents + instruments included for summary stats (count, top holdings).
 */
export async function getModelsForUser(userId: string) {
  return db.modelPortfolio.findMany({
    where: { archived: false, OR: [{ userId }, { userId: null }] },
    include: { constituents: { include: { instrument: true } } },
    orderBy: [{ isSystem: "desc" }, { category: "asc" }, { name: "asc" }],
  });
}

export type ModelWithConstituents = Awaited<
  ReturnType<typeof getModelsForUser>
>[number];

/** Load a single model the user may view (own or system), with constituents. */
export async function getModelForUser(userId: string, id: string) {
  return db.modelPortfolio.findFirst({
    where: { id, OR: [{ userId }, { userId: null }] },
    include: {
      constituents: {
        include: { instrument: true },
        orderBy: { targetWeight: "desc" },
      },
    },
  });
}
