/**
 * scripts/fix-transfer-mirrors.ts
 *
 * One-off migration: for every CashTransaction that has transferAccountId set,
 * ensure the counterparty account has a corresponding transaction pointing back.
 *
 * Logic (same as setTransactionTransferAccount):
 *   1. If counterparty already has a transaction within ±$0.01 / ±3 days that
 *      points back (or is unlinked) → cross-link it.
 *   2. Otherwise → create a mirror transaction (source = "mirror").
 *
 * Idempotent: skips any pair where back-link already exists.
 *
 * Usage:
 *   pnpm tsx scripts/fix-transfer-mirrors.ts
 *   pnpm tsx scripts/fix-transfer-mirrors.ts --dry-run
 */

import { PrismaClient, Prisma } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

const DRY_RUN = process.argv.includes("--dry-run");

function mirrorType(type: string): string {
  if (type === "transfer_out") return "transfer_in";
  if (type === "transfer_in") return "transfer_out";
  if (type === "withdrawal" || type === "buy_settlement") return "deposit";
  return "withdrawal";
}

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

async function main() {
  console.log(DRY_RUN ? "🔍  DRY RUN — no changes will be written\n" : "✏️   Running in WRITE mode\n");

  // All transactions that have a counterparty set.
  const linked = await db.cashTransaction.findMany({
    where: { transferAccountId: { not: null } },
    select: {
      id: true,
      cashAccountId: true,
      transferAccountId: true,
      type: true,
      amount: true,
      date: true,
      description: true,
      categoryId: true,
      source: true,
    },
    orderBy: { date: "asc" },
  });

  console.log(`Found ${linked.length} transactions with a counterparty set.\n`);

  let alreadyOk = 0;
  let crossLinked = 0;
  let mirrorsCreated = 0;
  let skippedSelfRef = 0;

  const dirtyAccounts = new Set<string>();

  for (const tx of linked) {
    const counterpartyAccountId = tx.transferAccountId!;

    // Skip self-referential links (shouldn't happen, but guard it).
    if (counterpartyAccountId === tx.cashAccountId) {
      console.warn(`  ⚠️  TX ${tx.id} points to its own account — skipping`);
      skippedSelfRef++;
      continue;
    }

    // Check whether the counterparty already has a back-link to this account.
    const backLink = await db.cashTransaction.findFirst({
      where: {
        cashAccountId: counterpartyAccountId,
        transferAccountId: tx.cashAccountId,
      },
      select: { id: true },
    });

    if (backLink) {
      // Already properly mirrored — nothing to do.
      alreadyOk++;
      continue;
    }

    // Look for an unlinked transaction in the counterparty that looks like the
    // same transfer: same amount (±$0.01), within 3 calendar days.
    const txDate = new Date(tx.date);
    const windowStart = new Date(txDate);
    windowStart.setDate(windowStart.getDate() - 3);
    const windowEnd = new Date(txDate);
    windowEnd.setDate(windowEnd.getDate() + 3);

    const candidate = await db.cashTransaction.findFirst({
      where: {
        cashAccountId: counterpartyAccountId,
        date: { gte: windowStart, lte: windowEnd },
        amount: {
          gte: new Prisma.Decimal(Number(tx.amount) - 0.01),
          lte: new Prisma.Decimal(Number(tx.amount) + 0.01),
        },
        transferAccountId: null,
        source: { not: "mirror" },
      },
      select: { id: true },
      orderBy: { date: "asc" },
    });

    if (candidate) {
      console.log(
        `  🔗  Cross-link: TX ${tx.id} (${tx.cashAccountId}) ↔ existing TX ${candidate.id} (${counterpartyAccountId})`
      );
      if (!DRY_RUN) {
        await db.cashTransaction.update({
          where: { id: candidate.id },
          data: { transferAccountId: tx.cashAccountId },
        });
        dirtyAccounts.add(counterpartyAccountId);
      }
      crossLinked++;
    } else {
      console.log(
        `  ➕  Create mirror: TX ${tx.id} (${tx.cashAccountId}) → new ${mirrorType(tx.type)} in ${counterpartyAccountId}  $${tx.amount}  ${tx.date.toISOString().slice(0, 10)}`
      );
      if (!DRY_RUN) {
        await db.cashTransaction.create({
          data: {
            cashAccountId: counterpartyAccountId,
            type: mirrorType(tx.type),
            amount: tx.amount,
            date: tx.date,
            description: tx.description,
            categoryId: tx.categoryId,
            transferAccountId: tx.cashAccountId,
            source: "mirror",
          },
        });
        dirtyAccounts.add(counterpartyAccountId);
      }
      mirrorsCreated++;
    }
  }

  if (!DRY_RUN && dirtyAccounts.size > 0) {
    console.log(`\nRecomputing balances for ${dirtyAccounts.size} accounts...`);
    for (const accountId of dirtyAccounts) {
      const newBal = await recomputeAccountBalance(accountId);
      console.log(`  Account ${accountId}: new balance = $${newBal.toFixed(2)}`);
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary${DRY_RUN ? " (DRY RUN)" : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━
  Already mirrored : ${alreadyOk}
  Cross-linked     : ${crossLinked}
  Mirrors created  : ${mirrorsCreated}
  Self-ref skipped : ${skippedSelfRef}
  Total processed  : ${linked.length}
`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => Promise.all([db.$disconnect(), pool.end()]));
