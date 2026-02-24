-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "categoryOverride" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_category_idx" ON "Transaction"("category");
