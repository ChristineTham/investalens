-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "accruedInterest" DECIMAL(18,2);

-- CreateTable
CREATE TABLE "Fee" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "feeType" TEXT NOT NULL DEFAULT 'custody',
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "chargeAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "gst" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "comments" TEXT,
    "importJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Fee_portfolioId_invoiceDate_idx" ON "Fee"("portfolioId", "invoiceDate");

-- AddForeignKey
ALTER TABLE "Fee" ADD CONSTRAINT "Fee_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fee" ADD CONSTRAINT "Fee_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
