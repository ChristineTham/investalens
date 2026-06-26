/**
 * scripts/dedup-import-mirror-transfers.ts
 *
 * One-off repair: collapse duplicate transfer rows created when a bank statement
 * was imported into an account that already held the mirror of a transfer.
 *
 * Background: a transfer recorded in account A auto-creates a mirror row in
 * account B (source = "mirror", carrying transferAccountId but no fitId/importHash).
 * Before the import reconciliation fix, importing B's statement could not match
 * that mirror and inserted a second row (source = "import") for the same transfer
 * — doubling the transaction and the account balance.
 *
 * This script finds, within each account, an imported row that duplicates an
 * existing transfer/mirror row (±$0.01, ±3 days, same direction). It keeps the
 * transfer/mirror row (preserving the counterparty link), stamps the imported
 * row's bank identity (fitId / importHash) onto it, marks it reconciled, then
 * deletes the duplicate imported row. Balances are recomputed afterwards.
 *
 * Idempotent and conservative: only deletes rows with source = "import" that are
 * unlinked (transferAccountId = null) and match a kept transfer one-for-one.
 *
 * Usage:
 *   pnpm tsx scripts/dedup-import-mirror-transfers.ts --dry-run
 *   pnpm tsx scripts/dedup-import-mirror-transfers.ts
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

const DRY_RUN = process.argv.includes("--dry-run");

const AMOUNT_TOLERANCE = 0.01;
const DAY_WINDOW = 3;

const CREDIT_TYPES = new Set([
  "deposit",
  "interest",
  "dividend_received",
  "distribution",
  "contribution",
  "transfer_in",
  "sell_settlement",
]);

function signedAmount(type: string, amount: number): number {
  return CREDIT_TYPES.has(type) ? amount : -amount;
}

async function recomputeAccountBalance(id: string): Promise<number> {
  const [account, txs] = await Promise.all([
    db.cashAccount.findUnique({ where: { id }, select: { openingBalance: true } }),
    db.cashTransaction.findMany({
      where: { cashAccountId: id },
      select: { amount: true, type: true },
    }),
  ]);
  if (!account) throw new Error("Account not found");
  const balance = txs.reduce(
    (sum, t) => sum + signedAmount(t.type, Number(t.amount)),
    Number(account.openingBalance)
  );
  await db.cashAccount.update({ where: { id }, data: { balance } });
  return balance;
}

interface Row {
  id: string;
  cashAccountId: string;
  type: string;
  amount: number;
  date: Date;
  description: string | null;
  source: string;
  fitId: string | null;
  importHash: string | null;
  transferAccountId: string | null;
}

function daysApart(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 86_400_000;
}

function descriptionTokens(text: string | null | undefined): Set<string> {
  return new Set(
    (text ?? "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 1)
  );
}

function descriptionOverlap(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  const ta = descriptionTokens(a);
  if (ta.size === 0) return 0;
  const tb = descriptionTokens(b);
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared;
}

/** Prefer the non-empty, longer (more informative) description. */
function betterDescription(
  a: string | null | undefined,
  b: string | null | undefined
): string | null {
  const ta = (a ?? "").trim();
  const tb = (b ?? "").trim();
  if (!ta) return tb || null;
  if (!tb) return ta || null;
  return tb.length > ta.length ? tb : ta;
}

async function main() {
  console.log(
    DRY_RUN ? "🔍  DRY RUN — no changes will be written\n" : "✏️   Running in WRITE mode\n"
  );

  const accounts = await db.cashAccount.findMany({ select: { id: true, name: true } });
  console.log(`Scanning ${accounts.length} cash accounts.\n`);

  let pairsFound = 0;
  let deleted = 0;
  let stamped = 0;
  const dirtyAccounts = new Set<string>();

  for (const account of accounts) {
    const rows = (await db.cashTransaction.findMany({
      where: { cashAccountId: account.id },
      select: {
        id: true,
        cashAccountId: true,
        type: true,
        amount: true,
        date: true,
        description: true,
        source: true,
        fitId: true,
        importHash: true,
        transferAccountId: true,
      },
      orderBy: { date: "asc" },
    })) as unknown as Row[];

    // Keepers: the transfer/mirror rows (carry the counterparty link).
    const keepers = rows.filter(
      (r) => r.source === "mirror" || r.transferAccountId != null
    );
    // Candidate duplicates: plain imported rows, not themselves linked.
    const dupes = rows.filter(
      (r) => r.source === "import" && r.transferAccountId == null
    );

    const claimed = new Set<string>();

    for (const keeper of keepers) {
      const keeperIsCredit = CREDIT_TYPES.has(keeper.type);
      const keeperMag = Math.abs(Number(keeper.amount));

      let match: Row | null = null;
      let bestDayDiff = Infinity;
      let bestOverlap = -1;
      for (const d of dupes) {
        if (claimed.has(d.id) || d.id === keeper.id) continue;
        if (CREDIT_TYPES.has(d.type) !== keeperIsCredit) continue;
        if (Math.abs(Math.abs(Number(d.amount)) - keeperMag) > AMOUNT_TOLERANCE) continue;
        const dd = daysApart(d.date, keeper.date);
        if (dd > DAY_WINDOW) continue;
        const overlap = descriptionOverlap(d.description, keeper.description);
        // Closest date wins; break ties by stronger description overlap.
        if (dd < bestDayDiff || (dd === bestDayDiff && overlap > bestOverlap)) {
          bestDayDiff = dd;
          bestOverlap = overlap;
          match = d;
        }
      }

      if (!match) continue;
      claimed.add(match.id);
      pairsFound++;

      console.log(
        `  [${account.name}] keep ${keeper.id} (${keeper.source} ${keeper.type} $${keeper.amount} ${keeper.date
          .toISOString()
          .slice(0, 10)}) ← delete dup ${match.id} (import ${match.type} $${match.amount} ${match.date
          .toISOString()
          .slice(0, 10)})`
      );

      // Stamp bank identity onto the kept transfer if it lacks one, and keep the
      // more descriptive narrative (imported rows are often richer).
      const stampData: {
        fitId?: string;
        importHash?: string;
        description?: string | null;
        reconciled: boolean;
      } = {
        reconciled: true,
      };
      if (keeper.fitId == null && match.fitId != null) stampData.fitId = match.fitId;
      if (keeper.importHash == null && match.importHash != null)
        stampData.importHash = match.importHash;
      const description = betterDescription(keeper.description, match.description);
      if (description !== (keeper.description ?? null)) stampData.description = description;

      if (!DRY_RUN) {
        await db.cashTransaction.update({ where: { id: keeper.id }, data: stampData });
        await db.cashTransaction.delete({ where: { id: match.id } });
        dirtyAccounts.add(account.id);
      }
      if (stampData.fitId || stampData.importHash) stamped++;
      deleted++;
    }
  }

  if (!DRY_RUN && dirtyAccounts.size > 0) {
    console.log(`\nRecomputing balances for ${dirtyAccounts.size} account(s)...`);
    for (const accountId of dirtyAccounts) {
      const newBal = await recomputeAccountBalance(accountId);
      console.log(`  Account ${accountId}: new balance = $${newBal.toFixed(2)}`);
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary${DRY_RUN ? " (DRY RUN)" : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━
  Duplicate pairs found : ${pairsFound}
  Duplicates deleted    : ${deleted}
  Transfers stamped     : ${stamped}
  Accounts touched      : ${dirtyAccounts.size}
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => Promise.all([db.$disconnect(), pool.end()]));
