/**
 * scripts/check-referential-integrity.ts
 *
 * Comprehensive database soundness checker for InvestaLens. Validates both
 * hard (FK-enforced) and soft (application-level) referential integrity across
 * the whole schema, plus domain invariants (transfer mirrors, cached balances,
 * default settlement accounts, category trees, reconciliations).
 *
 * Read-only by default. Pass --fix to repair every issue it can safely resolve:
 *   - nulls dangling nullable references,
 *   - deletes unreachable orphan rows,
 *   - forges / repairs the hard transfer-mirror link,
 *   - deletes orphaned auto-mirrors and empty reconciliations,
 *   - normalises negative amounts and recomputes cached balances.
 *
 * Usage:
 *   pnpm tsx scripts/check-referential-integrity.ts
 *   pnpm tsx scripts/check-referential-integrity.ts --fix
 */

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

const FIX = process.argv.includes("--fix");

// Canonical credit (balance-increasing) cash types, mirrored from
// lib/import/bank-statement.ts. Used to derive signed amounts for balances.
const CREDIT_TYPES = [
  "deposit",
  "interest",
  "dividend_received",
  "distribution",
  "contribution",
  "transfer_in",
  "sell_settlement",
];
const CREDIT_SQL = CREDIT_TYPES.map((t) => `'${t}'`).join(", ");
const SIGNED_AMOUNT = `CASE WHEN t.type IN (${CREDIT_SQL}) THEN t.amount ELSE -t.amount END`;
const TRANSFER_MATCH = `ABS(a."amount" - b."amount") <= 0.01 AND ABS(EXTRACT(EPOCH FROM (a."date" - b."date"))) <= 259200`;

interface CheckResult {
  name: string;
  severity: "error" | "warning";
  found: number;
  fixed: number;
  note?: string;
}
const results: CheckResult[] = [];

async function count(sql: string): Promise<number> {
  const rows = await db.$queryRawUnsafe<{ n: bigint }[]>(sql);
  return Number(rows[0]?.n ?? 0);
}

async function exec(statements: string | string[]): Promise<number> {
  const list = Array.isArray(statements) ? statements : [statements];
  let total = 0;
  for (const sql of list) total += Number(await db.$executeRawUnsafe(sql));
  return total;
}

/**
 * Register a check. `countSql` must return a single column `n`. When --fix is on
 * and `fix` is provided, it runs and the post-fix count is reported as resolved.
 */
async function check(opts: {
  name: string;
  severity?: "error" | "warning";
  countSql: string;
  fix?: string | string[];
}) {
  const severity = opts.severity ?? "error";
  const found = await count(opts.countSql);
  let fixed = 0;
  if (FIX && found > 0 && opts.fix) {
    await exec(opts.fix);
    const remaining = await count(opts.countSql);
    fixed = found - remaining;
  }
  results.push({ name: opts.name, severity, found, fixed });
  const icon = found === 0 ? "✅" : severity === "error" ? "❌" : "⚠️ ";
  const fixNote = FIX && fixed > 0 ? `  → fixed ${fixed}` : "";
  console.log(`${icon}  ${opts.name}: ${found}${fixNote}`);
}

async function main() {
  console.log(
    FIX ? "🔧  Referential integrity — FIX mode\n" : "🔍  Referential integrity — read-only (pass --fix to repair)\n"
  );

  // ── A. Soft foreign keys (no DB constraint — real orphan risk) ──────────────
  console.log("── Soft foreign-key references ──");

  await check({
    name: "Watchlists with missing owner",
    countSql: `SELECT COUNT(*) n FROM "Watchlist" w WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = w."userId")`,
    fix: `DELETE FROM "Watchlist" w WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = w."userId")`,
  });
  await check({
    name: "Watchlist items with missing instrument",
    countSql: `SELECT COUNT(*) n FROM "WatchlistItem" wi WHERE NOT EXISTS (SELECT 1 FROM "Instrument" i WHERE i.id = wi."instrumentId")`,
    fix: `DELETE FROM "WatchlistItem" wi WHERE NOT EXISTS (SELECT 1 FROM "Instrument" i WHERE i.id = wi."instrumentId")`,
  });
  await check({
    name: "Mapping templates with missing owner",
    countSql: `SELECT COUNT(*) n FROM "MappingTemplate" m WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = m."userId")`,
    fix: `DELETE FROM "MappingTemplate" m WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = m."userId")`,
  });
  await check({
    name: "Custom groups with missing owner",
    countSql: `SELECT COUNT(*) n FROM "CustomGroup" g WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = g."userId")`,
    fix: `DELETE FROM "CustomGroup" g WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = g."userId")`,
  });
  await check({
    name: "Labels with missing owner",
    countSql: `SELECT COUNT(*) n FROM "Label" l WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = l."userId")`,
    fix: `DELETE FROM "Label" l WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = l."userId")`,
  });
  await check({
    name: "Custom-group assignments with missing instrument",
    countSql: `SELECT COUNT(*) n FROM "CustomGroupAssignment" a WHERE NOT EXISTS (SELECT 1 FROM "Instrument" i WHERE i.id = a."instrumentId")`,
    fix: `DELETE FROM "CustomGroupAssignment" a WHERE NOT EXISTS (SELECT 1 FROM "Instrument" i WHERE i.id = a."instrumentId")`,
  });
  await check({
    name: "Custom instruments with missing creator",
    severity: "warning",
    countSql: `SELECT COUNT(*) n FROM "Instrument" i WHERE i."createdByUserId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = i."createdByUserId")`,
    fix: `UPDATE "Instrument" i SET "createdByUserId" = NULL WHERE i."createdByUserId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = i."createdByUserId")`,
  });
  await check({
    name: "Cash transactions referencing a missing import job",
    severity: "warning",
    countSql: `SELECT COUNT(*) n FROM "CashTransaction" ct WHERE ct."importJobId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "ImportJob" j WHERE j.id = ct."importJobId")`,
    fix: `UPDATE "CashTransaction" ct SET "importJobId" = NULL WHERE ct."importJobId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "ImportJob" j WHERE j.id = ct."importJobId")`,
  });

  // ── B. Hard foreign keys (DB-enforced — should always be 0) ─────────────────
  console.log("\n── Hard foreign-key verification (expect 0) ──");

  const hardFks: { name: string; sql: string }[] = [
    {
      name: "Holdings → Portfolio",
      sql: `SELECT COUNT(*) n FROM "Holding" h WHERE NOT EXISTS (SELECT 1 FROM "Portfolio" p WHERE p.id = h."portfolioId")`,
    },
    {
      name: "Holdings → Instrument",
      sql: `SELECT COUNT(*) n FROM "Holding" h WHERE NOT EXISTS (SELECT 1 FROM "Instrument" i WHERE i.id = h."instrumentId")`,
    },
    {
      name: "Transactions → Holding",
      sql: `SELECT COUNT(*) n FROM "Transaction" t WHERE NOT EXISTS (SELECT 1 FROM "Holding" h WHERE h.id = t."holdingId")`,
    },
    {
      name: "Prices → Instrument",
      sql: `SELECT COUNT(*) n FROM "Price" p WHERE NOT EXISTS (SELECT 1 FROM "Instrument" i WHERE i.id = p."instrumentId")`,
    },
    {
      name: "Cash transactions → CashAccount",
      sql: `SELECT COUNT(*) n FROM "CashTransaction" ct WHERE NOT EXISTS (SELECT 1 FROM "CashAccount" a WHERE a.id = ct."cashAccountId")`,
    },
    {
      name: "Cash accounts → User",
      sql: `SELECT COUNT(*) n FROM "CashAccount" a WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = a."userId")`,
    },
    {
      name: "Reconciliations → CashTransaction",
      sql: `SELECT COUNT(*) n FROM "Reconciliation" r WHERE NOT EXISTS (SELECT 1 FROM "CashTransaction" ct WHERE ct.id = r."cashTransactionId")`,
    },
    {
      name: "Portfolio-account links → CashAccount",
      sql: `SELECT COUNT(*) n FROM "PortfolioAccount" pa WHERE NOT EXISTS (SELECT 1 FROM "CashAccount" a WHERE a.id = pa."cashAccountId")`,
    },
  ];
  for (const fk of hardFks) {
    const found = await count(fk.sql);
    results.push({ name: `FK ${fk.name}`, severity: "error", found, fixed: 0 });
    console.log(`${found === 0 ? "✅" : "❌"}  FK ${fk.name}: ${found}`);
  }

  // ── C. Transfer & mirror integrity ─────────────────────────────────────────
  console.log("\n── Transfer & mirror integrity ──");

  await check({
    name: "Self-referential transfers (counterparty = own account)",
    countSql: `SELECT COUNT(*) n FROM "CashTransaction" WHERE "transferAccountId" = "cashAccountId"`,
    fix: `UPDATE "CashTransaction" SET "transferAccountId" = NULL, "mirrorTransactionId" = NULL WHERE "transferAccountId" = "cashAccountId"`,
  });
  await check({
    name: "Transfers crossing user boundaries",
    countSql: `SELECT COUNT(*) n FROM "CashTransaction" ct JOIN "CashAccount" a ON a.id = ct."cashAccountId" JOIN "CashAccount" b ON b.id = ct."transferAccountId" WHERE ct."transferAccountId" IS NOT NULL AND a."userId" <> b."userId"`,
    fix: `UPDATE "CashTransaction" ct SET "transferAccountId" = NULL, "mirrorTransactionId" = NULL FROM "CashAccount" a, "CashAccount" b WHERE a.id = ct."cashAccountId" AND b.id = ct."transferAccountId" AND a."userId" <> b."userId"`,
  });
  await check({
    name: "Mirror links pointing within the same account",
    countSql: `SELECT COUNT(*) n FROM "CashTransaction" a JOIN "CashTransaction" b ON a."mirrorTransactionId" = b.id WHERE a."cashAccountId" = b."cashAccountId"`,
    fix: `UPDATE "CashTransaction" a SET "mirrorTransactionId" = NULL FROM "CashTransaction" b WHERE a."mirrorTransactionId" = b.id AND a."cashAccountId" = b."cashAccountId"`,
  });
  await check({
    name: "Mirror-link chains (row both points and is pointed-to)",
    countSql: `SELECT COUNT(*) n FROM "CashTransaction" a WHERE a."mirrorTransactionId" IS NOT NULL AND EXISTS (SELECT 1 FROM "CashTransaction" c WHERE c."mirrorTransactionId" = a.id)`,
    fix: `UPDATE "CashTransaction" a SET "mirrorTransactionId" = NULL WHERE a."mirrorTransactionId" IS NOT NULL AND EXISTS (SELECT 1 FROM "CashTransaction" c WHERE c."mirrorTransactionId" = a.id)`,
  });

  // Heal missing hard links for genuine transfer pairs (cross-linked reals or
  // mirrors the migration could not backfill). Must run before orphan deletion.
  await check({
    name: "Transfer pairs missing the hard mirror link",
    severity: "warning",
    countSql: `
      SELECT COUNT(*) n FROM "CashTransaction" a
      JOIN "CashTransaction" b
        ON a."transferAccountId" = b."cashAccountId" AND b."transferAccountId" = a."cashAccountId" AND ${TRANSFER_MATCH}
      WHERE a.id < b.id
        AND a."mirrorTransactionId" IS NULL AND b."mirrorTransactionId" IS NULL
        AND NOT EXISTS (SELECT 1 FROM "CashTransaction" x WHERE x."mirrorTransactionId" = a.id)
        AND NOT EXISTS (SELECT 1 FROM "CashTransaction" y WHERE y."mirrorTransactionId" = b.id)`,
    fix: `
      WITH cand AS (
        SELECT a.id AS a_id, b.id AS b_id,
          ROW_NUMBER() OVER (PARTITION BY a.id ORDER BY ABS(EXTRACT(EPOCH FROM (a."date" - b."date"))) ASC, b.id) AS rn_a,
          ROW_NUMBER() OVER (PARTITION BY b.id ORDER BY ABS(EXTRACT(EPOCH FROM (a."date" - b."date"))) ASC, a.id) AS rn_b
        FROM "CashTransaction" a
        JOIN "CashTransaction" b
          ON a."transferAccountId" = b."cashAccountId" AND b."transferAccountId" = a."cashAccountId" AND ${TRANSFER_MATCH}
        WHERE a.id < b.id
          AND a."mirrorTransactionId" IS NULL AND b."mirrorTransactionId" IS NULL
          AND NOT EXISTS (SELECT 1 FROM "CashTransaction" x WHERE x."mirrorTransactionId" = a.id)
          AND NOT EXISTS (SELECT 1 FROM "CashTransaction" y WHERE y."mirrorTransactionId" = b.id)
      )
      UPDATE "CashTransaction" t SET "mirrorTransactionId" = cand.b_id
      FROM cand WHERE t.id = cand.a_id AND cand.rn_a = 1 AND cand.rn_b = 1`,
  });

  await check({
    name: "Linked pairs with mismatched back-pointers",
    countSql: `SELECT COUNT(*) n FROM "CashTransaction" a JOIN "CashTransaction" b ON a."mirrorTransactionId" = b.id WHERE a."transferAccountId" IS DISTINCT FROM b."cashAccountId" OR b."transferAccountId" IS DISTINCT FROM a."cashAccountId"`,
    fix: [
      `UPDATE "CashTransaction" a SET "transferAccountId" = b."cashAccountId" FROM "CashTransaction" b WHERE a."mirrorTransactionId" = b.id AND a."transferAccountId" IS DISTINCT FROM b."cashAccountId"`,
      `UPDATE "CashTransaction" b SET "transferAccountId" = a."cashAccountId" FROM "CashTransaction" a WHERE a."mirrorTransactionId" = b.id AND b."transferAccountId" IS DISTINCT FROM a."cashAccountId"`,
    ],
  });

  await check({
    name: "Orphaned auto-mirrors (no counterpart anywhere)",
    countSql: `
      SELECT COUNT(*) n FROM "CashTransaction" m
      WHERE m.source = 'mirror'
        AND m."mirrorTransactionId" IS NULL
        AND NOT EXISTS (SELECT 1 FROM "CashTransaction" x WHERE x."mirrorTransactionId" = m.id)
        AND NOT EXISTS (
          SELECT 1 FROM "CashTransaction" p
          WHERE p."cashAccountId" = m."transferAccountId" AND p."transferAccountId" = m."cashAccountId"
            AND ABS(p."amount" - m."amount") <= 0.01 AND ABS(EXTRACT(EPOCH FROM (p."date" - m."date"))) <= 259200
        )`,
    fix: `
      DELETE FROM "CashTransaction" m
      WHERE m.source = 'mirror'
        AND m."mirrorTransactionId" IS NULL
        AND NOT EXISTS (SELECT 1 FROM "CashTransaction" x WHERE x."mirrorTransactionId" = m.id)
        AND NOT EXISTS (
          SELECT 1 FROM "CashTransaction" p
          WHERE p."cashAccountId" = m."transferAccountId" AND p."transferAccountId" = m."cashAccountId"
            AND ABS(p."amount" - m."amount") <= 0.01 AND ABS(EXTRACT(EPOCH FROM (p."date" - m."date"))) <= 259200
        )`,
  });

  await check({
    name: "Negative stored amounts (must be positive magnitude)",
    countSql: `SELECT COUNT(*) n FROM "CashTransaction" WHERE amount < 0`,
    fix: `UPDATE "CashTransaction" SET amount = ABS(amount) WHERE amount < 0`,
  });

  // ── D. Category trees ──────────────────────────────────────────────────────
  console.log("\n── Category trees ──");

  await check({
    name: "Cash categories with invalid parent (missing / cross-user / self)",
    countSql: `SELECT COUNT(*) n FROM "CashCategory" c LEFT JOIN "CashCategory" p ON p.id = c."parentId" WHERE c."parentId" IS NOT NULL AND (p.id IS NULL OR p."userId" <> c."userId" OR p.id = c.id)`,
    fix: `UPDATE "CashCategory" c SET "parentId" = NULL FROM (SELECT c2.id FROM "CashCategory" c2 LEFT JOIN "CashCategory" p ON p.id = c2."parentId" WHERE c2."parentId" IS NOT NULL AND (p.id IS NULL OR p."userId" <> c2."userId" OR p.id = c2.id)) bad WHERE c.id = bad.id`,
  });

  // ── E. Settlement accounts ─────────────────────────────────────────────────
  console.log("\n── Settlement accounts ──");

  await check({
    name: "Portfolios with multiple default settlement accounts",
    countSql: `SELECT COUNT(*) n FROM (SELECT "portfolioId" FROM "PortfolioAccount" WHERE "isDefault" = true GROUP BY "portfolioId" HAVING COUNT(*) > 1) s`,
    fix: `UPDATE "PortfolioAccount" p SET "isDefault" = false WHERE p."isDefault" = true AND p.id <> (SELECT p2.id FROM "PortfolioAccount" p2 WHERE p2."portfolioId" = p."portfolioId" AND p2."isDefault" = true ORDER BY p2."createdAt" ASC, p2.id ASC LIMIT 1)`,
  });

  // ── F. Reconciliations ─────────────────────────────────────────────────────
  console.log("\n── Reconciliations ──");

  await check({
    name: "Reconciliations matched to nothing (no transaction or fee)",
    severity: "warning",
    countSql: `SELECT COUNT(*) n FROM "Reconciliation" WHERE "transactionId" IS NULL AND "feeId" IS NULL`,
    fix: `DELETE FROM "Reconciliation" WHERE "transactionId" IS NULL AND "feeId" IS NULL`,
  });

  // ── G. Cached balances (run last — earlier fixes change balances) ──────────
  console.log("\n── Cached balances ──");

  const balanceCountSql = `
    SELECT COUNT(*) n FROM "CashAccount" a
    WHERE ABS(a.balance - (a."openingBalance" + COALESCE(
      (SELECT SUM(${SIGNED_AMOUNT}) FROM "CashTransaction" t WHERE t."cashAccountId" = a.id), 0))) > 0.005`;
  const drift = await count(balanceCountSql);
  let balancesFixed = 0;
  if (FIX && drift > 0) {
    await exec(`
      UPDATE "CashAccount" a SET balance = a."openingBalance" + COALESCE(
        (SELECT SUM(${SIGNED_AMOUNT}) FROM "CashTransaction" t WHERE t."cashAccountId" = a.id), 0)`);
    const remaining = await count(balanceCountSql);
    balancesFixed = drift - remaining;
  }
  results.push({ name: "Cached account balance drift", severity: "warning", found: drift, fixed: balancesFixed });
  console.log(
    `${drift === 0 ? "✅" : "⚠️ "}  Cached account balance drift: ${drift}${FIX && balancesFixed > 0 ? `  → fixed ${balancesFixed}` : ""}`
  );

  // ── Summary ────────────────────────────────────────────────────────────────
  const totalFound = results.reduce((s, r) => s + r.found, 0);
  const totalFixed = results.reduce((s, r) => s + r.fixed, 0);
  const remaining = totalFound - totalFixed;
  const errorsRemaining = results
    .filter((r) => r.severity === "error")
    .reduce((s, r) => s + (r.found - r.fixed), 0);

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary${FIX ? " (FIX mode)" : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Issues found    : ${totalFound}
  Issues fixed    : ${totalFixed}
  Issues remaining: ${remaining}
`);

  if (remaining > 0 && !FIX) {
    console.log("Run with --fix to repair the resolvable issues.\n");
  }
  // Non-zero exit when unresolved hard-integrity errors remain (useful for CI).
  if (errorsRemaining > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => Promise.all([db.$disconnect(), pool.end()]));
