-- CreateTable
CREATE TABLE "InstrumentInfo" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "longName" TEXT,
    "shortName" TEXT,
    "summary" TEXT,
    "website" TEXT,
    "sector" TEXT,
    "industry" TEXT,
    "country" TEXT,
    "city" TEXT,
    "employees" INTEGER,
    "exchange" TEXT,
    "quoteType" TEXT,
    "currency" TEXT,
    "marketCap" DECIMAL(24,2),
    "trailingPE" DECIMAL(18,4),
    "forwardPE" DECIMAL(18,4),
    "priceToBook" DECIMAL(18,4),
    "beta" DECIMAL(12,4),
    "eps" DECIMAL(18,4),
    "dividendYield" DECIMAL(10,6),
    "fiftyTwoWeekHigh" DECIMAL(18,4),
    "fiftyTwoWeekLow" DECIMAL(18,4),
    "stats" JSONB,
    "analystTargets" JSONB,
    "recommendations" JSONB,
    "upgrades" JSONB,
    "calendar" JSONB,
    "news" JSONB,
    "financials" JSONB,
    "actions" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstrumentInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InstrumentInfo_instrumentId_key" ON "InstrumentInfo"("instrumentId");

-- AddForeignKey
ALTER TABLE "InstrumentInfo" ADD CONSTRAINT "InstrumentInfo_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
