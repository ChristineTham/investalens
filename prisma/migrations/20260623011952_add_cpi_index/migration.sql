-- CreateTable
CREATE TABLE "CpiIndex" (
    "id" TEXT NOT NULL,
    "quarterEnd" DATE NOT NULL,
    "label" TEXT NOT NULL,
    "indexValue" DECIMAL(12,4) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'RBA G1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CpiIndex_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CpiIndex_quarterEnd_idx" ON "CpiIndex"("quarterEnd");

-- CreateIndex
CREATE UNIQUE INDEX "CpiIndex_quarterEnd_key" ON "CpiIndex"("quarterEnd");
