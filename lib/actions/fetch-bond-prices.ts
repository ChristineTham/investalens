"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  fetchFiigBondRates,
  FiigFetchError,
  type FiigFetchDiagnostics,
} from "@/lib/providers/fiig-bond-rates";
import { checkUserCooldown, setUserCooldown } from "@/lib/providers/rate-limiter";
import { revalidatePath } from "next/cache";

export interface BondPriceResult {
  ok: boolean;
  error?: string;
  /** Full diagnostics (populated on failure) for a copyable error log. */
  diagnostics?: FiigFetchDiagnostics;
  matched: number;
  updated: number;
  unmatched: number;
  totalBonds: number;
  rateSheetCount: number;
  unmatchedCodes: string[];
}

function emptyResult(extra?: Partial<BondPriceResult>): BondPriceResult {
  return {
    ok: true,
    matched: 0,
    updated: 0,
    unmatched: 0,
    totalBonds: 0,
    rateSheetCount: 0,
    unmatchedCodes: [],
    ...extra,
  };
}

/**
 * Fetch current bond capital prices from the FIIG rate sheet and update the
 * latest price for each matching bond holding in the user's portfolios.
 *
 * Matching is by ISIN (instrument `code`). FIIG quotes a clean capital price as
 * a percentage of par (e.g. 98.714); imported bond transactions price per $1 of
 * face value, so we store `close = price / 100` to stay consistent with how
 * market value is computed (quantity = face value × per-$1 price).
 *
 * Returns a structured result (never throws for expected failures such as an
 * unreachable rate sheet) so the UI can show a clear message instead of a 500.
 */
export async function fetchBondPrices(): Promise<BondPriceResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return emptyResult({ ok: false, error: "You must be signed in." });
  }

  // Per-user cooldown (shared with other price fetches)
  const cooldown = checkUserCooldown(session.user.id);
  if (!cooldown.allowed) {
    return emptyResult({
      ok: false,
      error: `Please wait ${cooldown.remainingSeconds} seconds before fetching again.`,
    });
  }
  setUserCooldown(session.user.id);

  // Find the user's bond instruments
  const holdings = await db.holding.findMany({
    where: {
      portfolio: { userId: session.user.id },
      instrument: { instrumentType: { in: ["bond", "fixed_interest"] } },
    },
    select: {
      instrument: {
        select: { id: true, code: true, couponRate: true, maturityDate: true, sector: true },
      },
    },
  });

  // Deduplicate instruments (same bond may be held in multiple portfolios)
  const instruments = new Map<string, (typeof holdings)[number]["instrument"]>();
  for (const h of holdings) {
    instruments.set(h.instrument.id, h.instrument);
  }

  if (instruments.size === 0) {
    return emptyResult();
  }

  // Fetch the live rate sheet
  let rates: Awaited<ReturnType<typeof fetchFiigBondRates>>;
  try {
    rates = await fetchFiigBondRates();
  } catch (err) {
    return emptyResult({
      ok: false,
      totalBonds: instruments.size,
      error: err instanceof Error ? err.message : "Failed to fetch bond prices.",
      diagnostics:
        err instanceof FiigFetchError ? err.diagnostics : undefined,
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let matched = 0;
  let updated = 0;
  const unmatchedCodes: string[] = [];

  for (const inst of instruments.values()) {
    const rate = rates.get(inst.code.toUpperCase());
    if (!rate) {
      unmatchedCodes.push(inst.code);
      continue;
    }
    matched++;

    // Store price per $1 of face value (FIIG quotes per $100)
    const close = rate.price / 100;

    await db.price.upsert({
      where: { instrumentId_date: { instrumentId: inst.id, date: today } },
      create: { instrumentId: inst.id, date: today, close },
      update: { close },
    });
    updated++;

    // Backfill bond metadata where missing
    const metaUpdate: {
      couponRate?: number;
      maturityDate?: Date;
      sector?: string;
    } = {};
    if (inst.couponRate == null && rate.couponDetail != null) {
      metaUpdate.couponRate = rate.couponDetail;
    }
    if (inst.maturityDate == null && rate.maturityDate) {
      const d = new Date(rate.maturityDate);
      if (!isNaN(d.getTime())) metaUpdate.maturityDate = d;
    }
    if (!inst.sector && rate.sector) {
      metaUpdate.sector = rate.sector;
    }
    if (Object.keys(metaUpdate).length > 0) {
      await db.instrument.update({
        where: { id: inst.id },
        data: metaUpdate,
      });
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");

  return {
    ok: true,
    matched,
    updated,
    unmatched: unmatchedCodes.length,
    totalBonds: instruments.size,
    rateSheetCount: rates.size,
    unmatchedCodes,
  };
}
