import { NextResponse } from 'next/server';
import { RemovedTransaction, Transaction as PlaidTransaction } from 'plaid';
import { plaidClient } from '@/lib/plaid';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { mapPlaidCategory } from '@/lib/category-mapping';

export async function POST() {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    // Get all PlaidItems for this user
    const plaidItems = await prisma.plaidItem.findMany({
      where: { userId: auth.userId },
    });

    if (plaidItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No linked accounts found',
        added: 0,
        modified: 0,
        removed: 0,
      });
    }

    let totalAdded = 0;
    let totalModified = 0;
    let totalRemoved = 0;

    // Sync transactions for each PlaidItem
    for (const plaidItem of plaidItems) {
      const result = await syncTransactionsForItem(plaidItem);
      totalAdded += result.added;
      totalModified += result.modified;
      totalRemoved += result.removed;
    }

    return NextResponse.json({
      success: true,
      added: totalAdded,
      modified: totalModified,
      removed: totalRemoved,
    });
  } catch (error) {
    console.error('Error syncing transactions:', error);
    return NextResponse.json(
      { error: 'Failed to sync transactions' },
      { status: 500 }
    );
  }
}

async function syncTransactionsForItem(plaidItem: {
  id: string;
  accessToken: string;
  cursor: string | null;
}) {
  let cursor = plaidItem.cursor;
  let hasMore = true;

  const allAdded: PlaidTransaction[] = [];
  const allModified: PlaidTransaction[] = [];
  const allRemoved: RemovedTransaction[] = [];

  // Paginate through all transaction updates
  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: plaidItem.accessToken,
      cursor: cursor || undefined,
      count: 500, // Max allowed by Plaid
    });

    const data = response.data;

    allAdded.push(...data.added);
    allModified.push(...data.modified);
    allRemoved.push(...data.removed);

    hasMore = data.has_more;
    cursor = data.next_cursor;
  }

  // Process added transactions
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

  // Process modified transactions
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

  // Process removed transactions
  for (const removed of allRemoved) {
    if (removed.transaction_id) {
      await prisma.transaction.delete({
        where: { plaidTransactionId: removed.transaction_id },
      }).catch(() => {
        // Transaction may not exist, ignore
      });
    }
  }

  // Update cursor for next sync
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
