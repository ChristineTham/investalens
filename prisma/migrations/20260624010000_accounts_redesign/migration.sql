-- Accounts redesign: promote cash accounts to first-class, user-scoped entities
-- with bank metadata, virtual portfolio-cash ledgers, categories, debit cards,
-- portfolio↔account linking, and reconciliation. Backfills existing data.

-- ─── CashAccount: new columns ────────────────────────────────────────────────
ALTER TABLE "CashAccount"
  ADD COLUMN "userId" TEXT,
  ADD COLUMN "institution" TEXT,
  ADD COLUMN "bsb" TEXT,
  ADD COLUMN "accountNumber" TEXT,
  ADD COLUMN "accountType" TEXT NOT NULL DEFAULT 'transaction',
  ADD COLUMN "isVirtual" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "openingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "interestRate" DECIMAL(8,4),
  ADD COLUMN "website" TEXT,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;

-- Backfill userId from the owning portfolio, then enforce NOT NULL.
UPDATE "CashAccount" ca
  SET "userId" = p."userId"
  FROM "Portfolio" p
  WHERE p."id" = ca."portfolioId";
ALTER TABLE "CashAccount" ALTER COLUMN "userId" SET NOT NULL;

-- portfolioId is now optional (physical accounts link via PortfolioAccount).
ALTER TABLE "CashAccount" ALTER COLUMN "portfolioId" DROP NOT NULL;

-- ─── CashTransaction: new columns ────────────────────────────────────────────
ALTER TABLE "CashTransaction"
  ADD COLUMN "categoryId" TEXT,
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN "fitId" TEXT,
  ADD COLUMN "importHash" TEXT,
  ADD COLUMN "runningBalance" DECIMAL(18,2),
  ADD COLUMN "reconciled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "importJobId" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ─── New tables ──────────────────────────────────────────────────────────────
CREATE TABLE "DebitCard" (
    "id" TEXT NOT NULL,
    "cashAccountId" TEXT NOT NULL,
    "label" TEXT,
    "last4" TEXT,
    "network" TEXT,
    "expiry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DebitCard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PortfolioAccount" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "cashAccountId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortfolioAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CashCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'expense',
    "color" TEXT,
    "parentId" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Reconciliation" (
    "id" TEXT NOT NULL,
    "cashTransactionId" TEXT NOT NULL,
    "transactionId" TEXT,
    "feeId" TEXT,
    "matchType" TEXT NOT NULL DEFAULT 'manual',
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reconciliation_pkey" PRIMARY KEY ("id")
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX "CashAccount_userId_idx" ON "CashAccount"("userId");
CREATE UNIQUE INDEX "CashTransaction_cashAccountId_fitId_key" ON "CashTransaction"("cashAccountId", "fitId");
CREATE INDEX "CashTransaction_cashAccountId_importHash_idx" ON "CashTransaction"("cashAccountId", "importHash");
CREATE INDEX "DebitCard_cashAccountId_idx" ON "DebitCard"("cashAccountId");
CREATE UNIQUE INDEX "PortfolioAccount_portfolioId_cashAccountId_key" ON "PortfolioAccount"("portfolioId", "cashAccountId");
CREATE INDEX "PortfolioAccount_cashAccountId_idx" ON "PortfolioAccount"("cashAccountId");
CREATE INDEX "CashCategory_userId_idx" ON "CashCategory"("userId");
CREATE INDEX "Reconciliation_cashTransactionId_idx" ON "Reconciliation"("cashTransactionId");
CREATE INDEX "Reconciliation_transactionId_idx" ON "Reconciliation"("transactionId");

-- ─── Foreign keys ────────────────────────────────────────────────────────────
ALTER TABLE "CashAccount" ADD CONSTRAINT "CashAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CashCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DebitCard" ADD CONSTRAINT "DebitCard_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "CashAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PortfolioAccount" ADD CONSTRAINT "PortfolioAccount_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PortfolioAccount" ADD CONSTRAINT "PortfolioAccount_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "CashAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashCategory" ADD CONSTRAINT "CashCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashCategory" ADD CONSTRAINT "CashCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CashCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Reconciliation" ADD CONSTRAINT "Reconciliation_cashTransactionId_fkey" FOREIGN KEY ("cashTransactionId") REFERENCES "CashTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reconciliation" ADD CONSTRAINT "Reconciliation_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Reconciliation" ADD CONSTRAINT "Reconciliation_feeId_fkey" FOREIGN KEY ("feeId") REFERENCES "Fee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Data backfill: link existing cash accounts to their portfolio ───────────
INSERT INTO "PortfolioAccount" ("id", "portfolioId", "cashAccountId", "isDefault", "createdAt")
  SELECT gen_random_uuid()::text, ca."portfolioId", ca."id", true, CURRENT_TIMESTAMP
  FROM "CashAccount" ca
  WHERE ca."portfolioId" IS NOT NULL;
