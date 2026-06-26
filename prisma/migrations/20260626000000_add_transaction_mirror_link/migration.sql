-- Hard one-to-one link between a transfer transaction and its mirror /
-- cross-linked counterpart, so the pair can never orphan each other.

-- 1. Add the nullable self-referencing column (no constraint yet, so the
--    backfill can populate it freely).
ALTER TABLE "CashTransaction" ADD COLUMN "mirrorTransactionId" TEXT;

-- 2. Backfill: link each auto-created mirror to its source transaction. A mirror
--    lives in the counterparty account, points back (transferAccountId), and
--    matches on amount (±$0.01) within ±3 days. ROW_NUMBER on BOTH sides keeps
--    the pairing strictly one-to-one before the UNIQUE index is applied.
WITH ranked AS (
  SELECT
    m."id" AS mirror_id,
    p."id" AS primary_id,
    ROW_NUMBER() OVER (
      PARTITION BY m."id"
      ORDER BY ABS(EXTRACT(EPOCH FROM (p."date" - m."date"))) ASC, p."id" ASC
    ) AS rn_mirror,
    ROW_NUMBER() OVER (
      PARTITION BY p."id"
      ORDER BY ABS(EXTRACT(EPOCH FROM (p."date" - m."date"))) ASC, m."id" ASC
    ) AS rn_primary
  FROM "CashTransaction" m
  JOIN "CashTransaction" p
    ON p."cashAccountId" = m."transferAccountId"
   AND m."cashAccountId" = p."transferAccountId"
   AND ABS(p."amount" - m."amount") <= 0.01
   AND ABS(EXTRACT(EPOCH FROM (p."date" - m."date"))) <= 259200
  WHERE m."source" = 'mirror'
    AND m."transferAccountId" IS NOT NULL
)
UPDATE "CashTransaction" t
SET "mirrorTransactionId" = ranked.primary_id
FROM ranked
WHERE t."id" = ranked.mirror_id
  AND ranked.rn_mirror = 1
  AND ranked.rn_primary = 1;

-- 3. Enforce one-to-one and referential integrity.
CREATE UNIQUE INDEX "CashTransaction_mirrorTransactionId_key"
  ON "CashTransaction" ("mirrorTransactionId");

ALTER TABLE "CashTransaction"
  ADD CONSTRAINT "CashTransaction_mirrorTransactionId_fkey"
  FOREIGN KEY ("mirrorTransactionId") REFERENCES "CashTransaction" ("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
