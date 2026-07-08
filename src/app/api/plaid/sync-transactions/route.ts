import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { syncItemsWithIsolation } from '@/lib/plaid-sync';

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

    const { added, modified, removed, itemErrors } = await syncItemsWithIsolation(plaidItems);

    return NextResponse.json({
      success: itemErrors.length === 0,
      added,
      modified,
      removed,
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
