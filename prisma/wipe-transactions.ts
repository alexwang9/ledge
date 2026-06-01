/**
 * Deletes all transactions and resets every PlaidItem's cursor so the next
 * sync replays full history through the updated classification pipeline.
 *
 * Run with: `npx tsx prisma/wipe-transactions.ts`
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const txnCount = await prisma.transaction.count();
  const itemCount = await prisma.plaidItem.count();

  console.log(`Wiping ${txnCount} transactions and resetting ${itemCount} Plaid item cursors...`);

  const deleted = await prisma.transaction.deleteMany({});
  const reset = await prisma.plaidItem.updateMany({ data: { cursor: null } });

  console.log(`Deleted ${deleted.count} transactions; reset ${reset.count} cursors.`);
  console.log('Trigger /api/plaid/sync-transactions (or hit Sync in the UI) to repopulate.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
