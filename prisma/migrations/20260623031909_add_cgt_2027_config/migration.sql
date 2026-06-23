-- AlterTable
ALTER TABLE "Portfolio" ADD COLUMN     "cgtRegime" TEXT NOT NULL DEFAULT 'current',
ADD COLUMN     "cgtTransitionMethod" TEXT NOT NULL DEFAULT 'apportionment',
ADD COLUMN     "incomeSupportRecipient" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isForeignResident" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marginalTaxRate" DECIMAL(5,4);
