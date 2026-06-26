-- Cron job run log for observability (surfaced on the About page).
CREATE TABLE "CronLog" (
  "id" TEXT NOT NULL,
  "job" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "durationMs" INTEGER,
  "total" INTEGER,
  "succeeded" INTEGER,
  "failed" INTEGER,
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CronLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CronLog_job_startedAt_idx" ON "CronLog" ("job", "startedAt");
CREATE INDEX "CronLog_startedAt_idx" ON "CronLog" ("startedAt");
