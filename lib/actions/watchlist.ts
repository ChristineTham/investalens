"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getWatchlist() {
  const user = await requireUser();

  let watchlist = await db.watchlist.findFirst({
    where: { userId: user.id },
    include: { items: true },
  });

  if (!watchlist) {
    watchlist = await db.watchlist.create({
      data: { userId: user.id, name: "Default" },
      include: { items: true },
    });
  }

  return watchlist;
}

export async function addToWatchlist(
  instrumentCode: string,
  marketCode: string,
  notes?: string
) {
  const user = await requireUser();

  let watchlist = await db.watchlist.findFirst({
    where: { userId: user.id },
  });

  if (!watchlist) {
    watchlist = await db.watchlist.create({
      data: { userId: user.id, name: "Default" },
    });
  }

  // Find or create instrument
  let instrument = await db.instrument.findUnique({
    where: { code_marketCode: { code: instrumentCode, marketCode } },
  });

  if (!instrument) {
    instrument = await db.instrument.create({
      data: {
        code: instrumentCode,
        marketCode,
        name: instrumentCode,
        currency: marketCode === "ASX" ? "AUD" : "USD",
      },
    });
  }

  await db.watchlistItem.upsert({
    where: {
      watchlistId_instrumentId: {
        watchlistId: watchlist.id,
        instrumentId: instrument.id,
      },
    },
    create: {
      watchlistId: watchlist.id,
      instrumentId: instrument.id,
      notes,
    },
    update: { notes },
  });

  revalidatePath("/tools/watchlist");
}

export async function removeFromWatchlist(itemId: string) {
  const user = await requireUser();

  await db.watchlistItem.deleteMany({
    where: { id: itemId, watchlist: { userId: user.id } },
  });

  revalidatePath("/tools/watchlist");
}

export async function updateWatchlistItem(
  itemId: string,
  data: { notes?: string; alertAbove?: number; alertBelow?: number }
) {
  const user = await requireUser();

  await db.watchlistItem.updateMany({
    where: { id: itemId, watchlist: { userId: user.id } },
    data,
  });

  revalidatePath("/tools/watchlist");
}
