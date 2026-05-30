import { RemovedTransaction, Transaction as PlaidTransaction } from 'plaid';
import { plaidClient } from '@/lib/plaid';
import prisma from '@/lib/prisma';
import { mapPlaidCategory } from '@/lib/category-mapping';

type PlaidItemRecord = {
  id: string;
  accessToken: string;
  cursor: string | null;
};

export async function syncTransactionsForItem(plaidItem: PlaidItemRecord) {
  let cursor = plaidItem.cursor;
  let hasMore = true;

  const allAdded: PlaidTransaction[] = [];
  const allModified: PlaidTransaction[] = [];
  const allRemoved: RemovedTransaction[] = [];

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: plaidItem.accessToken,
      cursor: cursor || undefined,
      count: 500,
    });

    const data = response.data;
    allAdded.push(...data.added);
    allModified.push(...data.modified);
    allRemoved.push(...data.removed);

    hasMore = data.has_more;
    cursor = data.next_cursor;
  }

  for (const txn of allAdded) {
    const { category, subcategory } = mapPlaidCategory(
      txn.personal_finance_category?.detailed
        ? [
            txn.personal_finance_category.primary,
            txn.personal_finance_category.detailed.replace(
              `${txn.personal_finance_category.primary}_`,
              ''
            ),
          ]
        : txn.personal_finance_category?.primary
          ? [txn.personal_finance_category.primary]
          : null
    );

    await prisma.transaction.upsert({
      where: { plaidTransactionId: txn.transaction_id },
      update: {
        date: new Date(txn.date),
        name: txn.name,
        merchantName: txn.merchant_name || null,
        amount: txn.amount,
        category,
        subcategory,
        pending: txn.pending,
      },
      create: {
        plaidItemId: plaidItem.id,
        plaidTransactionId: txn.transaction_id,
        date: new Date(txn.date),
        name: txn.name,
        merchantName: txn.merchant_name || null,
        amount: txn.amount,
        category,
        subcategory,
        pending: txn.pending,
      },
    });
  }

  for (const txn of allModified) {
    const { category, subcategory } = mapPlaidCategory(
      txn.personal_finance_category?.detailed
        ? [
            txn.personal_finance_category.primary,
            txn.personal_finance_category.detailed.replace(
              `${txn.personal_finance_category.primary}_`,
              ''
            ),
          ]
        : txn.personal_finance_category?.primary
          ? [txn.personal_finance_category.primary]
          : null
    );

    await prisma.transaction.update({
      where: { plaidTransactionId: txn.transaction_id },
      data: {
        date: new Date(txn.date),
        name: txn.name,
        merchantName: txn.merchant_name || null,
        amount: txn.amount,
        category,
        subcategory,
        pending: txn.pending,
      },
    });
  }

  for (const removed of allRemoved) {
    if (removed.transaction_id) {
      await prisma.transaction.delete({
        where: { plaidTransactionId: removed.transaction_id },
      }).catch(() => {});
    }
  }

  await prisma.plaidItem.update({
    where: { id: plaidItem.id },
    data: { cursor },
  });

  return {
    added: allAdded.length,
    modified: allModified.length,
    removed: allRemoved.length,
  };
}
