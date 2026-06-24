-- AlterTable
ALTER TABLE "CashTransaction" ADD COLUMN     "transferAccountId" TEXT;

-- CreateIndex
CREATE INDEX "CashTransaction_transferAccountId_idx" ON "CashTransaction"("transferAccountId");

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_transferAccountId_fkey" FOREIGN KEY ("transferAccountId") REFERENCES "CashAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
