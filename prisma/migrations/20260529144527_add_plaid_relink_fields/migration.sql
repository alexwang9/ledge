-- AlterTable
ALTER TABLE "PlaidItem" ADD COLUMN     "needsRelink" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "plaidItemId" TEXT,
ADD COLUMN     "relinkError" TEXT;
