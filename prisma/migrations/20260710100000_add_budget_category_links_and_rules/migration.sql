-- AlterEnum
-- New enum value must not be referenced in this migration (Postgres forbids
-- using a value added in the same transaction); seed/app code use it only.
ALTER TYPE "BudgetCategoryType" ADD VALUE 'SAVINGS_TRANSFER';

-- CreateEnum
CREATE TYPE "CategorySource" AS ENUM ('AUTO', 'RULE', 'USER');

-- AlterTable
ALTER TABLE "BudgetCategory" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
-- categoryOverride and MerchantBudget are dropped in the follow-up backfill
-- migration, which still reads them.
ALTER TABLE "Transaction" ADD COLUMN "budgetCategoryId" TEXT,
ADD COLUMN "categorySource" "CategorySource" NOT NULL DEFAULT 'AUTO',
ADD COLUMN "ignored" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CategoryRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "merchantName" TEXT NOT NULL,
    "budgetCategoryId" TEXT,
    "ignore" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryRule_userId_idx" ON "CategoryRule"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryRule_userId_merchantName_key" ON "CategoryRule"("userId", "merchantName");

-- CreateIndex
CREATE INDEX "Transaction_budgetCategoryId_idx" ON "Transaction"("budgetCategoryId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_budgetCategoryId_fkey" FOREIGN KEY ("budgetCategoryId") REFERENCES "BudgetCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryRule" ADD CONSTRAINT "CategoryRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryRule" ADD CONSTRAINT "CategoryRule_budgetCategoryId_fkey" FOREIGN KEY ("budgetCategoryId") REFERENCES "BudgetCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
