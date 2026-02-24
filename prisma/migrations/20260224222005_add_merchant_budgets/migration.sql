-- CreateTable
CREATE TABLE "MerchantBudget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "merchantName" TEXT NOT NULL,
    "monthlyLimit" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantBudget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MerchantBudget_userId_idx" ON "MerchantBudget"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantBudget_userId_merchantName_key" ON "MerchantBudget"("userId", "merchantName");

-- AddForeignKey
ALTER TABLE "MerchantBudget" ADD CONSTRAINT "MerchantBudget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
