import { db } from "@/lib/db";

export interface CronLogEntry {
  id: string;
  job: string;
  status: string;
  startedAt: Date;
  durationMs: number | null;
  total: number | null;
  succeeded: number | null;
  failed: number | null;
  message: string | null;
}

/**
 * Recent scheduled-job (cron) runs, newest first. Returns an empty list if the
 * database is unavailable so the About page always renders.
 */
export async function getRecentCronLogs(limit = 10): Promise<CronLogEntry[]> {
  try {
    return await db.cronLog.findMany({
      orderBy: { startedAt: "desc" },
      take: limit,
      select: {
        id: true,
        job: true,
        status: true,
        startedAt: true,
        durationMs: true,
        total: true,
        succeeded: true,
        failed: true,
        message: true,
      },
    });
  } catch (error) {
    console.error("Failed to load recent cron logs:", error);
    return [];
  }
}
