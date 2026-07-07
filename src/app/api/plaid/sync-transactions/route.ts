import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getPlaidErrorCode, syncTransactionsForItem } from '@/lib/plaid-sync';

export async function POST() {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
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
    const itemErrors: { institutionName: string; error: string }[] = [];

    // One failing institution must not block the others from syncing.
    for (const plaidItem of plaidItems) {
      try {
        const result = await syncTransactionsForItem(plaidItem);
        totalAdded += result.added;
        totalModified += result.modified;
        totalRemoved += result.removed;
      } catch (err) {
        console.error(`Sync failed for ${plaidItem.institutionName}:`, err);
        if (getPlaidErrorCode(err) === 'ITEM_LOGIN_REQUIRED') {
          await prisma.plaidItem.update({
            where: { id: plaidItem.id },
            data: { needsRelink: true, relinkError: 'ITEM_LOGIN_REQUIRED' },
          });
        }
        itemErrors.push({
          institutionName: plaidItem.institutionName,
          error: 'Sync failed',
        });
      }
    }

    return NextResponse.json({
      success: itemErrors.length === 0,
      added: totalAdded,
      modified: totalModified,
      removed: totalRemoved,
      itemErrors,
    });
  } catch (error) {
    console.error('Error syncing transactions:', error);
    return NextResponse.json(
      { error: 'Failed to sync transactions' },
      { status: 500 }
    );
  }
}
