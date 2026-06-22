import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  fetchFiigBondRates,
  FiigFetchError,
} from "@/lib/providers/fiig-bond-rates";

// FIIG (an Australian broker) appears to geo-restrict / firewall non-AU egress,
// so the FIIG fetch must originate from an Australian region. On the Vercel
// Hobby plan, regions are set deployment-wide via `vercel.json` ("regions":
// ["syd1"]) rather than per-route, so no `preferredRegion` is set here.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-side proxy for the FIIG bond rate sheet. Returns the parsed rates (or
 * full diagnostics on failure) as JSON to the same-origin caller.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rates = await fetchFiigBondRates();
    return NextResponse.json({
      ok: true,
      rates: [...rates.values()],
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "Failed to fetch bond rates.",
      diagnostics: err instanceof FiigFetchError ? err.diagnostics : undefined,
    });
  }
}
