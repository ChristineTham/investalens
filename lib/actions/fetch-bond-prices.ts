"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  fetchFiigBondRates,
  FiigFetchError,
  type FiigBondRate,
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
  /** Unmatched bonds that were carried forward from their last/purchase price. */
  carriedForward: number;
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
    carriedForward: 0,
    totalBonds: 0,
    rateSheetCount: 0,
    unmatchedCodes: [],
    ...extra,
  };
}

/** Load and de-duplicate the signed-in user's bond instruments. */
async function getUserBondInstruments(userId: string) {
  const holdings = await db.holding.findMany({
    where: {
      portfolio: { userId },
      instrument: { instrumentType: { in: ["bond", "fixed_interest"] } },
    },
    select: {
      instrument: {
        select: { id: true, code: true, couponRate: true, maturityDate: true, sector: true },
      },
    },
  });

  const instruments = new Map<string, (typeof holdings)[number]["instrument"]>();
  for (const h of holdings) {
    instruments.set(h.instrument.id, h.instrument);
  }
  return instruments;
}

/**
 * Determine a fallback price (per $1 of face) for an unmatched bond, so its
 * market value never goes stale to zero. Prefers the most recent stored price,
 * otherwise derives it from the latest BUY transaction's price.
 */
async function getFallbackClose(instrumentId: string): Promise<number | null> {
  const latest = await db.price.findFirst({
    where: { instrumentId },
    orderBy: { date: "desc" },
    select: { close: true },
  });
  if (latest) return Number(latest.close);

  const buy = await db.transaction.findFirst({
    where: {
      holding: { instrumentId },
      transactionType: { in: ["BUY", "TRANSFER_IN"] },
    },
    orderBy: { tradeDate: "desc" },
    select: { price: true },
  });
  if (buy) return Number(buy.price);

  return null;
}

/**
 * Persist a rate map against the user's bond instruments, matching by ISIN.
 * FIIG quotes a clean capital price per $100 of par; we store `close = price/100`
 * to stay consistent with how bond market value is computed.
 *
 * Bonds not on the rate sheet are carried forward from their last known (or
 * purchase) price so their market value stays populated instead of going stale.
 */
async function persistRates(
  instruments: Map<string, { id: string; code: string; couponRate: unknown; maturityDate: Date | null; sector: string | null }>,
  rates: Map<string, FiigBondRate>
): Promise<BondPriceResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let matched = 0;
  let updated = 0;
  let carriedForward = 0;
  const unmatchedCodes: string[] = [];

  for (const inst of instruments.values()) {
    const rate = rates.get(inst.code.toUpperCase());
    if (!rate) {
      unmatchedCodes.push(inst.code);
      // Carry the last known / purchase price forward to today so the bond's
      // market value doesn't go stale just because it left the rate sheet.
      const fallback = await getFallbackClose(inst.id);
      if (fallback != null) {
        await db.price.upsert({
          where: { instrumentId_date: { instrumentId: inst.id, date: today } },
          create: { instrumentId: inst.id, date: today, close: fallback },
          update: {},
        });
        carriedForward++;
      }
      continue;
    }
    matched++;

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
      await db.instrument.update({ where: { id: inst.id }, data: metaUpdate });
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/portfolio", "layout");

  return {
    ok: true,
    matched,
    updated,
    unmatched: unmatchedCodes.length,
    carriedForward,
    totalBonds: instruments.size,
    rateSheetCount: rates.size,
    unmatchedCodes,
  };
}

/**
 * Fetch current bond capital prices from the FIIG rate sheet (server-side) and
 * update the latest price for each matching bond holding.
 *
 * Returns a structured result (never throws for expected failures such as an
 * unreachable rate sheet) so the UI can show a clear message instead of a 500.
 *
 * Note: if the deployment's network can't reach FIIG (corporate proxy / TLS),
 * use {@link saveBondPrices} with rates fetched from the browser instead.
 */
export async function fetchBondPrices(): Promise<BondPriceResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return emptyResult({ ok: false, error: "You must be signed in." });
  }

  const cooldown = checkUserCooldown(session.user.id);
  if (!cooldown.allowed) {
    return emptyResult({
      ok: false,
      error: `Please wait ${cooldown.remainingSeconds} seconds before fetching again.`,
    });
  }
  setUserCooldown(session.user.id);

  const instruments = await getUserBondInstruments(session.user.id);
  if (instruments.size === 0) return emptyResult();

  let rates: Map<string, FiigBondRate>;
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

  return persistRates(instruments, rates);
}

/**
 * Persist bond rates that were fetched elsewhere (e.g. the Sydney-pinned
 * `/api/v1/market/bond-rates` route) so the FIIG fetch can run from an allowed
 * region while persistence runs wherever the action is invoked.
 */
export async function saveBondPrices(
  rateList: FiigBondRate[]
): Promise<BondPriceResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return emptyResult({ ok: false, error: "You must be signed in." });
  }

  const instruments = await getUserBondInstruments(session.user.id);
  if (instruments.size === 0) return emptyResult();

  const rates = new Map<string, FiigBondRate>();
  for (const r of rateList) {
    if (r?.isin && typeof r.price === "number") {
      rates.set(r.isin.toUpperCase(), r);
    }
  }

  if (rates.size === 0) {
    return emptyResult({
      ok: false,
      totalBonds: instruments.size,
      error: "No valid bond rates were provided.",
    });
  }

  return persistRates(instruments, rates);
}

