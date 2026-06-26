import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { yahooFinance } from "@/lib/providers/yahoo-finance";

const MAX_CONCURRENT = 5;

export async function GET(request: Request) {
  // Verify this is called by Vercel Cron (or allow in dev)
  const authHeader = request.headers.get("authorization");
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();

  try {
    // Get all instruments that have active holdings
    const holdingInstruments = await db.instrument.findMany({
      where: {
        holdings: { some: {} },
      },
      select: { id: true, code: true, marketCode: true },
    });

    // Also get benchmark instruments (INDEX and ETF types)
    const benchmarkInstruments = await db.instrument.findMany({
      where: {
        instrumentType: { in: ["INDEX", "ETF"] },
      },
      select: { id: true, code: true, marketCode: true },
    });

    // Merge and deduplicate
    const seen = new Set<string>();
    const instruments = [...holdingInstruments, ...benchmarkInstruments].filter(
      (inst) => {
        if (seen.has(inst.id)) return false;
        seen.add(inst.id);
        return true;
      }
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let fetched = 0;
    let failed = 0;

    for (let i = 0; i < instruments.length; i += MAX_CONCURRENT) {
      const batch = instruments.slice(i, i + MAX_CONCURRENT);

      const results = await Promise.allSettled(
        batch.map(async (inst) => {
          const quote = await yahooFinance.getQuote(inst.code, inst.marketCode);
          if (quote) {
            await db.price.upsert({
              where: {
                instrumentId_date: { instrumentId: inst.id, date: today },
              },
              create: {
                instrumentId: inst.id,
                date: today,
                close: quote.price,
                volume: BigInt(quote.volume),
              },
              update: {
                close: quote.price,
                volume: BigInt(quote.volume),
              },
            });
            return true;
          }
          return false;
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled" && r.value) fetched++;
        else failed++;
      }

      // Rate limiting delay
      if (i + MAX_CONCURRENT < instruments.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    await db.cronLog.create({
      data: {
        job: "prices",
        status: "success",
        startedAt,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        total: instruments.length,
        succeeded: fetched,
        failed,
        message: `Updated ${fetched}/${instruments.length} prices${
          failed ? `, ${failed} failed` : ""
        }`,
      },
    });

    return NextResponse.json({
      success: true,
      fetched,
      failed,
      total: instruments.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await db.cronLog
      .create({
        data: {
          job: "prices",
          status: "error",
          startedAt,
          finishedAt: new Date(),
          durationMs: Date.now() - startedAt.getTime(),
          message,
        },
      })
      .catch(() => null);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
