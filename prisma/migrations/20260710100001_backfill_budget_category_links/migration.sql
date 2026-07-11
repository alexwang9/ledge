-- Backfill sortOrder per user/type alphabetically (matches previous display order).
UPDATE "BudgetCategory" bc
SET "sortOrder" = r.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "userId", "type" ORDER BY "name") - 1 AS rn
  FROM "BudgetCategory"
) r
WHERE bc.id = r.id;

-- Link non-transfer transactions to the owning user's category matching the
-- effective name (categoryOverride wins over the Plaid-mapped name).
-- Same-name categories across types (seed has "Other" in both EXPENSE and
-- INCOME) are disambiguated by the transaction's effective flow type.
UPDATE "Transaction" t
SET "budgetCategoryId" = bc.id,
    "categorySource" = CASE WHEN t."categoryOverride" IS NOT NULL THEN 'USER' ELSE 'AUTO' END::"CategorySource"
FROM "PlaidItem" pi, "BudgetCategory" bc
WHERE pi.id = t."plaidItemId"
  AND bc."userId" = pi."userId"
  AND bc."name" = COALESCE(t."categoryOverride", t."category")
  AND bc."type" = CASE WHEN COALESCE(t."flowTypeOverride", t."flowType") = 'INCOME'
                       THEN 'INCOME' ELSE 'EXPENSE' END::"BudgetCategoryType"
  AND COALESCE(t."flowTypeOverride", t."flowType") <> 'TRANSFER';

-- Transfers the user explicitly categorized keep that assignment. Overrides
-- carried no type, so prefer an EXPENSE-typed category on name collisions.
UPDATE "Transaction" t
SET "budgetCategoryId" = pick.id,
    "categorySource" = 'USER'::"CategorySource"
FROM "PlaidItem" pi,
     (
       SELECT DISTINCT ON (b."userId", b."name") b."userId", b."name", b.id
       FROM "BudgetCategory" b
       ORDER BY b."userId", b."name",
                CASE b."type"::text WHEN 'EXPENSE' THEN 0 WHEN 'INCOME' THEN 1 ELSE 2 END
     ) pick
WHERE pi.id = t."plaidItemId"
  AND pick."userId" = pi."userId"
  AND pick."name" = t."categoryOverride"
  AND t."categoryOverride" IS NOT NULL
  AND COALESCE(t."flowTypeOverride", t."flowType") = 'TRANSFER';

-- Remaining historical transfers become ignored: this preserves today's totals
-- (transfers were excluded everywhere) and avoids flooding the new
-- Uncategorized bucket with years of credit-card payments. New transfers
-- synced after this migration surface as uncategorized for triage.
UPDATE "Transaction"
SET "ignored" = true
WHERE COALESCE("flowTypeOverride", "flowType") = 'TRANSFER'
  AND "budgetCategoryId" IS NULL;

-- DropTable (merchant budgets feature removed)
DROP TABLE "MerchantBudget";

-- DropColumn (fully replaced by budgetCategoryId + categorySource)
ALTER TABLE "Transaction" DROP COLUMN "categoryOverride";
