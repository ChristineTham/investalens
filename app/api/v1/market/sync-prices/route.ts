import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  checkUserCooldown,
  setUserCooldown,
} from "@/lib/providers/rate-limiter";
import {
  syncSharePrices,
  syncBondPrices,
  syncStockInfo,
  type SyncEvent,
} from "@/lib/services/price-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Streaming market-data sync. Emits newline-delimited JSON ({@link SyncEvent})
 * so the client can render per-ticker progress for shares, bonds and company
 * info. One event per line.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const cooldown = checkUserCooldown(userId);
  if (!cooldown.allowed) {
    return NextResponse.json(
      {
        error: `Please wait ${cooldown.remainingSeconds} seconds before fetching again.`,
      },
      { status: 429 }
    );
  }
  setUserCooldown(userId);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: SyncEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        // 1. Shares & ETFs (Yahoo Finance)
        try {
          await syncSharePrices(userId, emit);
        } catch (err) {
          emit({
            type: "error",
            section: "shares",
            message: err instanceof Error ? err.message : "Share price sync failed.",
          });
        }

        // 2. Bonds (FIIG rate sheet)
        try {
          await syncBondPrices(userId, emit);
        } catch (err) {
          emit({
            type: "error",
            section: "bonds",
            message: err instanceof Error ? err.message : "Bond price sync failed.",
          });
        }

        // 3. Company info (yfinance)
        try {
          await syncStockInfo(userId, emit);
        } catch (err) {
          emit({
            type: "error",
            section: "info",
            message: err instanceof Error ? err.message : "Stock info sync failed.",
          });
        }

        emit({ type: "done" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
